import { MapPin, Video } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import type { AppLocale } from "@/config/locales";
import { Link } from "@/i18n/navigation";
import { dateBadge, formatDateTimeRange, isoDate } from "@/lib/format";
import type { EventCardData } from "@/modules/events/queries";
import { CapacityMeter } from "./capacity-meter";

export async function EventCard({ event }: { event: EventCardData }) {
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations("events");
  const badge = dateBadge(event.startAt, locale);

  return (
    <article className="group relative flex h-full flex-col rounded-card border border-border-subtle bg-surface-card transition-shadow hover:shadow-[0_8px_24px_-12px_rgb(24_24_27/0.25)]">
      <div className="flex gap-4 p-5">
        <time
          dateTime={isoDate(event.startAt)}
          className="flex w-16 shrink-0 flex-col items-center justify-center rounded-card bg-ink py-2 text-paper"
        >
          <span className="font-serif text-2xl font-bold leading-none tabular-nums">{badge.day}</span>
          <span className="mt-1 text-xs font-semibold uppercase tracking-wide text-gold-accent">{badge.month}</span>
        </time>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <Badge tone="heritage">{t(`types.${event.type}`)}</Badge>
            {event.isOnline ? <Badge tone="info">{t("online")}</Badge> : null}
          </div>
          <h3 className="mt-2 text-xl leading-snug">
            <Link href={`/edukasaun/acara/${event.slug}`} className="after:absolute after:inset-0 hover:text-ojetil-red">
              {event.title}
            </Link>
          </h3>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-4 px-5 pb-5">
        <p className="line-clamp-3 text-sm text-ink-secondary">{event.summary}</p>
        <dl className="mt-auto space-y-1.5 text-sm">
          <div className="flex gap-2">
            <dt className="sr-only">{t("when")}</dt>
            <dd className="tabular-nums text-ink">
              {formatDateTimeRange(event.startAt, event.endAt, locale)} <span className="text-ink-secondary">(OTL)</span>
            </dd>
          </div>
          <div className="flex items-start gap-2 text-ink-secondary">
            <dt className="sr-only">{t("where")}</dt>
            {event.isOnline ? (
              <Video aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            ) : (
              <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            )}
            <dd>{event.location}</dd>
          </div>
        </dl>
        <CapacityMeter availability={event.availability} compact />
      </div>
    </article>
  );
}
