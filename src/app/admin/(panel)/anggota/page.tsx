import type { Metadata } from "next";
import { AlertTriangle, Download, Search, UserPlus } from "lucide-react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import {
  AdminPageHeading,
  AdminPagination,
  CategoryBadge,
  DataTable,
  EmptyRow,
  MemberStatusBadge,
  Panel,
  Td,
  Th,
  filterControlClass,
} from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import type { AppLocale } from "@/config/locales";
import { MUNICIPALITIES, municipalityLabel } from "@/config/municipalities";
import { satisfies } from "@/config/rbac";
import { adminDate } from "@/lib/admin-format";
import { requirePageAccess } from "@/lib/security/guards";
import { getMunicipalityDistribution } from "@/modules/dashboard/queries";
import { MEMBER_STATUSES, listMembers, memberAggregates, parseMemberFilters } from "@/modules/members/admin-queries";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.members");
  return { title: t("metaTitle") };
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Viewer (Board): aggregates only — no names, no records, no PII. */
async function AggregatesView() {
  const [agg, distribution, t] = await Promise.all([memberAggregates(), getMunicipalityDistribution(), getTranslations("admin.members")]);
  return (
    <>
      <AdminPageHeading title={t("metaTitle")} description={t("aggregates.description")} />
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {MEMBER_STATUSES.map((s) => (
          <li key={s} className="rounded-card border border-border-subtle bg-surface-card p-5">
            <MemberStatusBadge status={s} />
            <p className="mt-3 font-serif text-4xl font-bold tabular-nums">{agg.byStatus[s]}</p>
          </li>
        ))}
      </ul>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title={t("aggregates.byTrack")}>
          <DataTable caption={t("aggregates.byTrackCaption")}>
            <thead>
              <tr>
                <Th>{t("columns.track")}</Th>
                <Th className="text-right">{t("aggregates.applications")}</Th>
                <Th className="text-right">{t("aggregates.verified")}</Th>
              </tr>
            </thead>
            <tbody>
              {agg.byCategory.map((c) => (
                <tr key={c.category}>
                  <Td>
                    <CategoryBadge category={c.category} />
                  </Td>
                  <Td className="text-right tabular-nums">{c.total}</Td>
                  <Td className="text-right tabular-nums">{c.verified}</Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </Panel>
        <Panel title={t("aggregates.byMunicipality")}>
          <DataTable caption={t("aggregates.byMunicipalityCaption")}>
            <thead>
              <tr>
                <Th>{t("columns.municipality")}</Th>
                <Th className="text-right">{t("aggregates.verified")}</Th>
                <Th className="text-right">{t("aggregates.inProgress")}</Th>
              </tr>
            </thead>
            <tbody>
              {distribution.map((d) => (
                <tr key={d.municipality}>
                  <Td>{d.label}</Td>
                  <Td className="text-right tabular-nums">{d.verified}</Td>
                  <Td className="text-right tabular-nums">{d.inProgress}</Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </Panel>
      </div>
    </>
  );
}

export default async function MembersPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePageAccess("members:aggregate", "/admin/anggota");
  if (!satisfies(user.role, "members:read")) return <AggregatesView />;

  const filters = parseMemberFilters(await searchParams);
  const result = await listMembers(filters);
  const canExport = satisfies(user.role, "members:export");
  const canRegister = satisfies(user.role, "members:register");
  const [t, tStatus, locale] = await Promise.all([getTranslations("admin.members"), getTranslations("admin.status"), getLocale()]);
  const params = { q: filters.q, status: filters.status, category: filters.category, municipality: filters.municipality };

  return (
    <>
      <AdminPageHeading
        title={t("queue.title")}
        description={t("queue.description")}
        actions={
          <>
            {canRegister ? (
              <Button asChild>
                <Link href="/admin/anggota/baru">
                  <UserPlus aria-hidden="true" /> {t("office.button")}
                </Link>
              </Button>
            ) : null}
            {canExport ? (
              <Button asChild variant="outline">
                <a href="/api/admin/exports/members" download>
                  <Download aria-hidden="true" /> {t("queue.export")}
                </a>
              </Button>
            ) : null}
          </>
        }
      />

      <form method="get" role="search" className="mb-4 grid gap-2 rounded-card border border-border-subtle bg-surface-card p-3 md:grid-cols-[1fr_auto_auto_auto_auto]">
        <label className="sr-only" htmlFor="q">
          {t("queue.search")}
        </label>
        <div className="relative">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-secondary" />
          <input id="q" name="q" defaultValue={filters.q} placeholder={t("queue.searchPlaceholder")} className={`${filterControlClass} w-full pl-9`} />
        </div>
        <label className="sr-only" htmlFor="status">
          {t("columns.status")}
        </label>
        <select id="status" name="status" defaultValue={filters.status ?? ""} className={filterControlClass}>
          <option value="">{t("queue.allStatuses")}</option>
          {MEMBER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {tStatus(`member.${s}`)}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="category">
          {t("columns.track")}
        </label>
        <select id="category" name="category" defaultValue={filters.category ?? ""} className={filterControlClass}>
          <option value="">{t("queue.allTracks")}</option>
          <option value="VETERAN_KLANDESTIN">{tStatus("category.VETERAN_KLANDESTIN")}</option>
          <option value="ANGGOTA_PEMUDA">{tStatus("category.ANGGOTA_PEMUDA")}</option>
        </select>
        <label className="sr-only" htmlFor="municipality">
          {t("columns.municipality")}
        </label>
        <select id="municipality" name="municipality" defaultValue={filters.municipality ?? ""} className={filterControlClass}>
          <option value="">{t("queue.allMunicipalities")}</option>
          {MUNICIPALITIES.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
        <Button type="submit" variant="editorial" size="sm">
          {t("queue.filter")}
        </Button>
      </form>

      <DataTable caption={t("queue.tableCaption")}>
        <thead>
          <tr>
            <Th>{t("columns.trackingCode")}</Th>
            <Th>{t("columns.applicant")}</Th>
            <Th>{t("columns.track")}</Th>
            <Th>{t("columns.municipality")}</Th>
            <Th>{t("columns.submitted")}</Th>
            <Th>{t("columns.status")}</Th>
          </tr>
        </thead>
        <tbody>
          {result.items.length ? (
            result.items.map((m) => (
              <tr key={m.id} className="hover:bg-paper">
                <Td>
                  <Link href={`/admin/anggota/${m.id}`} className="tracking-code font-semibold text-ojetil-red hover:underline">
                    {m.trackingCode}
                  </Link>
                  {m.channel === "OFFICE" ? <span className="mt-0.5 block text-xs text-ink-secondary">{t("channel.office")}</span> : null}
                </Td>
                <Td>
                  <span className="font-medium">{m.fullName}</span>
                  {m.clandestineAlias ? <span className="block text-xs text-ink-secondary">“{m.clandestineAlias}”</span> : null}
                  {m.possibleDuplicate ? (
                    <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-status-pending">
                      <AlertTriangle aria-hidden="true" className="size-3.5" /> {t("queue.possibleDuplicate")}
                    </span>
                  ) : null}
                </Td>
                <Td>
                  <CategoryBadge category={m.category} />
                </Td>
                <Td>{municipalityLabel(m.municipality)}</Td>
                <Td className="tabular-nums">{adminDate(m.createdAt, locale as AppLocale)}</Td>
                <Td>
                  <MemberStatusBadge status={m.status} />
                </Td>
              </tr>
            ))
          ) : (
            <EmptyRow colSpan={6}>{t("queue.empty")}</EmptyRow>
          )}
        </tbody>
      </DataTable>
      <AdminPagination basePath="/admin/anggota" page={result.page} pageCount={result.pageCount} total={result.total} params={params} />
    </>
  );
}
