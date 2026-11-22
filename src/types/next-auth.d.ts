import type { Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: Role;
    sessionVersion: number;
    mustChangePassword: boolean;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: Role;
      /** True while the account still uses an admin-issued temporary password. */
      mustChangePassword: boolean;
    } & Omit<DefaultSession["user"], "id" | "email" | "name">;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    uid?: string;
    role?: Role;
    /** sessionVersion at sign-in; compared against the DB on every server-side check. */
    sv?: number;
    /** mustChangePassword, refreshed from the DB on every server-side check. */
    mcp?: boolean;
  }
}
