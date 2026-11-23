import type { Metadata } from "next";
import { Images, Plus } from "lucide-react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import type { ContentStatus } from "@prisma/client";
import { AdminPageHeading, AdminPagination, ContentStatusBadge, DataTable, EmptyRow, Td, Th, filterControlClass } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import type { AppLocale } from "@/config/locales";
import { satisfies } from "@/config/rbac";
import { adminCalendarDate, adminDateTime } from "@/lib/admin-format";
import { requirePageAccess } from "@/lib/security/guards";
import { listAlbumsAdmin } from "@/modules/gallery/queries";
import { videoThumbnail } from "@/modules/media/schema";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.gallery");
  return { title: t("metaTitle") };
}

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
const STATUSES = ["DRAFT", "PUBLISHED"] as const satisfies readonly ContentStatus[];

export default async function GalleryAdminPage({ searchParams }: { searchParams: SP }) {
  const user = await requirePageAccess("content:read", "/admin/galeria");
  const sp = await searchParams;
  const q = one(sp.q)?.slice(0, 80);
  const statusRaw = one(sp.status);
  const status = (STATUSES as readonly string[]).includes(statusRaw ?? "") ? (statusRaw as ContentStatus) : undefined;
  const result = await listAlbumsAdmin({ q, status, page: Math.max(Number(one(sp.page) ?? 1) || 1, 1) });
  const canWrite = satisfies(user.role, "content:write");
  const [t, tStatus, rawLocale] = await Promise.all([getTranslations("admin.gallery"), getTranslations("admin.status.content"), getLocale()]);
  const locale = rawLocale as AppLocale;

  return (
    <>
      <AdminPageHeading
        title={t("title")}
        description={t("description")}
        actions={
          canWrite ? (
            <Button asChild>
              <Link href="/admin/galeria/baru">
                <Plus aria-hidden="true" /> {t("new")}
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
            <Th>{t("table.album")}</Th>
            <Th>{t("table.items")}</Th>
            <Th>{t("table.date")}</Th>
            <Th>{t("table.languages")}</Th>
            <Th>{t("table.updated")}</Th>
            <Th>{t("table.status")}</Th>
          </tr>
        </thead>
        <tbody>
          {result.items.length ? (
            result.items.map((a) => {
              const thumb = a.cover ? (a.cover.kind === "IMAGE" ? a.cover.url : a.cover.kind === "VIDEO_LINK" ? videoThumbnail(a.cover.url) : null) : null;
              return (
                <tr key={a.id} className="hover:bg-paper">
                  <Td>
                    <div className="flex items-center gap-3">
                      <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-control bg-surface-muted text-ink-secondary">
                        {thumb ? (
                          // eslint-disable-next-line @next/next/no-img-element -- small admin thumbnail
                          <img src={thumb} alt="" loading="lazy" className="size-full object-cover" />
                        ) : (
                          <Images aria-hidden="true" className="size-5" />
                        )}
                      </span>
                      <span className="min-w-0">
                        <Link href={`/admin/galeria/${a.id}`} className="font-medium text-ink hover:text-ojetil-red hover:underline">
                          {a.title}
                        </Link>
                        <span className="block font-mono text-xs text-ink-secondary">{a.slug}</span>
                      </span>
                    </div>
                  </Td>
                  <Td className="tabular-nums">{a.count}</Td>
                  <Td className="tabular-nums text-ink-secondary">{a.takenOn ? adminCalendarDate(a.takenOn, locale) : "—"}</Td>
                  <Td className="font-mono text-xs">{a.locales.join(" · ")}</Td>
                  <Td className="tabular-nums text-ink-secondary">{adminDateTime(a.updatedAt, locale)}</Td>
                  <Td>
                    <ContentStatusBadge status={a.status} />
                  </Td>
                </tr>
              );
            })
          ) : (
            <EmptyRow colSpan={6}>{t("empty")}</EmptyRow>
          )}
        </tbody>
      </DataTable>
      <AdminPagination basePath="/admin/galeria" page={result.page} pageCount={result.pageCount} total={result.total} params={{ q, status }} />
    </>
  );
}
