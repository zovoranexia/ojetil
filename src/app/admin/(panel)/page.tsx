import type { Metadata } from "next";
import { CalendarCheck, ClipboardList, Ticket, UserCheck } from "lucide-react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { AdminPageHeading, Panel } from "@/components/admin/ui";
import { satisfies } from "@/config/rbac";
import { adminDate, adminDateTime } from "@/lib/admin-format";
import { requirePageAccess } from "@/lib/security/guards";
import { getDashboardKpis, getEventAttendance, getMunicipalityDistribution, getRecentActivity } from "@/modules/dashboard/queries";
import { mostReadArticles } from "@/modules/news/views";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.dashboard");
  return { title: t("metaTitle") };
}

export default async function AdminDashboardPage() {
  const user = await requirePageAccess("dashboard:view", "/admin");
  const [kpis, distribution, activity, reads, attendance, t, tAdmin, locale] = await Promise.all([
    getDashboardKpis(),
    getMunicipalityDistribution(),
    getRecentActivity(user.role),
    mostReadArticles(30, 5),
    getEventAttendance(5),
    getTranslations("admin.dashboard"),
    getTranslations("admin"),
    getLocale(),
  ]);
  const canOpenQueue = satisfies(user.role, "members:read");
  const max = Math.max(1, ...distribution.map((d) => d.total));
  const maxReads = Math.max(1, ...reads.items.map((r) => r.views));
  const canEditNews = satisfies(user.role, "content:read");
  const pct = (n: number) => `${Math.round(n * 100)}%`;

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

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title={t("reads.title")} description={t("reads.description", { total: reads.total })}>
          {reads.items.length ? (
            <ol className="space-y-3">
              {reads.items.map((r, i) => (
                <li key={r.id} className="text-sm">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate">
                      <span className="mr-2 font-serif font-bold tabular-nums text-ojetil-red">{i + 1}</span>
                      {canEditNews ? (
                        <Link href={`/admin/berita?q=${encodeURIComponent(r.slug)}`} className="hover:text-ojetil-red hover:underline">
                          {r.title}
                        </Link>
                      ) : (
                        r.title
                      )}
                    </span>
                    <span className="shrink-0 tabular-nums text-ink-secondary">{t("reads.count", { count: r.views })}</span>
                  </div>
                  <span aria-hidden="true" className="mt-1 block h-1.5 overflow-hidden rounded-sm bg-surface-muted">
                    <span className="block h-full bg-ojetil-red" style={{ width: `${(r.views / maxReads) * 100}%` }} />
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-ink-secondary">{t("reads.empty")}</p>
          )}
          <p className="mt-4 text-xs text-ink-secondary">{t("reads.privacy")}</p>
        </Panel>

        <Panel
          title={t("attendance.title")}
          description={attendance.rate === null ? t("attendance.none") : t("attendance.description", { rate: pct(attendance.rate), attended: attendance.attended, registered: attendance.registered })}
        >
          {attendance.items.length ? (
            <ul className="space-y-3">
              {attendance.items.map((e) => (
                <li key={e.id} className="text-sm">
                  <div className="flex items-baseline justify-between gap-3">
                    <Link href={`/admin/acara/${e.id}/peserta`} className="min-w-0 truncate hover:text-ojetil-red hover:underline">
                      {e.title}
                    </Link>
                    <span className="shrink-0 tabular-nums text-ink-secondary">
                      {e.attended}/{e.registered} · {pct(e.attended / e.registered)}
                    </span>
                  </div>
                  <span aria-hidden="true" className="mt-1 block h-1.5 overflow-hidden rounded-sm bg-surface-muted">
                    <span className="block h-full bg-status-verified" style={{ width: `${(e.attended / e.registered) * 100}%` }} />
                  </span>
                  <span className="text-xs tabular-nums text-ink-secondary">{adminDate(e.endAt, locale as never)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-secondary">{t("attendance.empty")}</p>
          )}
        </Panel>
      </div>
    </>
  );
}
