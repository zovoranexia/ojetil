import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/auth.config";
import { contextFromHeaders } from "@/lib/request-context";
import { recordAudit } from "@/modules/audit/service";
import { loginSchema } from "@/modules/auth/schemas";
import { authenticateStaff, revalidateSession } from "@/modules/auth/service";

/**
 * Full (Node.js runtime) Auth.js instance: credential verification with
 * argon2id + lockout, and per-request session revalidation against the DB so
 * deactivation, role changes and password resets take effect immediately.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const outcome = await authenticateStaff(
          parsed.data.email,
          parsed.data.password,
          contextFromHeaders(request.headers),
        );
        // Returning null yields one generic "invalid credentials" error for every failure reason.
        if (!outcome.ok) return null;

        const { id, email, name, role, sessionVersion, mustChangePassword } = outcome.user;
        return { id, email, name, role, sessionVersion, mustChangePassword };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        // Initial sign-in: copy the verified claims into the token.
        token.uid = user.id;
        token.role = user.role;
        token.sv = user.sessionVersion;
        token.email = user.email;
        token.name = user.name;
        token.mcp = user.mustChangePassword;
        return token;
      }
      if (!token.uid || token.sv === undefined) return null;

      const fresh = await revalidateSession(token.uid, token.sv);
      if (!fresh) return null; // deactivated, deleted, or sessionVersion bumped → signed out
      token.role = fresh.role;
      token.email = fresh.email;
      token.name = fresh.name;
      token.mcp = fresh.mustChangePassword;
      return token;
    },
  },
  events: {
    async signOut(message) {
      const token = "token" in message ? message.token : null;
      if (token?.uid && token.email && token.role) {
        await recordAudit({ action: "LOGOUT", actor: { id: token.uid, email: token.email, role: token.role } });
      }
    },
  },
});
