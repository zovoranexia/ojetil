import { Images, MapPin } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { ContentImage } from "@/components/public/content-image";
import type { AppLocale } from "@/config/locales";
import { municipalityLabel } from "@/config/municipalities";
import { Link } from "@/i18n/navigation";
import { isLowData } from "@/lib/bandwidth";
import { formatCalendarDate } from "@/lib/format";
import type { PublicAlbumCard } from "@/modules/gallery/queries";

/** Album teaser: cover photo, title, date, município and item count. Low-Data Mode shows no image. */
export async function AlbumCard({ album, locale }: { album: PublicAlbumCard; locale: AppLocale }) {
  const [t, low] = await Promise.all([getTranslations("gallery"), isLowData()]);
  const date = album.takenOn ? formatCalendarDate(locale, album.takenOn.getUTCFullYear(), album.takenOn.getUTCMonth() + 1, album.takenOn.getUTCDate()) : null;
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-card border border-border-subtle bg-surface-card transition-shadow hover:shadow-[0_8px_24px_rgb(24_24_27/0.08)]">
      {!low ? (
        <div className="relative aspect-[4/3] overflow-hidden bg-surface-muted">
          {album.cover ? (
            <ContentImage src={album.cover.url} alt={album.cover.altText ?? ""} sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw" className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
          ) : (
            <div className="flex size-full items-center justify-center text-ink-secondary/50">
              <Images aria-hidden="true" className="size-10" />
            </div>
          )}
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-control bg-ink/75 px-2 py-0.5 text-xs font-semibold text-white">
            <Images aria-hidden="true" className="size-3.5" /> {album.count}
          </span>
        </div>
      ) : null}
      <div className="flex flex-1 flex-col p-5">
        {date ? <p className="text-xs font-semibold uppercase tracking-wide text-gold-text">{date}</p> : null}
        <h2 className="mt-1 font-serif text-xl font-semibold leading-snug">
          <Link href={`/galeria/${album.slug}`} className="after:absolute after:inset-0 hover:text-ojetil-red focus-visible:outline-none">
            {album.title}
          </Link>
        </h2>
        <p className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-3 text-sm text-ink-secondary">
          {album.municipality ? (
            <span className="inline-flex items-center gap-1">
              <MapPin aria-hidden="true" className="size-3.5" /> {municipalityLabel(album.municipality)}
            </span>
          ) : null}
          {low ? <span>{t("itemCount", { count: album.count })}</span> : null}
        </p>
      </div>
    </article>
  );
}
