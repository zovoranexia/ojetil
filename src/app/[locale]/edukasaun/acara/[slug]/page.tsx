import type { Metadata } from "next";
import { ArrowLeft, CalendarDays, Clock, MapPin, Video } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getMetadataLocale, getPageLocale } from "@/i18n/page-locale";
import { RichContent } from "@/components/content/rich-content";
import { AlbumCard } from "@/components/public/album-card";
import { JsonLd, organizationLd } from "@/components/seo/json-ld";
import { CapacityMeter } from "@/components/public/capacity-meter";
import { ContentImage } from "@/components/public/content-image";
import { Badge } from "@/components/ui/badge";
import { municipalityLabel } from "@/config/municipalities";
import { siteConfig } from "@/config/site";
import { Link } from "@/i18n/navigation";
import { formatDate, formatDateTimeRange, formatTime, isoDate } from "@/lib/format";
import { absoluteUrl, localizedAlternates } from "@/lib/seo";
import { getPublicEvent } from "@/modules/events/queries";
import { albumsForEvent } from "@/modules/gallery/queries";
import { EventRegistrationForm } from "./registration-form";

type Params = Promise<{ locale: string; slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const locale = await getMetadataLocale(params);
  if (!locale) return {};
  const { slug } = await params;
  const event = await getPublicEvent(slug, locale);
  if (!event) return {};
  return { title: event.title, description: event.summary, alternates: localizedAlternates(`/edukasaun/acara/${slug}`, locale) };
}

export default async function EventDetailPage({ params }: { params: Params }) {
  const locale = await getPageLocale(params);
  const { slug } = await params;

  const [t, tr, event, albums] = await Promise.all([getTranslations("events"), getTranslations("eventRegistration"), getPublicEvent(slug, locale), albumsForEvent(slug, locale)]);
  if (!event) notFound();
  const { availability } = event;
  const pageUrl = absoluteUrl(`${locale === "tet" ? "" : `/${locale}`}/edukasaun/acara/${event.slug}`);

  return (
    <>
      <JsonLd
        data={{
          "@type": "Event",
          name: event.title,
          description: event.summary,
          url: pageUrl,
          startDate: event.startAt.toISOString(),
          endDate: event.endAt.toISOString(),
          eventStatus: availability.state === "cancelled" ? "https://schema.org/EventCancelled" : "https://schema.org/EventScheduled",
          eventAttendanceMode: event.isOnline ? "https://schema.org/OnlineEventAttendanceMode" : "https://schema.org/OfflineEventAttendanceMode",
          location: event.isOnline
            ? { "@type": "VirtualLocation", url: pageUrl }
            : {
                "@type": "Place",
                name: event.location,
                address: { "@type": "PostalAddress", addressLocality: event.municipality ? municipalityLabel(event.municipality) : event.location, addressCountry: "TL" },
              },
          ...(event.coverImageUrl ? { image: [absoluteUrl(event.coverImageUrl)] } : {}),
          isAccessibleForFree: true,
          organizer: organizationLd(),
        }}
      />
      <header className="border-b border-border-subtle">
        <div className="mx-auto max-w-6xl px-4 pb-10 pt-8 md:px-8 md:pt-12">
          <Link href="/edukasaun/acara" className="inline-flex min-h-tap items-center gap-1.5 text-sm font-semibold text-ink-secondary hover:text-ojetil-red">
            <ArrowLeft aria-hidden="true" className="size-4" /> {t("back")}
          </Link>
          <div className="mt-6 flex flex-wrap gap-2">
            <Badge tone="heritage">{t(`types.${event.type}`)}</Badge>
            {event.isOnline ? <Badge tone="info">{t("online")}</Badge> : null}
            {availability.state === "cancelled" ? <Badge tone="rejected">{t("cancelled")}</Badge> : null}
          </div>
          <h1 className="mt-4 max-w-3xl text-4xl md:text-5xl">{event.title}</h1>
          <p className="mt-4 max-w-2xl text-xl text-ink-secondary">{event.summary}</p>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 md:px-8 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-8">
          {/* Key facts — timezone is always explicit. */}
          <dl className="grid gap-4 rounded-card border border-border-subtle bg-surface-card p-5 sm:grid-cols-2">
            <div className="flex gap-3">
              <CalendarDays aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-ojetil-red" />
              <div>
                <dt className="text-sm font-medium text-ink-secondary">{t("when")}</dt>
                <dd className="mt-0.5">
                  <time dateTime={isoDate(event.startAt)} className="tabular-nums">
                    {formatDateTimeRange(event.startAt, event.endAt, locale)}
                  </time>
                </dd>
                <dd className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-status-info">
                  <Clock aria-hidden="true" className="size-3.5" />
                  {event.timezone} · {siteConfig.timeZoneLabel}
                </dd>
              </div>
            </div>
            <div className="flex gap-3">
              {event.isOnline ? (
                <Video aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-ojetil-red" />
              ) : (
                <MapPin aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-ojetil-red" />
              )}
              <div>
                <dt className="text-sm font-medium text-ink-secondary">{t("where")}</dt>
                <dd className="mt-0.5">{event.location}</dd>
                {event.municipality ? <dd className="text-sm text-ink-secondary">{municipalityLabel(event.municipality)}</dd> : null}
                {event.locationDetails ? <dd className="mt-1 text-sm text-ink-secondary">{event.locationDetails}</dd> : null}
              </div>
            </div>
          </dl>

          {event.coverImageUrl ? (
            <ContentImage src={event.coverImageUrl} alt="" sizes="(min-width: 1024px) 640px, 100vw" className="aspect-[16/9] w-full rounded-card" priority />
          ) : null}

          <section aria-labelledby="about-event">
            <h2 id="about-event" className="text-2xl">
              {t("about")}
            </h2>
            <RichContent body={event.description} className="mt-4" />
          </section>

          {albums.length ? (
            <section aria-labelledby="event-photos">
              <h2 id="event-photos" className="text-2xl">
                {t("photos")}
              </h2>
              <ul className="mt-4 grid gap-4 sm:grid-cols-2">
                {albums.map((a) => (
                  <li key={a.slug}>
                    <AlbumCard album={a} locale={locale} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <aside aria-labelledby="register-title" className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-card border border-border-subtle bg-surface-card">
            <div className="border-b border-border-subtle p-5">
              <h2 id="register-title" className="text-2xl">
                {tr("title")}
              </h2>
              <div className="mt-4">
                <CapacityMeter availability={availability} />
              </div>
              {availability.canRegister && event.registrationDeadline ? (
                <p className="mt-3 text-sm tabular-nums text-ink-secondary">
                  {t("deadline", {
                    date: `${formatDate(event.registrationDeadline, locale, { weekday: true })}, ${formatTime(event.registrationDeadline, locale)}`,
                  })}
                </p>
              ) : null}
            </div>
            <div className="p-5">
              {/* Always mounted: if this visitor just took the last seat, the refreshed
                  page must not replace their ticket with the "fully booked" notice. */}
              <EventRegistrationForm
                eventSlug={event.slug}
                canRegister={availability.canRegister}
                closedMessage={
                  availability.state === "full"
                    ? tr("errors.full")
                    : availability.state === "cancelled"
                      ? t("cancelled")
                      : availability.state === "ended"
                        ? t("ended")
                        : t("registrationClosed")
                }
              />
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
