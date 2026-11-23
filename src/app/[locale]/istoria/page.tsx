import type { Metadata } from "next";
import { Archive, ArrowDown } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getMetadataLocale, getPageLocale } from "@/i18n/page-locale";
import { HistoryToc } from "@/components/public/history-toc";
import { PageHeader } from "@/components/public/page-header";
import { TimelineExplorer, type TimelineEntry } from "@/components/public/timeline-explorer";
import { isLowData } from "@/lib/bandwidth";
import { articlePlainText, renderArticleHtml } from "@/lib/content/sanitize";
import { slugify } from "@/lib/slug";
import { localizedAlternates } from "@/lib/seo";
import { milestoneLabel, milestoneYear } from "@/modules/content/milestone-label";
import { getProfileSections, getTimeline } from "@/modules/content/queries";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = await getMetadataLocale(params);
  if (!locale) return {};
  const t = await getTranslations({ locale, namespace: "history" });
  return { title: t("metaTitle"), alternates: localizedAlternates("/istoria", locale) };
}

/**
 * Gives every <h2> of the (already sanitised) intro an id built from its text,
 * and returns the list for the "on this page" navigation.
 */
function withHeadingIds(html: string): { html: string; headings: Array<{ id: string; text: string }> } {
  const headings: Array<{ id: string; text: string }> = [];
  const used = new Set<string>();
  const out = html.replace(/<h2([^>]*)>([\s\S]*?)<\/h2>/gi, (_m, attrs: string, inner: string) => {
    const text = articlePlainText(`<p>${inner}</p>`);
    let id = `bab-${slugify(text) || headings.length + 1}`;
    while (used.has(id)) id = `${id}-2`;
    used.add(id);
    headings.push({ id, text });
    return `<h2${attrs} id="${id}" class="scroll-mt-24">${inner}</h2>`;
  });
  return { html: out, headings };
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
  const introParts = intro?.body ? withHeadingIds(renderArticleHtml(intro.body, { lowData, videoLinkLabel: tNews("watchVideo") })) : null;

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

  // Key dates for the side column: up to six, highlighted ones preferred, in timeline order.
  // Shows the bare year (a decade label is too long for the narrow column).
  const keyDates = [...milestones.filter((m) => m.isHighlighted), ...milestones.filter((m) => !m.isHighlighted)]
    .slice(0, 6)
    .sort((a, b) => milestones.indexOf(a) - milestones.indexOf(b));

  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} title={intro?.title ?? t("metaTitle")} />
      <div className="mx-auto max-w-6xl px-4 py-12 md:px-8 md:py-16">
        {introParts ? (
          <div className="mb-16 grid gap-10 lg:grid-cols-[minmax(0,1fr)_17rem] lg:gap-14">
            {/* Safe: sanitised by renderArticleHtml; only generated heading ids are added. */}
            <div className="rich-content max-w-3xl text-lg lg:self-center" dangerouslySetInnerHTML={{ __html: introParts.html }} />

            <aside className="space-y-8 lg:sticky lg:top-6 lg:self-start">
              {introParts.headings.length > 1 ? (
                <div className="hidden rounded-card border border-border-subtle bg-surface-card p-5 lg:block">
                  <HistoryToc headings={introParts.headings} label={t("contents")} />
                </div>
              ) : null}
              {keyDates.length ? (
                <div className="rounded-card border border-border-subtle bg-surface-card p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-text">{t("keyDates")}</p>
                  <ol className="mt-4 space-y-3">
                    {keyDates.map((e) => (
                      <li key={e.slug}>
                        <a href={`#${e.slug}`} className="group flex gap-3">
                          <span className="w-12 shrink-0 font-serif text-lg font-bold leading-tight tabular-nums text-ojetil-red">{e.year}</span>
                          <span className="text-sm leading-snug text-ink group-hover:text-ojetil-red group-hover:underline">{e.title}</span>
                        </a>
                      </li>
                    ))}
                  </ol>
                  <a href="#kronolojia" className="mt-5 inline-flex min-h-tap items-center gap-1.5 text-sm font-semibold text-ojetil-red hover:underline md:min-h-9">
                    {t("fullTimeline")} <ArrowDown aria-hidden="true" className="size-4" />
                  </a>
                </div>
              ) : null}
            </aside>
          </div>
        ) : null}
        <section id="kronolojia" aria-label={t("fullTimeline")} className="scroll-mt-24">
          {entries.length ? <TimelineExplorer entries={entries} /> : <p className="text-ink-secondary">{t("empty")}</p>}
        </section>
        <p className="mt-14 flex items-start gap-3 rounded-card border border-dashed border-border-subtle p-5 text-sm text-ink-secondary">
          <Archive aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {t("note")}
        </p>
      </div>
    </>
  );
}
