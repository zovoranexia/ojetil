import type { Metadata } from "next";
import { Filter } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { MediaKind } from "@prisma/client";
import { MediaLibrary } from "@/components/admin/media/media-library";
import { AdminPageHeading, AdminPagination, filterControlClass } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { satisfies } from "@/config/rbac";
import { getServerEnv } from "@/lib/env";
import { requirePageAccess } from "@/lib/security/guards";
import { listMedia } from "@/modules/media/queries";
import { MEDIA_KINDS } from "@/modules/media/schema";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.media");
  return { title: t("metaTitle") };
}

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;

export default async function MediaLibraryPage({ searchParams }: { searchParams: SP }) {
  const user = await requirePageAccess("content:read", "/admin/media");
  const sp = await searchParams;
  const q = one(sp.q)?.slice(0, 80);
  const kindRaw = one(sp.type);
  const kind = (MEDIA_KINDS as readonly string[]).includes(kindRaw ?? "") ? (kindRaw as MediaKind) : undefined;
  const result = await listMedia({ q, kinds: kind ? [kind] : undefined, page: Math.max(Number(one(sp.page) ?? 1) || 1, 1) });
  const t = await getTranslations("admin.media");
  const env = getServerEnv();

  return (
    <>
      <AdminPageHeading title={t("title")} description={t("description")} />
      <form method="get" role="search" className="mb-4 grid gap-3 rounded-card border border-border-subtle bg-surface-card p-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] md:items-end">
        <div className="space-y-1.5">
          <label htmlFor="q" className="text-sm font-medium">
            {t("searchLabel")}
          </label>
          <input id="q" name="q" defaultValue={q} placeholder={t("searchPlaceholder")} className={filterControlClass} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="type" className="text-sm font-medium">
            {t("typeLabel")}
          </label>
          <select id="type" name="type" defaultValue={kind ?? ""} className={filterControlClass}>
            <option value="">{t("allTypes")}</option>
            {MEDIA_KINDS.map((k) => (
              <option key={k} value={k}>
                {t(`kinds.${k}`)}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="outline">
          <Filter aria-hidden="true" /> {t("filter")}
        </Button>
      </form>
      <p className="mb-4 text-sm text-ink-secondary">{t("results", { count: result.total })}</p>
      <MediaLibrary
        items={result.items}
        canWrite={satisfies(user.role, "content:write")}
        filtered={Boolean(q || kind)}
        limits={{ imageMb: Math.round(env.MAX_IMAGE_UPLOAD_BYTES / 1_048_576), fileMb: Math.round(env.MAX_MEDIA_FILE_BYTES / 1_048_576) }}
      />
      <AdminPagination basePath="/admin/media" page={result.page} pageCount={result.pageCount} total={result.total} params={{ q, type: kind }} />
    </>
  );
}
