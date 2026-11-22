/**
 * Creates a SUPER_ADMIN account from the command line — the only way to get the
 * first administrator on a fresh production database (the seed's demo accounts
 * are development-only).
 *
 *   npm run admin:create -- --email admin@ojetil.tl --name "Nome Completo"
 *
 * A temporary password is generated and printed ONCE. The account is flagged
 * mustChangePassword, so the first sign-in forces a personal password.
 * The creation is written to the append-only audit log.
 */
import "dotenv/config";
import { parseArgs } from "node:util";
import { z } from "zod";
import { db } from "../src/lib/db";
import { hashPassword } from "../src/lib/security/password";
import { generateTemporaryPassword } from "../src/lib/security/password-generator";
import { recordAudit } from "../src/modules/audit/service";

const USAGE = 'Usage: npm run admin:create -- --email admin@example.org --name "Full Name"';

async function main(): Promise<void> {
  const args = parseArgs({ options: { email: { type: "string" }, name: { type: "string" } }, strict: true }).values;

  const input = z
    .object({
      email: z.string({ error: "--email is required" }).trim().toLowerCase().pipe(z.email("--email must be a valid email address")),
      name: z.string({ error: "--name is required" }).trim().min(3, "--name must be at least 3 characters").max(120),
    })
    .safeParse(args);

  if (!input.success) {
    console.error(`✖ ${input.error.issues.map((i) => i.message).join("\n✖ ")}\n\n${USAGE}`);
    process.exitCode = 1;
    return;
  }
  const { email, name } = input.data;

  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    console.error(`✖ An account with ${email} already exists. Manage it in the backoffice (Users & roles).`);
    process.exitCode = 1;
    return;
  }

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);
  const user = await db.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: { email, name, role: "SUPER_ADMIN", passwordHash, mustChangePassword: true },
      select: { id: true },
    });
    await recordAudit(
      {
        action: "USER_CREATED",
        actor: null,
        target: { type: "User", id: created.id },
        metadata: { email, role: "SUPER_ADMIN", via: "cli:admin:create" },
        context: { ipAddress: null, userAgent: "cli" },
      },
      tx,
    );
    return created;
  });

  console.log(`\n✔ Super Admin created: ${name} <${email}> (id ${user.id})`);
  console.log(`\n  Temporary password (shown only now): ${temporaryPassword}`);
  console.log("\n  Sign in at /admin/login — you will be asked to choose a personal password immediately.\n");
}

main()
  .catch((error: unknown) => {
    console.error("✖ Failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
