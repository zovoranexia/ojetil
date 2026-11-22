import type { Metadata } from "next";
import { CalendarCheck, ClipboardList, Ticket, UserCheck } from "lucide-react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { AdminPageHeading, Panel } from "@/components/admin/ui";
import { satisfies } from "@/config/rbac";
import { adminDateTime } from "@/lib/admin-format";
import { requirePageAccess } from "@/lib/security/guards";
import { getDashboardKpis, getMunicipalityDistribution, getRecentActivity } from "@/modules/dashboard/queries";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.dashboard");
  return { title: t("metaTitle") };
}

export default async function AdminDashboardPage() {
  const user = await requirePageAccess("dashboard:view", "/admin");
  const [kpis, distribution, activity, t, tAdmin, locale] = await Promise.all([
    getDashboardKpis(),
    getMunicipalityDistribution(),
    getRecentActivity(user.role),
    getTranslations("admin.dashboard"),
    getTranslations("admin"),
    getLocale(),
  ]);
  const canOpenQueue = satisfies(user.role, "members:read");
  const max = Math.max(1, ...distribution.map((d) => d.total));

  const cards = [
    { key: "verified", label: t("kpis.verified"), value: kpis.verified, icon: UserCheck, accent: "text-status-verified", href: canOpenQueue ? "/admin/anggota?status=VERIFIED" : null },
    {
      key: "pending",
      label: t("kpis.pending"),
      value: kpis.pending,
      icon: ClipboardList,
      accent: "text-status-pending",
      note: kpis.needsRevision ? t("kpis.awaitingRevision", { count: kpis.needsRevision }) : undefined,
      href: canOpenQueue ? "/admin/anggota?status=PENDING_VERIFICATION" : null,
    },
    { key: "activeEvents", label: t("kpis.activeEvents"), value: kpis.activeEvents, icon: CalendarCheck, accent: "text-ojetil-red", href: "/admin/acara" },
    { key: "eventRegistrations", label: t("kpis.eventRegistrations"), value: kpis.eventRegistrations, icon: Ticket, accent: "text-status-info", href: "/admin/acara" },
  ];

  return (
    <>
      <AdminPageHeading title={t("welcome", { name: user.name.split(" ")[0] ?? user.name })} description={t("description")} />

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => {
          const body = (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-ink-secondary">{c.label}</span>
                <c.icon aria-hidden="true" className={`size-5 ${c.accent}`} />
              </div>
              <p className="mt-3 font-serif text-4xl font-bold tabular-nums">{c.value}</p>
              {c.note ? <p className="mt-1 text-xs text-ink-secondary">{c.note}</p> : null}
            </>
          );
          return (
            <li key={c.key}>
              {c.href ? (
                <Link href={c.href} className="block h-full rounded-card border border-border-subtle bg-surface-card p-5 hover:border-border-strong">
                  {body}
                </Link>
              ) : (
                <div className="h-full rounded-card border border-border-subtle bg-surface-card p-5">{body}</div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Panel title={t("municipality.title")} description={t("municipality.description")}>
          <div className="mb-4 flex gap-4 text-xs text-ink-secondary">
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true" className="size-3 rounded-sm bg-ojetil-red" /> {t("municipality.verified")}
            </span>
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true" className="size-3 rounded-sm bg-gold-accent" /> {t("municipality.inProgress")}
            </span>
          </div>
          {/* Visual bars for sighted users; the same numbers are in the table for screen readers. */}
          <ul aria-hidden="true" className="space-y-2">
            {distribution.map((d) => (
              <li key={d.municipality} className="grid grid-cols-[8.5rem_1fr_2rem] items-center gap-3 text-sm">
                <span className="truncate text-ink-secondary">{d.label}</span>
                <span className="flex h-3 overflow-hidden rounded-sm bg-surface-muted">
                  <span className="bg-ojetil-red" style={{ width: `${(d.verified / max) * 100}%` }} />
                  <span className="bg-gold-accent" style={{ width: `${(d.inProgress / max) * 100}%` }} />
                </span>
                <span className="text-right tabular-nums">{d.total}</span>
              </li>
            ))}
          </ul>
          <table className="sr-only">
            <caption>{t("municipality.title")}</caption>
            <thead>
              <tr>
                <th scope="col">{t("municipality.municipality")}</th>
                <th scope="col">{t("municipality.verified")}</th>
                <th scope="col">{t("municipality.inProgress")}</th>
              </tr>
            </thead>
            <tbody>
              {distribution.map((d) => (
                <tr key={d.municipality}>
                  <th scope="row">{d.label}</th>
                  <td>{d.verified}</td>
                  <td>{d.inProgress}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel
          title={t("activity.title")}
          description={activity.source === "audit" ? t("activity.fromAudit") : t("activity.latestContent")}
          actions={
            activity.source === "audit" ? (
              <Link href="/admin/audit-logs" className="text-sm font-semibold text-ojetil-red hover:underline">
                {t("activity.viewAll")}
              </Link>
            ) : null
          }
        >
          {activity.items.length ? (
            <ol className="space-y-4">
              {activity.items.map((a) => (
                <li key={a.id} className="border-l-2 border-border-subtle pl-3 text-sm">
                  {a.kind === "audit" ? (
                    <p>
                      <span className="font-semibold">{a.actorEmail ?? t("activity.systemActor")}</span> · {tAdmin(`audit.actions.${a.action}`)}
                      {a.subject ? (
                        <>
                          {" "}
                          <span className="font-mono text-xs">{a.subject}</span>
                        </>
                      ) : null}
                    </p>
                  ) : (
                    <p>
                      <span className="font-semibold">{a.contentType === "news" ? t("activity.news") : t("activity.event")}</span> ·{" "}
                      {tAdmin(`status.content.${a.status}`)} · <span className="font-mono text-xs">{a.subject}</span>
                    </p>
                  )}
                  <p className="text-xs tabular-nums text-ink-secondary">{adminDateTime(a.at, locale)}</p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-ink-secondary">{t("activity.empty")}</p>
          )}
        </Panel>
      </div>
    </>
  );
}
