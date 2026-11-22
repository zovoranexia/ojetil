import type { Metadata } from "next";
import type { AuditAction, AuditCategory } from "@prisma/client";
import { Lock } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { AdminPageHeading, AdminPagination, DataTable, EmptyRow, Td, Th, filterControlClass } from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { hasPermission } from "@/config/rbac";
import { adminDateTime } from "@/lib/admin-format";
import { fromDiliLocalInput } from "@/lib/dates";
import { requirePageAccess } from "@/lib/security/guards";
import { AUDIT_ACTION_CATEGORY, listAuditLogs } from "@/modules/audit/service";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.audit");
  return { title: t("metaTitle") };
}

const CATEGORIES = ["AUTH", "VERIFICATION", "CONTENT", "EVENTS", "USERS", "SYSTEM"] as const satisfies readonly AuditCategory[];
const CATEGORY_TONE: Record<AuditCategory, "info" | "pending" | "verified" | "heritage" | "rejected" | "neutral"> = {
  AUTH: "info",
  VERIFICATION: "pending",
  CONTENT: "verified",
  EVENTS: "heritage",
  USERS: "rejected",
  SYSTEM: "neutral",
};

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;

export default async function AuditLogPage({ searchParams }: { searchParams: SP }) {
  const user = await requirePageAccess({ anyOf: ["audit:read:all", "audit:read:verification"] }, "/admin/audit-logs");
  const seeAll = hasPermission(user.role, "audit:read:all");
  const [sp, t, tAdmin, locale] = await Promise.all([searchParams, getTranslations("admin.audit"), getTranslations("admin"), getLocale()]);

  const allowedCategories = seeAll ? CATEGORIES : (["VERIFICATION"] as const);
  const categoryRaw = one(sp.category);
  const category = (allowedCategories as readonly string[]).includes(categoryRaw ?? "") ? (categoryRaw as AuditCategory) : undefined;
  const allowedActions = (Object.keys(AUDIT_ACTION_CATEGORY) as AuditAction[]).filter((a) => (allowedCategories as readonly string[]).includes(AUDIT_ACTION_CATEGORY[a]));
  const actionRaw = one(sp.action);
  const action = (allowedActions as string[]).includes(actionRaw ?? "") ? (actionRaw as AuditAction) : undefined;
  const actor = one(sp.actor)?.slice(0, 120);
  const fromRaw = one(sp.from);
  const toRaw = one(sp.to);
  const from = fromRaw ? fromDiliLocalInput(`${fromRaw}T00:00`) ?? undefined : undefined;
  // Whole end day in Díli time: up to (not including) 00:00 of the next day.
  const toStart = toRaw ? fromDiliLocalInput(`${toRaw}T00:00`) : null;
  const to = toStart ? new Date(toStart.getTime() + 24 * 3_600_000) : undefined;

  // Role scoping (Verifier → verification entries only) is enforced inside listAuditLogs.
  const result = await listAuditLogs(user.role, { category, action, actorEmail: actor, from, to, page: Math.max(Number(one(sp.page) ?? 1) || 1, 1), pageSize: 50 });

  return (
    <>
      <AdminPageHeading
        title={t("title")}
        description={t("description")}
      />
      {!seeAll ? (
        <p className="mb-4 flex items-center gap-2 rounded-control bg-status-info-bg px-4 py-3 text-sm text-status-info">
          <Lock aria-hidden="true" className="size-4" /> {t("roleRestricted", { role: tAdmin(`roles.${user.role}.label`) })}
        </p>
      ) : null}

      <form method="get" className="mb-4 grid gap-2 rounded-card border border-border-subtle bg-surface-card p-3 md:grid-cols-[repeat(5,minmax(0,1fr))_auto]">
        <label className="sr-only" htmlFor="category">
          {t("filters.category")}
        </label>
        <select id="category" name="category" defaultValue={category ?? ""} className={filterControlClass}>
          <option value="">{t("filters.allCategories")}</option>
          {allowedCategories.map((c) => (
            <option key={c} value={c}>
              {t(`categories.${c}`)}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="action">
          {t("filters.action")}
        </label>
        <select id="action" name="action" defaultValue={action ?? ""} className={filterControlClass}>
          <option value="">{t("filters.allActions")}</option>
          {allowedActions.map((a) => (
            <option key={a} value={a}>
              {t(`actions.${a}`)}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="actor">
          {t("filters.actorEmail")}
        </label>
        <input id="actor" name="actor" defaultValue={actor} placeholder={t("filters.actorEmail")} className={filterControlClass} />
        <label className="sr-only" htmlFor="from">
          {t("filters.fromDate")}
        </label>
        <input id="from" name="from" type="date" defaultValue={fromRaw} className={filterControlClass} />
        <label className="sr-only" htmlFor="to">
          {t("filters.toDate")}
        </label>
        <input id="to" name="to" type="date" defaultValue={toRaw} className={filterControlClass} />
        <Button type="submit" variant="editorial" size="sm">
          {t("filters.submit")}
        </Button>
      </form>

      <DataTable caption={t("table.caption")}>
        <thead>
          <tr>
            <Th>{t("table.when")}</Th>
            <Th>{t("table.actor")}</Th>
            <Th>{t("table.action")}</Th>
            <Th>{t("table.target")}</Th>
            <Th>{t("table.ip")}</Th>
          </tr>
        </thead>
        <tbody>
          {result.items.length ? (
            result.items.map((e) => (
              <tr key={e.id} className="align-top hover:bg-paper">
                <Td className="whitespace-nowrap tabular-nums text-ink-secondary">{adminDateTime(e.createdAt, locale)}</Td>
                <Td>
                  <span className="font-medium">{e.actorEmail ?? t("table.systemActor")}</span>
                  {e.actorRole ? <span className="block text-xs text-ink-secondary">{tAdmin(`roles.${e.actorRole}.label`)}</span> : null}
                </Td>
                <Td>
                  <Badge tone={CATEGORY_TONE[e.category]}>{t(`categories.${e.category}`)}</Badge>
                  <span className="mt-1 block text-sm">{t(`actions.${e.action}`)}</span>
                  <span className="block font-mono text-[0.6875rem] text-ink-secondary">{e.action}</span>
                </Td>
                <Td>
                  {e.targetType ? (
                    <span className="block font-mono text-xs">
                      {e.targetType}
                      {e.targetId ? ` · ${e.targetId}` : ""}
                    </span>
                  ) : null}
                  {e.metadata ? (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-xs font-semibold text-ojetil-red">{t("table.details")}</summary>
                      <pre className="mt-1 max-w-md overflow-x-auto whitespace-pre-wrap break-all rounded-control bg-paper p-2 text-[0.6875rem]">{JSON.stringify(e.metadata, null, 2)}</pre>
                    </details>
                  ) : null}
                </Td>
                <Td className="font-mono text-xs text-ink-secondary">{e.ipAddress ?? "—"}</Td>
              </tr>
            ))
          ) : (
            <EmptyRow colSpan={5}>{t("table.empty")}</EmptyRow>
          )}
        </tbody>
      </DataTable>
      <AdminPagination basePath="/admin/audit-logs" page={result.page} pageCount={result.pageCount} total={result.total} params={{ category, action, actor, from: fromRaw, to: toRaw }} />
    </>
  );
}
