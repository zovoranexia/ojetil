import type { Metadata } from "next";
import { ImageIcon, Plus, Star } from "lucide-react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import type { ContentStatus } from "@prisma/client";
import { AdminPageHeading, AdminPagination, ContentStatusBadge, DataTable, EmptyRow, Td, Th, filterControlClass } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import type { AppLocale } from "@/config/locales";
import { satisfies } from "@/config/rbac";
import { adminDate, adminDateTime } from "@/lib/admin-format";
import { requirePageAccess } from "@/lib/security/guards";
import { CONTENT_STATUSES } from "@/modules/content/admin-common";
import { listNewsAdmin } from "@/modules/news/admin-queries";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.news.meta");
  return { title: t("list") };
}

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
  const [t, tStatus, locale] = await Promise.all([getTranslations("admin.news"), getTranslations("admin.status.content"), getLocale() as Promise<AppLocale>]);

  return (
    <>
      <AdminPageHeading
        title={t("list.title")}
        description={t("list.description")}
        actions={
          canWrite ? (
            <Button asChild>
              <Link href="/admin/berita/baru">
                <Plus aria-hidden="true" /> {t("list.newArticle")}
              </Link>
            </Button>
          ) : null
        }
      />
      <form method="get" role="search" className="mb-4 grid gap-2 rounded-card border border-border-subtle bg-surface-card p-3 sm:grid-cols-[1fr_auto_auto]">
        <label htmlFor="q" className="sr-only">
          {t("list.search")}
        </label>
        <input id="q" name="q" defaultValue={q} placeholder={t("list.searchPlaceholder")} className={filterControlClass} />
        <label htmlFor="status" className="sr-only">
          {t("list.status")}
        </label>
        <select id="status" name="status" defaultValue={status ?? ""} className={filterControlClass}>
          <option value="">{t("list.allStatuses")}</option>
          {CONTENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {tStatus(s)}
            </option>
          ))}
        </select>
        <Button type="submit" variant="editorial" size="sm">
          {t("list.filter")}
        </Button>
      </form>
      <DataTable caption={t("list.caption")}>
        <thead>
          <tr>
            <Th>{t("list.colTitle")}</Th>
            <Th>{t("list.colCategory")}</Th>
            <Th>{t("list.colLanguages")}</Th>
            <Th>{t("list.colPublished")}</Th>
            <Th>{t("list.colUpdated")}</Th>
            <Th>{t("list.colStatus")}</Th>
          </tr>
        </thead>
        <tbody>
          {result.items.length ? (
            result.items.map((a) => (
              <tr key={a.id} className="hover:bg-paper">
                <Td>
                  <div className="flex items-start gap-3">
                    {/* Cover thumbnail (decorative: the title next to it is the link). */}
                    <Link href={`/admin/berita/${a.id}`} tabIndex={-1} aria-hidden="true" className="block h-12 w-20 shrink-0 overflow-hidden rounded-control border border-border-subtle bg-surface-muted">
                      {a.coverImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- small admin thumbnail of an uploaded/https image
                        <img src={a.coverImageUrl} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
                      ) : (
                        <span className="flex size-full items-center justify-center text-ink-secondary/60">
                          <ImageIcon className="size-5" />
                        </span>
                      )}
                    </Link>
                    <div className="min-w-0">
                      <Link href={`/admin/berita/${a.id}`} className="font-medium text-ink hover:text-ojetil-red hover:underline">
                        {a.title}
                      </Link>
                      {a.isFeatured ? <Star aria-label={t("list.featured")} className="ml-1.5 inline size-3.5 fill-gold-text text-gold-text" /> : null}
                      <span className="block font-mono text-xs text-ink-secondary">{a.slug}</span>
                    </div>
                  </div>
                </Td>
                <Td>{t(`categories.${a.category}`)}</Td>
                <Td className="font-mono text-xs">{a.locales.join(" · ")}</Td>
                <Td className="tabular-nums">{adminDate(a.publishedAt, locale)}</Td>
                <Td className="tabular-nums text-ink-secondary">
                  {adminDateTime(a.updatedAt, locale)}
                  {a.author ? <span className="block text-xs">{a.author.name}</span> : null}
                </Td>
                <Td>
                  <ContentStatusBadge status={a.status} />
                </Td>
              </tr>
            ))
          ) : (
            <EmptyRow colSpan={6}>{t("list.empty")}</EmptyRow>
          )}
        </tbody>
      </DataTable>
      <AdminPagination basePath="/admin/berita" page={result.page} pageCount={result.pageCount} total={result.total} params={{ q, status }} />
    </>
  );
}
