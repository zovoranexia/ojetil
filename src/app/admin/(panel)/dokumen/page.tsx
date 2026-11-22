import type { Metadata } from "next";
import { Plus } from "lucide-react";
import Link from "next/link";
import type { ContentStatus } from "@prisma/client";
import { AdminPageHeading, AdminPagination, ContentStatusBadge, DataTable, EmptyRow, Td, Th, filterControlClass } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { satisfies } from "@/config/rbac";
import { adminDateTime } from "@/lib/admin-format";
import { requirePageAccess } from "@/lib/security/guards";
import { listDocumentsAdmin } from "@/modules/documents/queries";
import { formatFileSize } from "@/modules/documents/schema";

export const metadata: Metadata = { title: "Documents" };

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
const STATUSES = ["DRAFT", "PUBLISHED"] as const satisfies readonly ContentStatus[];

export default async function DocumentsAdminPage({ searchParams }: { searchParams: SP }) {
  const user = await requirePageAccess("content:read", "/admin/dokumen");
  const sp = await searchParams;
  const q = one(sp.q)?.slice(0, 80);
  const statusRaw = one(sp.status);
  const status = (STATUSES as readonly string[]).includes(statusRaw ?? "") ? (statusRaw as ContentStatus) : undefined;
  const result = await listDocumentsAdmin({ q, status, page: Math.max(Number(one(sp.page) ?? 1) || 1, 1) });
  const canWrite = satisfies(user.role, "content:write");

  return (
    <>
      <AdminPageHeading
        title="Documents"
        description="PDF library: statutes, reports, statements. Published documents can be downloaded publicly and attached to news articles."
        actions={
          canWrite ? (
            <Button asChild>
              <Link href="/admin/dokumen/baru">
                <Plus aria-hidden="true" /> Upload document
              </Link>
            </Button>
          ) : null
        }
      />
      <form method="get" role="search" className="mb-4 grid gap-2 rounded-card border border-border-subtle bg-surface-card p-3 sm:grid-cols-[1fr_auto_auto]">
        <label htmlFor="q" className="sr-only">
          Search
        </label>
        <input id="q" name="q" defaultValue={q} placeholder="Search title, slug or file name" className={filterControlClass} />
        <label htmlFor="status" className="sr-only">
          Status
        </label>
        <select id="status" name="status" defaultValue={status ?? ""} className={filterControlClass}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
        <Button type="submit" variant="editorial" size="sm">
          Filter
        </Button>
      </form>
      <DataTable caption="Documents">
        <thead>
          <tr>
            <Th>Title (Tetun)</Th>
            <Th>File</Th>
            <Th>Languages</Th>
            <Th>Used in</Th>
            <Th>Updated</Th>
            <Th>Status</Th>
          </tr>
        </thead>
        <tbody>
          {result.items.length ? (
            result.items.map((d) => (
              <tr key={d.id} className="hover:bg-paper">
                <Td>
                  <Link href={`/admin/dokumen/${d.id}`} className="font-medium text-ink hover:text-ojetil-red hover:underline">
                    {d.title}
                  </Link>
                  <span className="block font-mono text-xs text-ink-secondary">{d.slug}</span>
                </Td>
                <Td className="text-xs">
                  {d.fileName}
                  <span className="block tabular-nums text-ink-secondary">{formatFileSize(d.fileSize)}</span>
                </Td>
                <Td className="font-mono text-xs">{d.locales.join(" · ")}</Td>
                <Td className="tabular-nums">{d._count.newsArticles ? `${d._count.newsArticles} article(s)` : "—"}</Td>
                <Td className="tabular-nums text-ink-secondary">
                  {adminDateTime(d.updatedAt)}
                  {d.createdBy ? <span className="block text-xs">{d.createdBy.name}</span> : null}
                </Td>
                <Td>
                  <ContentStatusBadge status={d.status} />
                </Td>
              </tr>
            ))
          ) : (
            <EmptyRow colSpan={6}>No documents yet.</EmptyRow>
          )}
        </tbody>
      </DataTable>
      <AdminPagination basePath="/admin/dokumen" page={result.page} pageCount={result.pageCount} total={result.total} params={{ q, status }} />
    </>
  );
}
