import type { PrismaClient, Role, User } from "@prisma/client";
import { hashPassword, PASSWORD_MIN_LENGTH } from "../../src/lib/security/password";
import { log } from "./helpers";

/**
 * One demo account per RBAC role. Emails use the reserved `.test` TLD so they
 * can never collide with real mailboxes. The shared password comes from
 * SEED_DEMO_PASSWORD (generated into .env by `npm run setup:env`).
 */
export const DEMO_USERS: ReadonlyArray<{ email: string; name: string; role: Role }> = [
  { email: "superadmin@ojetil.test", name: "Administradór Sistema", role: "SUPER_ADMIN" },
  { email: "verifier@ojetil.test", name: "Sekretariadu Verifikasaun", role: "VERIFIER" },
  { email: "editor@ojetil.test", name: "Ekipa Editoriál", role: "EDITOR" },
  { email: "viewer@ojetil.test", name: "Membru Konsellu", role: "VIEWER" },
];

export type SeededUsers = Record<Role, User>;

/** Re-seeding sets a fresh password hash: end existing sessions and clear any lockout, like an admin reset. */
const PASSWORD_RESET = {
  sessionVersion: { increment: 1 },
  passwordChangedAt: new Date(),
  failedLoginCount: 0,
  lockedUntil: null,
  mustChangePassword: false,
} as const;

export async function seedUsers(db: PrismaClient): Promise<SeededUsers> {
  const password = process.env.SEED_DEMO_PASSWORD;
  if (!password || password.length < PASSWORD_MIN_LENGTH || password.startsWith("__GENERATE")) {
    throw new Error(
      `SEED_DEMO_PASSWORD must be set to at least ${PASSWORD_MIN_LENGTH} characters. Run \`npm run setup:env\`.`,
    );
  }
  const passwordHash = await hashPassword(password);

  const superAdmin = await db.user.upsert({
    where: { email: DEMO_USERS[0]!.email },
    update: { name: DEMO_USERS[0]!.name, role: "SUPER_ADMIN", isActive: true, passwordHash, ...PASSWORD_RESET },
    create: { ...DEMO_USERS[0]!, passwordHash },
  });

  const result = { SUPER_ADMIN: superAdmin } as SeededUsers;
  for (const u of DEMO_USERS.slice(1)) {
    result[u.role] = await db.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, isActive: true, passwordHash, ...PASSWORD_RESET },
      create: { ...u, passwordHash, createdById: superAdmin.id },
    });
  }

  log("Admin users", `${DEMO_USERS.length} accounts (${DEMO_USERS.map((u) => u.role).join(", ")})`);
  return result;
}
