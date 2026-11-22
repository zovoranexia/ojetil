import type { Metadata } from "next";
import { Clock, ExternalLink, Mail, MapPin, Phone } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getMetadataLocale, getPageLocale } from "@/i18n/page-locale";
import { Markdown } from "@/components/content/markdown";
import { ContentImage } from "@/components/public/content-image";
import { PageHeader, SectionHeading } from "@/components/public/page-header";
import { Badge } from "@/components/ui/badge";
import { municipalityLabel } from "@/config/municipalities";
import { siteConfig } from "@/config/site";
import { localizedAlternates } from "@/lib/seo";
import { getLeadership, getProfileSections, type LeaderView } from "@/modules/content/queries";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = await getMetadataLocale(params);
  if (!locale) return {};
  const t = await getTranslations({ locale, namespace: "about" });
  return { title: t("metaTitle"), alternates: localizedAlternates("/kona-ba", locale) };
}

function initials(name: string): string {
  const parts = name.split(/\s+/).filter((p) => p.length > 2 || /^[A-ZÁÉÍÓÚ]/.test(p));
  return `${parts[0]?.[0] ?? ""}${parts.at(-1)?.[0] ?? ""}`.toUpperCase();
}

async function LeaderCard({ leader, termLabel }: { leader: LeaderView; termLabel: string }) {
  return (
    <article className="flex gap-4 rounded-card border border-border-subtle bg-surface-card p-4">
      {leader.photoUrl ? (
        <ContentImage src={leader.photoUrl} alt={leader.fullName} sizes="64px" className="size-16 shrink-0 rounded-full" />
      ) : (
        <div
          aria-hidden="true"
          className="flex size-16 shrink-0 items-center justify-center rounded-full bg-ink font-serif text-xl font-bold text-gold-accent"
        >
          {initials(leader.fullName)}
        </div>
      )}
      <div className="min-w-0">
        <h4 className="font-serif text-lg font-semibold leading-snug">{leader.fullName}</h4>
        <p className="text-sm font-medium text-ojetil-red">{leader.title}</p>
        <p className="mt-1 text-xs tabular-nums text-ink-secondary">{termLabel}</p>
        {leader.bio ? <p className="mt-2 text-sm text-ink-secondary">{leader.bio}</p> : null}
      </div>
    </article>
  );
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await getPageLocale(params);

  const [t, sections, leadership] = await Promise.all([
    getTranslations("about"),
    getProfileSections(locale),
    getLeadership(locale),
  ]);
  const term = (l: LeaderView) =>
    l.termEnd ? t("leadership.term", { start: l.termStart, end: l.termEnd }) : t("leadership.termOngoing", { start: l.termStart });

  const profile = sections.PROFILE;
  const { headquarters: hq, contact } = siteConfig;
  const mapUrl = `https://www.openstreetmap.org/?mlat=${hq.geo.lat}&mlon=${hq.geo.lng}#map=17/${hq.geo.lat}/${hq.geo.lng}`;

  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} title={profile?.title ?? t("metaTitle")} />

      <div className="mx-auto max-w-6xl px-4 py-12 md:px-8 md:py-16">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr]">
          {profile ? <Markdown source={profile.body} className="text-lg md:text-xl" /> : null}

          {/* Vision, mission, values */}
          <div className="space-y-6">
            {sections.VISION ? (
              <section aria-labelledby="vision" className="rounded-card bg-ink p-6 text-paper">
                <h2 id="vision" className="text-2xl text-gold-accent">
                  {sections.VISION.title}
                </h2>
                <p className="mt-3 font-serif text-xl leading-snug">{sections.VISION.body}</p>
              </section>
            ) : null}
            {sections.VALUES ? (
              <section aria-labelledby="values" className="rounded-card border border-border-subtle bg-surface-card p-6">
                <h2 id="values" className="text-xl">
                  {sections.VALUES.title}
                </h2>
                <Markdown source={sections.VALUES.body} className="mt-3 text-base md:text-base" />
              </section>
            ) : null}
          </div>
        </div>

        {sections.MISSION ? (
          <section aria-labelledby="mission" className="mt-14 border-t border-border-subtle pt-10">
            <h2 id="mission" className="text-3xl">
              {sections.MISSION.title}
            </h2>
            <ol className="mt-6 grid gap-4 md:grid-cols-2">
              {sections.MISSION.body
                .split("\n")
                .map((l) => l.replace(/^\s*[-*]\s+/, "").trim())
                .filter(Boolean)
                .map((item, i) => (
                  <li key={i} className="flex gap-4 rounded-card border border-border-subtle bg-surface-card p-5">
                    <span className="font-serif text-3xl font-bold tabular-nums text-ojetil-red">{String(i + 1).padStart(2, "0")}</span>
                    <span className="pt-1">{item}</span>
                  </li>
                ))}
            </ol>
          </section>
        ) : null}
      </div>

      {/* Leadership */}
      <section aria-labelledby="leadership" className="border-y border-border-subtle bg-surface-card">
        <div className="mx-auto max-w-6xl px-4 py-14 md:px-8">
          <SectionHeading id="leadership" title={t("leadership.title")} lead={t("leadership.lead")} />
          {leadership.national.length + leadership.municipal.length === 0 ? (
            <p className="mt-8 text-ink-secondary">{t("leadership.empty")}</p>
          ) : (
            <>
              <h3 className="mt-10 text-xl">{t("leadership.national")}</h3>
              <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {leadership.national.map((l) => (
                  <li key={l.id}>
                    <LeaderCard leader={l} termLabel={term(l)} />
                  </li>
                ))}
              </ul>
              <h3 className="mt-12 text-xl">{t("leadership.municipal")}</h3>
              <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {leadership.municipal.map((l) => (
                  <li key={l.id} className="space-y-2">
                    {l.municipality ? <Badge tone="heritage">{municipalityLabel(l.municipality)}</Badge> : null}
                    <LeaderCard leader={l} termLabel={term(l)} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>

      {/* Contact */}
      <section aria-labelledby="contact" className="mx-auto max-w-6xl px-4 py-14 md:px-8">
        <SectionHeading id="contact" title={t("contact.title")} lead={t("contact.lead")} />
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <address className="not-italic rounded-card border border-border-subtle bg-surface-card p-6">
            <dl className="space-y-5">
              <div className="flex gap-4">
                <MapPin aria-hidden="true" className="mt-1 size-5 shrink-0 text-ojetil-red" />
                <div>
                  <dt className="text-sm font-medium text-ink-secondary">{t("contact.address")}</dt>
                  <dd className="mt-0.5 text-lg">
                    {siteConfig.fullName}
                    <br />
                    {hq.street}, {hq.city}, {hq.country}
                  </dd>
                  <dd className="mt-2">
                    <a
                      href={mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-tap items-center gap-1.5 text-sm font-semibold text-ojetil-red underline-offset-4 hover:underline"
                    >
                      {t("contact.map")} <ExternalLink aria-hidden="true" className="size-4" />
                    </a>
                  </dd>
                </div>
              </div>
            </dl>
            <p className="mt-5 flex gap-4">
              <Clock aria-hidden="true" className="mt-1 size-5 shrink-0 text-ojetil-red" />
              <span className="tabular-nums">{t("contact.hours")}</span>
            </p>
          </address>
          <div className="grid gap-4">
            <a
              href={`mailto:${contact.email}`}
              className="flex items-center gap-4 rounded-card border border-border-subtle bg-surface-card p-6 hover:border-border-strong"
            >
              <Mail aria-hidden="true" className="size-5 shrink-0 text-ojetil-red" />
              <span>
                <span className="block text-sm font-medium text-ink-secondary">{t("contact.email")}</span>
                <span className="break-all text-lg">{contact.email}</span>
              </span>
            </a>
            <a
              href={`tel:${contact.phone.replace(/\s/g, "")}`}
              className="flex items-center gap-4 rounded-card border border-border-subtle bg-surface-card p-6 hover:border-border-strong"
            >
              <Phone aria-hidden="true" className="size-5 shrink-0 text-ojetil-red" />
              <span>
                <span className="block text-sm font-medium text-ink-secondary">{t("contact.phone")}</span>
                <span className="text-lg tabular-nums">{contact.phone}</span>
              </span>
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
