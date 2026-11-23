import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AlbumCard } from "@/components/public/album-card";
import { PageHeader } from "@/components/public/page-header";
import { Pagination } from "@/components/public/pagination";
import { getMetadataLocale, getPageLocale } from "@/i18n/page-locale";
import { localizedAlternates } from "@/lib/seo";
import { listPublishedAlbums } from "@/modules/gallery/queries";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = await getMetadataLocale(params);
  if (!locale) return {};
  const t = await getTranslations({ locale, namespace: "gallery" });
  return { title: t("metaTitle"), description: t("lead"), alternates: localizedAlternates("/galeria", locale) };
}

export default async function GalleryPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ page?: string | string[] }> }) {
  const locale = await getPageLocale(params);
  const raw = (await searchParams).page;
  const page = Math.max(Number.parseInt((Array.isArray(raw) ? raw[0] : raw) ?? "1", 10) || 1, 1);
  const [t, result] = await Promise.all([getTranslations("gallery"), listPublishedAlbums({ locale, page })]);

  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} />
      <div className="mx-auto max-w-6xl px-4 py-10 md:px-8 md:py-14">
        {result.items.length ? (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {result.items.map((a) => (
              <li key={a.slug}>
                <AlbumCard album={a} locale={locale} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-card border border-dashed border-border-subtle px-6 py-12 text-center text-ink-secondary">{t("empty")}</p>
        )}
        <Pagination pathname="/galeria" page={result.page} pageCount={result.pageCount} query={{}} />
      </div>
    </>
  );
}
