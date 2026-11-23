import type { Metadata } from "next";
import { JsonLd, organizationLd } from "@/components/seo/json-ld";
import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getMetadataLocale, getPageLocale } from "@/i18n/page-locale";
import { EventCard } from "@/components/public/event-card";
import { HeroEmblem } from "@/components/public/hero-emblem";
import { NewsCard } from "@/components/public/news-card";
import { Eyebrow, SectionHeading } from "@/components/public/page-header";
import { Button } from "@/components/ui/button";
import { CHECK_STATUS_PATH, REGISTER_PATH } from "@/config/navigation";
import { Link } from "@/i18n/navigation";
import { formatNumber } from "@/lib/format";
import { localizedAlternates } from "@/lib/seo";
import { milestoneLabel, milestoneYear } from "@/modules/content/milestone-label";
import { getImpactStats, getTimeline } from "@/modules/content/queries";
import { listEvents } from "@/modules/events/queries";
import { latestNews } from "@/modules/news/queries";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = await getMetadataLocale(params);
  if (!locale) return {};
  const t = await getTranslations({ locale, namespace: "meta" });
  return { title: { absolute: t("siteTitle") }, alternates: localizedAlternates("/", locale) };
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await getPageLocale(params);

  const [t, dates, stats, milestones, events, news] = await Promise.all([
    getTranslations("home"),
    getTranslations("dates"),
    getImpactStats(),
    getTimeline(locale, { highlightedOnly: true, untilYear: 1999 }),
    listEvents({ locale, scope: "upcoming", take: 3 }),
    latestNews(locale, 3),
  ]);
  const decade = (year: number) => dates("decade", { year });

  const impact = [
    { value: stats.verifiedMembers, label: t("impact.verifiedMembers") },
    { value: stats.eventsHeld, label: t("impact.eventsHeld") },
    { value: stats.participants, label: t("impact.participants") },
    { value: stats.municipalities, label: t("impact.municipalities") },
  ];

  return (
    <>
      <JsonLd data={organizationLd()} />
      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section aria-labelledby="hero-title" className="relative overflow-hidden border-b border-border-subtle">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-[1.15fr_1fr] md:items-center lg:grid-cols-[1.35fr_1fr] lg:gap-14 md:px-8 md:py-20">
          <div>
            <Eyebrow>{t("hero.eyebrow")}</Eyebrow>
            <h1 id="hero-title" className="mt-4 text-[2.5rem] leading-[1.05] md:text-6xl">
              {t("hero.title")}
            </h1>
            <p className="mt-5 max-w-xl text-lg text-ink-secondary md:text-xl">{t("hero.lead")}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href={REGISTER_PATH}>
                  {t("hero.ctaRegister")}
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="editorial">
                <Link href="/istoria">{t("hero.ctaHistory")}</Link>
              </Button>
            </div>
          </div>

          <HeroEmblem
            milestones={milestones.slice(0, 4).map((m) => ({
              key: m.slug,
              year: milestoneYear(m, decade),
              title: m.title,
            }))}
          />
        </div>
      </section>

      {/* ── Impact strip ───────────────────────────────────────────────── */}
      <section aria-labelledby="impact-title" className="border-b border-border-subtle bg-surface-card">
        <div className="mx-auto max-w-6xl px-4 py-10 md:px-8">
          <h2 id="impact-title" className="sr-only">
            {t("impact.title")}
          </h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4">
            {impact.map((item) => (
              <div key={item.label} className="flex flex-col-reverse border-l-2 border-ojetil-red pl-4">
                <dt className="mt-1 text-sm text-ink-secondary">{item.label}</dt>
                <dd className="font-serif text-4xl font-bold tabular-nums text-ink md:text-5xl">
                  {formatNumber(item.value, locale)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── Timeline teaser 1980–1999 ─────────────────────────────────── */}
      <section aria-labelledby="timeline-title" className="mx-auto max-w-6xl px-4 py-16 md:px-8">
        <SectionHeading
          id="timeline-title"
          title={t("timeline.title")}
          lead={t("timeline.lead")}
          action={
            <Button asChild variant="link" className="px-0">
              <Link href="/istoria">
                {t("timeline.cta")} <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          }
        />
        <ol className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {milestones.map((m) => (
            <li key={m.slug} className="relative border-t-2 border-ojetil-red pt-4">
              <p className="font-serif text-3xl font-bold tabular-nums text-ojetil-red">{milestoneYear(m, decade)}</p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wide text-gold-text">{milestoneLabel(m, locale, decade)}</p>
              <h3 className="mt-3 text-xl">
                <Link href={`/istoria#${m.slug}`} className="hover:text-ojetil-red">
                  {m.title}
                </Link>
              </h3>
              <p className="mt-2 line-clamp-4 text-sm text-ink-secondary">{m.summary}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Upcoming events ───────────────────────────────────────────── */}
      <section aria-labelledby="events-title" className="border-y border-border-subtle bg-surface-card">
        <div className="mx-auto max-w-6xl px-4 py-16 md:px-8">
          <SectionHeading
            id="events-title"
            title={t("events.title")}
            lead={t("events.lead")}
            action={
              <Button asChild variant="outline">
                <Link href="/edukasaun/acara">{t("events.cta")}</Link>
              </Button>
            }
          />
          {events.length ? (
            <ul className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {events.map((e) => (
                <li key={e.slug}>
                  <EventCard event={e} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-8 rounded-card border border-dashed border-border-subtle p-6 text-ink-secondary">{t("events.empty")}</p>
          )}
        </div>
      </section>

      {/* ── Latest news ───────────────────────────────────────────────── */}
      <section aria-labelledby="news-title" className="mx-auto max-w-6xl px-4 py-16 md:px-8">
        <SectionHeading
          id="news-title"
          title={t("news.title")}
          action={
            <Button asChild variant="outline">
              <Link href="/notisia">{t("news.cta")}</Link>
            </Button>
          }
        />
        {news.length ? (
          <ul className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {news.map((a) => (
              <li key={a.slug}>
                <NewsCard article={a} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-8 text-ink-secondary">{t("news.empty")}</p>
        )}
      </section>

      {/* ── Registration CTA ──────────────────────────────────────────── */}
      <section aria-labelledby="cta-title" className="px-4 pb-16 md:px-8">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-card bg-ojetil-red text-white">
          <div aria-hidden="true" className="tais-ribbon absolute inset-x-0 top-0" />
          <div className="grid gap-8 px-6 py-10 md:grid-cols-[1.5fr_1fr] md:items-center md:px-12 md:py-14">
            <div>
              <h2 id="cta-title" className="text-3xl text-white md:text-4xl">
                {t("cta.title")}
              </h2>
              <p className="mt-4 max-w-2xl text-white/90">{t("cta.body")}</p>
            </div>
            <div className="flex flex-col gap-3 md:items-end">
              <Button asChild size="lg" variant="editorial" className="w-full md:w-auto">
                <Link href={REGISTER_PATH}>
                  {t("cta.button")} <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
              <Link
                href={CHECK_STATUS_PATH}
                className="inline-flex min-h-tap items-center text-sm font-semibold text-white underline underline-offset-4 hover:no-underline"
              >
                {t("cta.checkStatus")}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
