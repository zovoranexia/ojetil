/**
 * OJETIL database seed — idempotent; safe to run repeatedly.
 *
 *   npm run db:seed        (or automatically after `prisma migrate reset`)
 *
 * Creates 4 demo admin accounts (one per RBAC role) and realistic multilingual
 * content (TET / PT / ID / EN): institutional profile, history timeline,
 * leadership, documents (generated PDFs), news (HTML bodies), events with attendees, member applications with
 * AES-256-GCM encrypted PII, and sample audit activity.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { seedAuditLogs } from "./seed/audit";
import { seedDocuments } from "./seed/documents";
import { seedEvents } from "./seed/events";
import { seedLeadership } from "./seed/leadership";
import { seedMembers } from "./seed/members";
import { seedNews } from "./seed/news";
import { seedProfile } from "./seed/profile";
import { seedTimeline } from "./seed/timeline";
import { DEMO_USERS, seedUsers } from "./seed/users";

/**
 * SEED_SCOPE=content — production bootstrap: loads only the institutional
 * profile and history timeline (4 locales) as DRAFT for editorial review.
 * No accounts, no demo members/news/events, and existing rows are never
 * modified. Safe to run against a live database.
 */
async function seedContentOnly(): Promise<void> {
  const db = new PrismaClient();
  console.log("\n🌱 Loading institutional content (profile + timeline) as DRAFT…\n");
  try {
    await seedProfile(db, { contentOnly: true });
    await seedTimeline(db, { contentOnly: true });
    await db.auditLog.create({ data: { action: "SEED_EXECUTED", category: "SYSTEM", metadata: { scope: "content", at: new Date().toISOString() } } });
  } finally {
    await db.$disconnect();
  }
  console.log("\n✅ Done. Review and publish the sections in /admin/profil and /admin/linimasa.\n");
}

async function main(): Promise<void> {
  if (process.env.SEED_SCOPE === "content") return seedContentOnly();

  if (process.env.NODE_ENV === "production" && process.env.ALLOW_PRODUCTION_SEED !== "true") {
    throw new Error(
      "Refusing to seed demo data in production. Use SEED_SCOPE=content to load only profile + timeline content, " +
        "or set ALLOW_PRODUCTION_SEED=true to override (creates demo accounts!).",
    );
  }

  const db = new PrismaClient();
  const started = Date.now();
  console.log("\n🌱 Seeding OJETIL database…\n");

  try {
    const users = await seedUsers(db);
    await seedProfile(db);
    await seedTimeline(db);
    await seedLeadership(db);
    const documentIds = await seedDocuments(db, users.EDITOR.id);
    await seedNews(db, users.EDITOR.id, documentIds);
    await seedEvents(db, users.EDITOR.id);
    await seedMembers(db, users);
    await seedAuditLogs(db, users);
  } finally {
    await db.$disconnect();
  }

  console.log(`\n✅ Done in ${((Date.now() - started) / 1000).toFixed(1)}s.`);
  console.log("\n   Demo admin accounts (password = SEED_DEMO_PASSWORD in .env):");
  for (const u of DEMO_USERS) console.log(`     ${u.role.padEnd(12)} ${u.email}`);
  console.log("");
}

main().catch((error: unknown) => {
  console.error("\n✖ Seed failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
