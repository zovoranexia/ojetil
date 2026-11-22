import type { Metadata } from "next";
import { AlertTriangle, Download, Search } from "lucide-react";
import Link from "next/link";
import {
  AdminPageHeading,
  AdminPagination,
  CategoryBadge,
  DataTable,
  EmptyRow,
  MEMBER_STATUS_LABELS,
  MemberStatusBadge,
  Panel,
  Td,
  Th,
  filterControlClass,
} from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { MUNICIPALITIES, municipalityLabel } from "@/config/municipalities";
import { satisfies } from "@/config/rbac";
import { adminDate } from "@/lib/admin-format";
import { requirePageAccess } from "@/lib/security/guards";
import { getMunicipalityDistribution } from "@/modules/dashboard/queries";
import { MEMBER_STATUSES, listMembers, memberAggregates, parseMemberFilters } from "@/modules/members/admin-queries";

export const metadata: Metadata = { title: "Members & veterans" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Viewer (Board): aggregates only — no names, no records, no PII. */
async function AggregatesView() {
  const [agg, distribution] = await Promise.all([memberAggregates(), getMunicipalityDistribution()]);
  return (
    <>
      <AdminPageHeading title="Members & veterans" description="Aggregated figures. Individual records are restricted to the Secretariat." />
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {MEMBER_STATUSES.map((s) => (
          <li key={s} className="rounded-card border border-border-subtle bg-surface-card p-5">
            <MemberStatusBadge status={s} />
            <p className="mt-3 font-serif text-4xl font-bold tabular-nums">{agg.byStatus[s]}</p>
          </li>
        ))}
      </ul>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="By track">
          <DataTable caption="Applications by track">
            <thead>
              <tr>
                <Th>Track</Th>
                <Th className="text-right">Applications</Th>
                <Th className="text-right">Verified</Th>
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
        <Panel title="By municipality">
          <DataTable caption="Applications by municipality">
            <thead>
              <tr>
                <Th>Municipality</Th>
                <Th className="text-right">Verified</Th>
                <Th className="text-right">In progress</Th>
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
  const params = { q: filters.q, status: filters.status, category: filters.category, municipality: filters.municipality };

  return (
    <>
      <AdminPageHeading
        title="Verification queue"
        description="Member and veteran applications. Personal data stays encrypted until you open a record and reveal it."
        actions={
          canExport ? (
            <Button asChild variant="outline">
              <a href="/api/admin/exports/members" download>
                <Download aria-hidden="true" /> Export verified (CSV)
              </a>
            </Button>
          ) : null
        }
      />

      <form method="get" role="search" className="mb-4 grid gap-2 rounded-card border border-border-subtle bg-surface-card p-3 md:grid-cols-[1fr_auto_auto_auto_auto]">
        <label className="sr-only" htmlFor="q">
          Search
        </label>
        <div className="relative">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-secondary" />
          <input id="q" name="q" defaultValue={filters.q} placeholder="Name, clandestine name, tracking code or BI number" className={`${filterControlClass} w-full pl-9`} />
        </div>
        <label className="sr-only" htmlFor="status">
          Status
        </label>
        <select id="status" name="status" defaultValue={filters.status ?? ""} className={filterControlClass}>
          <option value="">All statuses</option>
          {MEMBER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {MEMBER_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="category">
          Track
        </label>
        <select id="category" name="category" defaultValue={filters.category ?? ""} className={filterControlClass}>
          <option value="">All tracks</option>
          <option value="VETERAN_KLANDESTIN">Veteran</option>
          <option value="ANGGOTA_PEMUDA">Youth</option>
        </select>
        <label className="sr-only" htmlFor="municipality">
          Municipality
        </label>
        <select id="municipality" name="municipality" defaultValue={filters.municipality ?? ""} className={filterControlClass}>
          <option value="">All municipalities</option>
          {MUNICIPALITIES.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
        <Button type="submit" variant="editorial" size="sm">
          Filter
        </Button>
      </form>

      <DataTable caption="Member applications">
        <thead>
          <tr>
            <Th>Tracking code</Th>
            <Th>Applicant</Th>
            <Th>Track</Th>
            <Th>Municipality</Th>
            <Th>Submitted</Th>
            <Th>Status</Th>
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
                </Td>
                <Td>
                  <span className="font-medium">{m.fullName}</span>
                  {m.clandestineAlias ? <span className="block text-xs text-ink-secondary">“{m.clandestineAlias}”</span> : null}
                  {m.possibleDuplicate ? (
                    <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-status-pending">
                      <AlertTriangle aria-hidden="true" className="size-3.5" /> Possible duplicate
                    </span>
                  ) : null}
                </Td>
                <Td>
                  <CategoryBadge category={m.category} />
                </Td>
                <Td>{municipalityLabel(m.municipality)}</Td>
                <Td className="tabular-nums">{adminDate(m.createdAt)}</Td>
                <Td>
                  <MemberStatusBadge status={m.status} />
                </Td>
              </tr>
            ))
          ) : (
            <EmptyRow colSpan={6}>No applications match these filters.</EmptyRow>
          )}
        </tbody>
      </DataTable>
      <AdminPagination basePath="/admin/anggota" page={result.page} pageCount={result.pageCount} total={result.total} params={params} />
    </>
  );
}
