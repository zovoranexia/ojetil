import type { AuditAction, AuditCategory, Prisma, PrismaClient, User } from "@prisma/client";
import { diliDaysFromNow } from "../../src/lib/dates";
import { log } from "./helpers";
import type { SeededUsers } from "./users";

/*
 * audit_logs is append-only (DB trigger), so the seed never rewrites history.
 * Sample activity is inserted only into an empty table; every run appends one
 * SEED_EXECUTED system entry.
 */
function entry(
  actor: User | null,
  action: AuditAction,
  category: AuditCategory,
  daysAgo: number,
  target?: { type: string; id: string },
  metadata?: Prisma.InputJsonObject,
  /** Exact timestamp when the entry mirrors a real seeded record (overrides daysAgo). */
  at?: Date,
): Prisma.AuditLogCreateManyInput {
  return {
    actorId: actor?.id ?? null,
    actorEmail: actor?.email ?? null,
    actorRole: actor?.role ?? null,
    action,
    category,
    targetType: target?.type ?? null,
    targetId: target?.id ?? null,
    metadata,
    ipAddress: actor ? "127.0.0.1" : null,
    userAgent: actor ? "seed" : null,
    createdAt: at ?? diliDaysFromNow(-daysAgo, 9 + (daysAgo % 8), (daysAgo * 7) % 60),
  };
}

export async function seedAuditLogs(db: PrismaClient, users: SeededUsers): Promise<void> {
  const existing = await db.auditLog.count();

  if (existing === 0) {
    const { SUPER_ADMIN: admin, VERIFIER: verifier, EDITOR: editor, VIEWER: viewer } = users;
    const verified = await db.memberRegistration.findMany({
      where: { verifiedById: { not: null } },
      select: {
        id: true,
        trackingCode: true,
        status: true,
        verifiedById: true,
        // The verifier decision recorded in the history — audit entries must match it.
        statusChanges: { where: { actorId: { not: null } }, orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
      },
      orderBy: { trackingCode: "asc" },
    });
    const articles = await db.newsArticle.findMany({ where: { status: "PUBLISHED" }, select: { id: true, slug: true } });
    const event = await db.event.findFirst({ where: { slug: "debate-publiku-joven-no-servisu" }, select: { id: true } });

    const rows: Prisma.AuditLogCreateManyInput[] = [
      entry(admin, "USER_CREATED", "USERS", 0, { type: "User", id: verifier.id }, { role: "VERIFIER" }, verifier.createdAt),
      entry(admin, "USER_CREATED", "USERS", 0, { type: "User", id: editor.id }, { role: "EDITOR" }, editor.createdAt),
      entry(admin, "USER_CREATED", "USERS", 0, { type: "User", id: viewer.id }, { role: "VIEWER" }, viewer.createdAt),
      entry(verifier, "LOGIN_SUCCEEDED", "AUTH", 30),
      entry(null, "LOGIN_FAILED", "AUTH", 14, undefined, { email: "unknown@example.com", reason: "INVALID_CREDENTIALS" }),
      entry(editor, "LOGIN_SUCCEEDED", "AUTH", 3),
      ...articles.map((a, i) => entry(editor, "CONTENT_PUBLISHED", "CONTENT", 5 + i * 9, { type: "NewsArticle", id: a.id }, { slug: a.slug })),
      ...(event ? [entry(editor, "EVENT_ATTENDEES_EXPORTED", "EVENTS", 2, { type: "Event", id: event.id }, { format: "csv" })] : []),
    ];

    for (const m of verified) {
      const actor = m.verifiedById === admin.id ? admin : verifier;
      const decidedAt = m.statusChanges[0]?.createdAt;
      const viewedAt = decidedAt ? new Date(decidedAt.getTime() - 20 * 60_000) : undefined;
      rows.push(entry(actor, "MEMBER_PII_VIEWED", "VERIFICATION", 12, { type: "MemberRegistration", id: m.id }, { trackingCode: m.trackingCode, fields: ["address", "phone", "nationalId"] }, viewedAt));
      rows.push(entry(actor, "MEMBER_STATUS_CHANGED", "VERIFICATION", 11, { type: "MemberRegistration", id: m.id }, { trackingCode: m.trackingCode, from: "PENDING_VERIFICATION", to: m.status }, decidedAt));
    }
    rows.push(entry(admin, "MEMBER_EXPORTED", "VERIFICATION", 1, undefined, { filter: { status: "VERIFIED" }, rowCount: verified.filter((m) => m.status === "VERIFIED").length }));

    await db.auditLog.createMany({ data: rows });
    log("Audit logs", `${rows.length} sample entries`);
  } else {
    log("Audit logs", `${existing} existing entries kept (append-only)`);
  }

  await db.auditLog.create({
    data: { action: "SEED_EXECUTED", category: "SYSTEM", metadata: { at: new Date().toISOString() } },
  });
}
