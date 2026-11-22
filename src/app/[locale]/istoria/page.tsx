import type { Metadata } from "next";
import { Archive } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getMetadataLocale, getPageLocale } from "@/i18n/page-locale";
import { RichContent } from "@/components/content/rich-content";
import { PageHeader } from "@/components/public/page-header";
import { TimelineExplorer, type TimelineEntry } from "@/components/public/timeline-explorer";
import { isLowData } from "@/lib/bandwidth";
import { renderArticleHtml } from "@/lib/content/sanitize";
import { localizedAlternates } from "@/lib/seo";
import { milestoneLabel, milestoneYear } from "@/modules/content/milestone-label";
import { getProfileSections, getTimeline } from "@/modules/content/queries";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = await getMetadataLocale(params);
  if (!locale) return {};
  const t = await getTranslations({ locale, namespace: "history" });
  return { title: t("metaTitle"), alternates: localizedAlternates("/istoria", locale) };
}

function isoFor(m: { year: number; month: number | null; day: number | null; datePrecision: string }): string | null {
  if (m.datePrecision === "DECADE") return null;
  if (m.datePrecision === "YEAR" || !m.month) return String(m.year);
  const mm = String(m.month).padStart(2, "0");
  return m.datePrecision === "MONTH" || !m.day ? `${m.year}-${mm}` : `${m.year}-${mm}-${String(m.day).padStart(2, "0")}`;
}

export default async function HistoryPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await getPageLocale(params);

  const [t, dates, sections, milestones, lowData, tNews] = await Promise.all([
    getTranslations("history"),
    getTranslations("dates"),
    getProfileSections(locale),
    getTimeline(locale),
    isLowData(),
    getTranslations("news"),
  ]);
  const decade = (year: number) => dates("decade", { year });
  const intro = sections.HISTORY_INTRO;

  const entries: TimelineEntry[] = milestones.map((m) => ({
    slug: m.slug,
    marker: milestoneYear(m, decade),
    dateLabel: milestoneLabel(m, locale, decade),
    isoDate: isoFor(m),
    isHighlighted: m.isHighlighted,
    title: m.title,
    summary: m.summary,
    // Sanitised on the server; the explorer is a client component.
    bodyHtml: m.body ? renderArticleHtml(m.body, { lowData, videoLinkLabel: tNews("watchVideo") }) : null,
  }));

  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} title={intro?.title ?? t("metaTitle")} />
      <div className="mx-auto max-w-6xl px-4 py-12 md:px-8 md:py-16">
        {intro?.body ? <RichContent body={intro.body} className="mb-12 max-w-3xl text-lg" /> : null}
        {entries.length ? <TimelineExplorer entries={entries} /> : <p className="text-ink-secondary">{t("empty")}</p>}
        <p className="mt-14 flex items-start gap-3 rounded-card border border-dashed border-border-subtle p-5 text-sm text-ink-secondary">
          <Archive aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {t("note")}
        </p>
      </div>
    </>
  );
}
