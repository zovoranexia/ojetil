import "server-only";
import type { AuditAction, ContentStatus, EventStatus, Municipality, Role } from "@prisma/client";
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

/** Human-readable subject from audit metadata (never PII: tracking codes, slugs, roles). */
export function auditSubject(metadata: unknown, targetType: string | null): string {
  const m = (metadata ?? {}) as Record<string, unknown>;
  const s = (k: string) => (typeof m[k] === "string" ? (m[k] as string) : null);
  return s("trackingCode") ?? s("slug") ?? s("email") ?? s("title") ?? targetType ?? "";
}

/**
 * Structured activity entries; the page renders the labels in the UI language
 * (`admin.audit.actions.<AuditAction>`, `admin.status.content.<status>`).
 */
export type ActivityItem =
  | { kind: "audit"; id: string; at: Date; actorEmail: string | null; action: AuditAction; subject: string }
  | { kind: "content"; id: string; at: Date; contentType: "news" | "event"; status: ContentStatus | EventStatus; subject: string };

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
        kind: "audit" as const,
        id: a.id,
        at: a.createdAt,
        actorEmail: a.actorEmail,
        action: a.action,
        subject: auditSubject(a.metadata, a.targetType),
      })),
    };
  }
  const [news, events] = await Promise.all([
    db.newsArticle.findMany({ orderBy: { updatedAt: "desc" }, take, select: { id: true, slug: true, status: true, updatedAt: true } }),
    db.event.findMany({ orderBy: { updatedAt: "desc" }, take, select: { id: true, slug: true, status: true, updatedAt: true } }),
  ]);
  const items: ActivityItem[] = [
    ...news.map((n) => ({ kind: "content" as const, id: `n-${n.id}`, at: n.updatedAt, contentType: "news" as const, status: n.status, subject: n.slug })),
    ...events.map((e) => ({ kind: "content" as const, id: `e-${e.id}`, at: e.updatedAt, contentType: "event" as const, status: e.status, subject: e.slug })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, take);
  return { source: "content", items };
}
