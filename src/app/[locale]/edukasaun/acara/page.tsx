import type { Metadata } from "next";
import { Clock } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getMetadataLocale, getPageLocale } from "@/i18n/page-locale";
import { EventCard } from "@/components/public/event-card";
import { PageHeader } from "@/components/public/page-header";
import { siteConfig } from "@/config/site";
import { Link } from "@/i18n/navigation";
import { localizedAlternates } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { EVENT_TYPES, isEventType, listEvents } from "@/modules/events/queries";

type SearchParams = Promise<{ tipu?: string | string[] }>;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = await getMetadataLocale(params);
  if (!locale) return {};
  const t = await getTranslations({ locale, namespace: "events" });
  return { title: t("metaTitle"), description: t("lead"), alternates: localizedAlternates("/edukasaun/acara", locale) };
}

export default async function EventsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: SearchParams }) {
  const locale = await getPageLocale(params);
  const raw = (await searchParams).tipu;
  const type = isEventType(Array.isArray(raw) ? raw[0] : raw) ? ((Array.isArray(raw) ? raw[0] : raw) as (typeof EVENT_TYPES)[number]) : undefined;

  const [t, dates, upcoming, past] = await Promise.all([
    getTranslations("events"),
    getTranslations("dates"),
    listEvents({ locale, scope: "upcoming", type }),
    listEvents({ locale, scope: "past", type, take: 6 }),
  ]);

  const chip = (active: boolean) =>
    cn(
      "inline-flex min-h-tap shrink-0 items-center rounded-control border px-3.5 text-sm font-semibold transition-colors md:min-h-9",
      active ? "border-ink bg-ink text-paper" : "border-border-subtle bg-surface-card text-ink hover:border-border-strong",
    );

  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")}>
        <p className="mt-6 inline-flex items-center gap-2 rounded-control bg-status-info-bg px-3 py-2 text-sm font-medium text-status-info">
          <Clock aria-hidden="true" className="size-4" />
          {dates("timezone")}: {siteConfig.timeZone} · {siteConfig.timeZoneLabel}
        </p>
      </PageHeader>

      <div className="mx-auto max-w-6xl px-4 py-10 md:px-8">
        <nav aria-label={t("typeLabel")} className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none]">
          <ul className="flex gap-2">
            <li>
              <Link href="/edukasaun/acara" aria-current={!type ? "page" : undefined} className={chip(!type)}>
                {t("allTypes")}
              </Link>
            </li>
            {EVENT_TYPES.map((ty) => (
              <li key={ty}>
                <Link
                  href={{ pathname: "/edukasaun/acara", query: { tipu: ty } }}
                  aria-current={type === ty ? "page" : undefined}
                  className={chip(type === ty)}
                >
                  {t(`types.${ty}`)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <section aria-labelledby="upcoming" className="mt-10">
          <h2 id="upcoming" className="text-3xl">
            {t("upcoming")}
          </h2>
          {upcoming.length ? (
            <ul className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {upcoming.map((e) => (
                <li key={e.slug}>
                  <EventCard event={e} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-6 rounded-card border border-dashed border-border-subtle p-8 text-center text-ink-secondary">{t("emptyUpcoming")}</p>
          )}
        </section>

        <section aria-labelledby="past" className="mt-16 border-t border-border-subtle pt-10">
          <h2 id="past" className="text-2xl text-ink-secondary">
            {t("past")}
          </h2>
          {past.length ? (
            <ul className="mt-6 grid gap-6 opacity-90 md:grid-cols-2 lg:grid-cols-3">
              {past.map((e) => (
                <li key={e.slug}>
                  <EventCard event={e} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-6 text-ink-secondary">{t("emptyPast")}</p>
          )}
        </section>
      </div>
    </>
  );
}
