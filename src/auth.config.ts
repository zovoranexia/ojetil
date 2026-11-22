import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe Auth.js configuration shared by the middleware and the full
 * server instance (src/auth.ts). No database, no argon2 — only JWT decoding.
 *
 * Sessions are stateless JWTs (JWE-encrypted with AUTH_SECRET) carried in an
 * HTTP-only, SameSite=Lax cookie that is `Secure` + `__Secure-` prefixed on HTTPS.
 */
export const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60; // one working day

export const authConfig = {
  trustHost: true,
  pages: {
    signIn: "/admin/login",
    error: "/admin/login",
  },
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE_SECONDS,
    updateAge: 30 * 60,
  },
  providers: [],
  callbacks: {
    session({ session, token }) {
      if (token.uid && token.role) {
        session.user = {
          ...session.user,
          id: token.uid,
          role: token.role,
          email: token.email ?? session.user.email,
          name: token.name ?? session.user.name,
          mustChangePassword: token.mcp ?? false,
        };
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
