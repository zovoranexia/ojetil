import type { Metadata } from "next";
import { Archive } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getMetadataLocale, getPageLocale } from "@/i18n/page-locale";
import { PageHeader } from "@/components/public/page-header";
import { TimelineExplorer, type TimelineEntry } from "@/components/public/timeline-explorer";
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

  const [t, dates, sections, milestones] = await Promise.all([
    getTranslations("history"),
    getTranslations("dates"),
    getProfileSections(locale),
    getTimeline(locale),
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
    body: m.body,
  }));

  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} title={intro?.title ?? t("metaTitle")} lead={intro?.body} />
      <div className="mx-auto max-w-6xl px-4 py-12 md:px-8 md:py-16">
        {entries.length ? <TimelineExplorer entries={entries} /> : <p className="text-ink-secondary">{t("empty")}</p>}
        <p className="mt-14 flex items-start gap-3 rounded-card border border-dashed border-border-subtle p-5 text-sm text-ink-secondary">
          <Archive aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {t("note")}
        </p>
      </div>
    </>
  );
}
