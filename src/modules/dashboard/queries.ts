import "server-only";
import type { AuditAction, Municipality, Role } from "@prisma/client";
import { hasPermission } from "@/config/rbac";
import { MUNICIPALITIES } from "@/config/municipalities";
import { db } from "@/lib/db";
import { listAuditLogs } from "@/modules/audit/service";

/** Aggregates only — safe for every backoffice role, including Viewer and Editor. */
export async function getDashboardKpis() {
  const now = new Date();
  const [verified, pending, needsRevision, activeEvents, eventRegistrations] = await Promise.all([
    db.memberRegistration.count({ where: { status: "VERIFIED" } }),
    db.memberRegistration.count({ where: { status: "PENDING_VERIFICATION" } }),
    db.memberRegistration.count({ where: { status: "NEEDS_REVISION" } }),
    db.event.count({ where: { status: "PUBLISHED", endAt: { gt: now } } }),
    db.eventRegistration.count({ where: { status: { not: "CANCELLED" } } }),
  ]);
  return { verified, pending, needsRevision, activeEvents, eventRegistrations };
}

export interface MunicipalityRow {
  municipality: Municipality;
  label: string;
  verified: number;
  inProgress: number;
  total: number;
}

/** Verified vs in-progress applications per municipality (rejected excluded), all 15 territories listed. */
export async function getMunicipalityDistribution(): Promise<MunicipalityRow[]> {
  const groups = await db.memberRegistration.groupBy({
    by: ["municipality", "status"],
    where: { status: { not: "REJECTED" } },
    _count: { _all: true },
  });
  return MUNICIPALITIES.map((m) => {
    const rows = groups.filter((g) => g.municipality === m.value);
    const verified = rows.filter((r) => r.status === "VERIFIED").reduce((s, r) => s + r._count._all, 0);
    const inProgress = rows.filter((r) => r.status !== "VERIFIED").reduce((s, r) => s + r._count._all, 0);
    return { municipality: m.value, label: m.label, verified, inProgress, total: verified + inProgress };
  });
}

export async function getCategoryBreakdown() {
  const groups = await db.memberRegistration.groupBy({ by: ["category", "status"], _count: { _all: true } });
  return groups.map((g) => ({ category: g.category, status: g.status, count: g._count._all }));
}

const ACTION_LABELS: Record<AuditAction, string> = {
  LOGIN_SUCCEEDED: "signed in",
  LOGIN_FAILED: "failed sign-in",
  LOGOUT: "signed out",
  ACCOUNT_LOCKED: "account locked",
  MEMBER_PII_VIEWED: "viewed personal data of",
  MEMBER_STATUS_CHANGED: "changed status of",
  MEMBER_EXPORTED: "exported verified members",
  CONTENT_CREATED: "created",
  CONTENT_UPDATED: "updated",
  CONTENT_PUBLISHED: "published",
  CONTENT_UNPUBLISHED: "unpublished",
  CONTENT_DELETED: "deleted",
  MEDIA_UPLOADED: "uploaded image",
  EVENT_CREATED: "created event",
  EVENT_UPDATED: "updated event",
  EVENT_PUBLISHED: "published event",
  EVENT_UNPUBLISHED: "unpublished event",
  EVENT_CANCELLED: "cancelled event",
  EVENT_DELETED: "deleted event",
  EVENT_ATTENDEES_EXPORTED: "exported attendees of",
  EVENT_ATTENDANCE_UPDATED: "updated attendance for",
  USER_CREATED: "created user",
  USER_ROLE_CHANGED: "changed role of",
  USER_DEACTIVATED: "deactivated user",
  USER_REACTIVATED: "reactivated user",
  USER_PASSWORD_RESET: "reset password of",
  USER_PASSWORD_CHANGED: "changed own password",
  SEED_EXECUTED: "database seeded",
};

export function describeAuditAction(action: AuditAction): string {
  return ACTION_LABELS[action];
}

/** Human-readable subject from audit metadata (never PII: tracking codes, slugs, roles). */
export function auditSubject(metadata: unknown, targetType: string | null): string {
  const m = (metadata ?? {}) as Record<string, unknown>;
  const s = (k: string) => (typeof m[k] === "string" ? (m[k] as string) : null);
  return s("trackingCode") ?? s("slug") ?? s("email") ?? s("title") ?? targetType ?? "";
}

export type ActivityItem = { id: string; at: Date; actor: string; text: string; subject: string };

/**
 * Recent activity, scoped by role: audit readers see the (filtered) audit trail;
 * Editors, who have no audit access, see the latest content edits instead.
 */
export async function getRecentActivity(role: Role, take = 8): Promise<{ source: "audit" | "content"; items: ActivityItem[] }> {
  if (hasPermission(role, "audit:read:all") || hasPermission(role, "audit:read:verification")) {
    const { items } = await listAuditLogs(role, { pageSize: take });
    return {
      source: "audit",
      items: items.map((a) => ({
        id: a.id,
        at: a.createdAt,
        actor: a.actorEmail ?? "System / public",
        text: describeAuditAction(a.action),
        subject: auditSubject(a.metadata, a.targetType),
      })),
    };
  }
  const [news, events] = await Promise.all([
    db.newsArticle.findMany({ orderBy: { updatedAt: "desc" }, take, select: { id: true, slug: true, status: true, updatedAt: true } }),
    db.event.findMany({ orderBy: { updatedAt: "desc" }, take, select: { id: true, slug: true, status: true, updatedAt: true } }),
  ]);
  const items = [
    ...news.map((n) => ({ id: `n-${n.id}`, at: n.updatedAt, actor: "News", text: `${n.status.toLowerCase()} ·`, subject: n.slug })),
    ...events.map((e) => ({ id: `e-${e.id}`, at: e.updatedAt, actor: "Event", text: `${e.status.toLowerCase()} ·`, subject: e.slug })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, take);
  return { source: "content", items };
}
