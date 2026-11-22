import type { Metadata } from "next";
import { Plus } from "lucide-react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import type { ContentStatus } from "@prisma/client";
import { AdminPageHeading, AdminPagination, ContentStatusBadge, DataTable, EmptyRow, Td, Th, filterControlClass } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { satisfies } from "@/config/rbac";
import { adminDateTime } from "@/lib/admin-format";
import { requirePageAccess } from "@/lib/security/guards";
import { listDocumentsAdmin } from "@/modules/documents/queries";
import { formatFileSize } from "@/modules/documents/schema";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.documents");
  return { title: t("metaTitle") };
}

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
  const [t, tStatus, locale] = await Promise.all([getTranslations("admin.documents"), getTranslations("admin.status.content"), getLocale()]);

  return (
    <>
      <AdminPageHeading
        title={t("title")}
        description={t("description")}
        actions={
          canWrite ? (
            <Button asChild>
              <Link href="/admin/dokumen/baru">
                <Plus aria-hidden="true" /> {t("upload")}
              </Link>
            </Button>
          ) : null
        }
      />
      <form method="get" role="search" className="mb-4 grid gap-2 rounded-card border border-border-subtle bg-surface-card p-3 sm:grid-cols-[1fr_auto_auto]">
        <label htmlFor="q" className="sr-only">
          {t("search")}
        </label>
        <input id="q" name="q" defaultValue={q} placeholder={t("searchPlaceholder")} className={filterControlClass} />
        <label htmlFor="status" className="sr-only">
          {t("statusLabel")}
        </label>
        <select id="status" name="status" defaultValue={status ?? ""} className={filterControlClass}>
          <option value="">{t("allStatuses")}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {tStatus(s)}
            </option>
          ))}
        </select>
        <Button type="submit" variant="editorial" size="sm">
          {t("filter")}
        </Button>
      </form>
      <DataTable caption={t("table.caption")}>
        <thead>
          <tr>
            <Th>{t("table.title")}</Th>
            <Th>{t("table.file")}</Th>
            <Th>{t("table.languages")}</Th>
            <Th>{t("table.usedIn")}</Th>
            <Th>{t("table.updated")}</Th>
            <Th>{t("table.status")}</Th>
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
                <Td className="tabular-nums">{d._count.newsArticles ? t("usedInArticles", { count: d._count.newsArticles }) : "—"}</Td>
                <Td className="tabular-nums text-ink-secondary">
                  {adminDateTime(d.updatedAt, locale)}
                  {d.createdBy ? <span className="block text-xs">{d.createdBy.name}</span> : null}
                </Td>
                <Td>
                  <ContentStatusBadge status={d.status} />
                </Td>
              </tr>
            ))
          ) : (
            <EmptyRow colSpan={6}>{t("empty")}</EmptyRow>
          )}
        </tbody>
      </DataTable>
      <AdminPagination basePath="/admin/dokumen" page={result.page} pageCount={result.pageCount} total={result.total} params={{ q, status }} />
    </>
  );
}
