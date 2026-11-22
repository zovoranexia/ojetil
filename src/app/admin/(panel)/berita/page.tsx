import type { Metadata } from "next";
import { Plus, Star } from "lucide-react";
import Link from "next/link";
import type { ContentStatus } from "@prisma/client";
import { AdminPageHeading, AdminPagination, ContentStatusBadge, DataTable, EmptyRow, Td, Th, filterControlClass } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { satisfies } from "@/config/rbac";
import { adminDate, adminDateTime } from "@/lib/admin-format";
import { requirePageAccess } from "@/lib/security/guards";
import { CONTENT_STATUSES } from "@/modules/content/admin-common";
import { NEWS_CATEGORY_LABELS } from "@/modules/news/categories";
import { listNewsAdmin } from "@/modules/news/admin-queries";

export const metadata: Metadata = { title: "News" };

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;

export default async function NewsAdminPage({ searchParams }: { searchParams: SP }) {
  const user = await requirePageAccess("content:read", "/admin/berita");
  const sp = await searchParams;
  const q = one(sp.q)?.slice(0, 80);
  const statusRaw = one(sp.status);
  const status = (CONTENT_STATUSES as readonly string[]).includes(statusRaw ?? "") ? (statusRaw as ContentStatus) : undefined;
  const result = await listNewsAdmin({ q, status, page: Math.max(Number(one(sp.page) ?? 1) || 1, 1) });
  const canWrite = satisfies(user.role, "content:write");

  return (
    <>
      <AdminPageHeading
        title="News & press releases"
        description="Each article is edited in Tetun, Portuguese, Indonesian and English."
        actions={
          canWrite ? (
            <Button asChild>
              <Link href="/admin/berita/baru">
                <Plus aria-hidden="true" /> New article
              </Link>
            </Button>
          ) : null
        }
      />
      <form method="get" role="search" className="mb-4 grid gap-2 rounded-card border border-border-subtle bg-surface-card p-3 sm:grid-cols-[1fr_auto_auto]">
        <label htmlFor="q" className="sr-only">
          Search
        </label>
        <input id="q" name="q" defaultValue={q} placeholder="Search title or slug" className={filterControlClass} />
        <label htmlFor="status" className="sr-only">
          Status
        </label>
        <select id="status" name="status" defaultValue={status ?? ""} className={filterControlClass}>
          <option value="">All statuses</option>
          {CONTENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
        <Button type="submit" variant="editorial" size="sm">
          Filter
        </Button>
      </form>
      <DataTable caption="News articles">
        <thead>
          <tr>
            <Th>Title (Tetun)</Th>
            <Th>Category</Th>
            <Th>Languages</Th>
            <Th>Published</Th>
            <Th>Updated</Th>
            <Th>Status</Th>
          </tr>
        </thead>
        <tbody>
          {result.items.length ? (
            result.items.map((a) => (
              <tr key={a.id} className="hover:bg-paper">
                <Td>
                  <Link href={`/admin/berita/${a.id}`} className="font-medium text-ink hover:text-ojetil-red hover:underline">
                    {a.title}
                  </Link>
                  {a.isFeatured ? <Star aria-label="Featured" className="ml-1.5 inline size-3.5 fill-gold-text text-gold-text" /> : null}
                  <span className="block font-mono text-xs text-ink-secondary">{a.slug}</span>
                </Td>
                <Td>{NEWS_CATEGORY_LABELS[a.category]}</Td>
                <Td className="font-mono text-xs">{a.locales.join(" · ")}</Td>
                <Td className="tabular-nums">{adminDate(a.publishedAt)}</Td>
                <Td className="tabular-nums text-ink-secondary">
                  {adminDateTime(a.updatedAt)}
                  {a.author ? <span className="block text-xs">{a.author.name}</span> : null}
                </Td>
                <Td>
                  <ContentStatusBadge status={a.status} />
                </Td>
              </tr>
            ))
          ) : (
            <EmptyRow colSpan={6}>No articles found.</EmptyRow>
          )}
        </tbody>
      </DataTable>
      <AdminPagination basePath="/admin/berita" page={result.page} pageCount={result.pageCount} total={result.total} params={{ q, status }} />
    </>
  );
}
