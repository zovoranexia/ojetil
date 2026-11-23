import type { Metadata } from "next";
import { ArrowLeft, CalendarDays, ExternalLink, Film, Image as ImageIcon, MapPin } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { GalleryGrid, type GalleryGridItem } from "@/components/public/gallery-grid";
import { ShareButtons } from "@/components/public/share-buttons";
import { fromDbLocale } from "@/config/locales";
import { municipalityLabel } from "@/config/municipalities";
import { getMetadataLocale, getPageLocale } from "@/i18n/page-locale";
import { Link } from "@/i18n/navigation";
import { isLowData } from "@/lib/bandwidth";
import { formatCalendarDate } from "@/lib/format";
import { absoluteUrl, localizedAlternates } from "@/lib/seo";
import { getPublishedAlbum } from "@/modules/gallery/queries";
import { videoThumbnail } from "@/modules/media/schema";

type Params = Promise<{ locale: string; slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const locale = await getMetadataLocale(params);
  if (!locale) return {};
  const { slug } = await params;
  const album = await getPublishedAlbum(slug, locale);
  if (!album) return {};
  const cover = album.items.find((i) => i.kind === "IMAGE");
  return {
    title: album.title,
    description: album.description ?? undefined,
    alternates: localizedAlternates(`/galeria/${slug}`, locale),
    openGraph: { title: album.title, description: album.description ?? undefined, ...(cover ? { images: [{ url: absoluteUrl(cover.url), alt: cover.altText || album.title }] } : {}) },
  };
}

export default async function AlbumPage({ params }: { params: Params }) {
  const locale = await getPageLocale(params);
  const { slug } = await params;
  const [t, album, low] = await Promise.all([getTranslations("gallery"), getPublishedAlbum(slug, locale), isLowData()]);
  if (!album) notFound();
  const served = fromDbLocale(album.servedLocale);
  const date = album.takenOn ? formatCalendarDate(locale, album.takenOn.getUTCFullYear(), album.takenOn.getUTCMonth() + 1, album.takenOn.getUTCDate()) : null;
  const shareUrl = absoluteUrl(`${locale === "tet" ? "" : `/${locale}`}/galeria/${album.slug}`);

  const items: GalleryGridItem[] = album.items.map((i) => ({
    id: i.id,
    kind: i.kind,
    url: i.url,
    width: i.width,
    height: i.height,
    altText: i.altText,
    credit: i.credit,
    caption: i.caption,
    thumb: i.kind === "VIDEO_LINK" ? videoThumbnail(i.url) : null,
  }));

  return (
    <>
      <header className="border-b border-border-subtle bg-paper">
        <div className="mx-auto max-w-6xl px-4 pb-10 pt-8 md:px-8 md:pt-12">
          <Link href="/galeria" className="inline-flex min-h-tap items-center gap-1.5 text-sm font-semibold text-ink-secondary hover:text-ojetil-red">
            <ArrowLeft aria-hidden="true" className="size-4" /> {t("back")}
          </Link>
          <h1 className="mt-4 max-w-3xl text-4xl md:text-5xl" lang={served !== locale ? served : undefined}>
            {album.title}
          </h1>
          <p className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-secondary">
            {date ? (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays aria-hidden="true" className="size-4" /> {date}
              </span>
            ) : null}
            {album.municipality ? (
              <span className="inline-flex items-center gap-1.5">
                <MapPin aria-hidden="true" className="size-4" /> {municipalityLabel(album.municipality)}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1.5">
              <ImageIcon aria-hidden="true" className="size-4" /> {t("itemCount", { count: album.items.length })}
            </span>
          </p>
          {album.description ? (
            <p className="mt-4 max-w-2xl whitespace-pre-line text-lg text-ink-secondary" lang={served !== locale ? served : undefined}>
              {album.description}
            </p>
          ) : null}
          {album.event ? (
            <Link href={`/edukasaun/acara/${album.event.slug}`} className="mt-4 inline-flex min-h-tap items-center gap-1.5 text-sm font-semibold text-ojetil-red hover:underline">
              {t("fromEvent", { title: album.event.title })}
            </Link>
          ) : null}
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
        {low ? (
          // Low-Data Mode: no image is downloaded until the reader asks for it.
          <div className="space-y-4">
            <p className="rounded-control bg-status-info-bg px-4 py-3 text-sm text-status-info">{t("lowDataNote")}</p>
            <ol className="divide-y divide-border-subtle rounded-card border border-border-subtle bg-surface-card">
              {items.map((it, i) => (
                <li key={it.id}>
                  <a
                    href={it.kind === "VIDEO_LINK" ? it.url.replace("youtube-nocookie.com/embed/", "youtube.com/watch?v=") : it.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-tap items-center gap-3 px-4 py-2 text-sm hover:bg-paper"
                  >
                    {it.kind === "IMAGE" ? <ImageIcon aria-hidden="true" className="size-4 shrink-0 text-ink-secondary" /> : <Film aria-hidden="true" className="size-4 shrink-0 text-ink-secondary" />}
                    <span className="flex-1">{it.caption || `${it.kind === "IMAGE" ? t("photo") : t("video")} ${i + 1}`}</span>
                    <ExternalLink aria-hidden="true" className="size-4 shrink-0 text-ink-secondary" />
                  </a>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <GalleryGrid
            items={items}
            title={album.title}
            labels={{
              open: t("openItem"),
              close: t("close"),
              previous: t("previous"),
              next: t("next"),
              counter: t("counter", { n: "{n}", total: "{total}" }),
              credit: t("credit", { name: "{name}" }),
              video: t("video"),
            }}
          />
        )}

        <div className="mt-10 border-t border-border-subtle pt-6">
          <ShareButtons url={shareUrl} title={album.title} />
        </div>
      </div>
    </>
  );
}
