"use client";

import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Markdown } from "@/components/content/markdown";
import { cn } from "@/lib/utils";

export interface TimelineEntry {
  slug: string;
  marker: string;
  dateLabel: string;
  isoDate: string | null;
  isHighlighted: boolean;
  title: string;
  summary: string;
  body: string | null;
}

/**
 * Interactive narrative timeline:
 *  • sticky period navigation that tracks the milestone currently in view;
 *  • each story expands in place (disclosure buttons, keyboard accessible);
 *  • deep links (/istoria#santa-cruz-1991) open and scroll to that story.
 * Works without JavaScript: all summaries render and anchors still navigate.
 */
export function TimelineExplorer({ entries }: { entries: TimelineEntry[] }) {
  const t = useTranslations("history");
  const [active, setActive] = useState(entries[0]?.slug ?? "");
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());

  // Open the story targeted by the URL hash.
  useEffect(() => {
    const fromHash = () => {
      const slug = decodeURIComponent(window.location.hash.slice(1));
      if (entries.some((e) => e.slug === slug)) {
        setOpen((prev) => new Set(prev).add(slug));
        setActive(slug);
      }
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [entries]);

  // Highlight the period whose milestone is crossing the upper third of the viewport.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (records) => {
        const visible = records.filter((r) => r.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -60% 0px" },
    );
    for (const e of entries) {
      const node = document.getElementById(e.slug);
      if (node) observer.observe(node);
    }
    return () => observer.disconnect();
  }, [entries]);

  const toggle = (slug: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });

  return (
    <div className="lg:grid lg:grid-cols-[200px_1fr] lg:gap-12">
      <nav aria-label={t("filterLabel")} className="sticky top-0 z-20 -mx-4 border-b border-border-subtle bg-paper/95 px-4 backdrop-blur lg:top-6 lg:mx-0 lg:self-start lg:border-0 lg:bg-transparent lg:px-0">
        <p className="hidden pb-3 text-xs font-semibold uppercase tracking-[0.14em] text-gold-text lg:block">{t("filterLabel")}</p>
        <ol className="flex gap-1 overflow-x-auto py-2 [scrollbar-width:none] lg:flex-col lg:gap-0 lg:border-l lg:border-border-subtle lg:py-0">
          {entries.map((e) => {
            const isActive = e.slug === active;
            return (
              <li key={e.slug} className="shrink-0">
                <a
                  href={`#${e.slug}`}
                  aria-current={isActive ? "location" : undefined}
                  className={cn(
                    "relative flex min-h-tap items-center whitespace-nowrap rounded-control px-3 font-serif text-lg font-semibold tabular-nums transition-colors lg:-ml-px lg:rounded-none lg:border-l-2 lg:pl-4",
                    isActive
                      ? "bg-ink text-gold-accent lg:border-ojetil-red lg:bg-transparent lg:text-ojetil-red"
                      : "text-ink-secondary hover:text-ink lg:border-transparent",
                  )}
                >
                  {e.marker}
                </a>
              </li>
            );
          })}
        </ol>
      </nav>

      <ol className="relative mt-8 border-l-2 border-ojetil-red/25 pl-6 md:pl-10 lg:mt-0">
        {entries.map((e) => {
          const expanded = open.has(e.slug);
          const panelId = `${e.slug}-story`;
          return (
            <li key={e.slug} id={e.slug} className="relative scroll-mt-24 pb-14 last:pb-0">
              <span
                aria-hidden="true"
                className={cn(
                  "absolute top-2 -left-[33px] size-4 rounded-full border-4 border-paper md:-left-[49px]",
                  e.isHighlighted ? "bg-ojetil-red" : "bg-ink",
                )}
              />
              <article
                className={cn(
                  "rounded-card p-6 md:p-8",
                  e.isHighlighted ? "bg-ink text-paper" : "border border-border-subtle bg-surface-card",
                )}
              >
                <p className={cn("font-serif text-5xl font-bold tabular-nums md:text-6xl", e.isHighlighted ? "text-gold-accent" : "text-ojetil-red")}>
                  {e.marker}
                </p>
                {e.isoDate ? (
                  <time
                    dateTime={e.isoDate}
                    className={cn("mt-2 block text-sm font-medium uppercase tracking-wide", e.isHighlighted ? "text-paper/70" : "text-gold-text")}
                  >
                    {e.dateLabel}
                  </time>
                ) : (
                  <p className={cn("mt-2 text-sm font-medium uppercase tracking-wide", e.isHighlighted ? "text-paper/70" : "text-gold-text")}>
                    {e.dateLabel}
                  </p>
                )}
                <h2 className={cn("mt-4 text-3xl", e.isHighlighted && "text-paper")}>{e.title}</h2>
                <p className={cn("mt-4 text-lg", e.isHighlighted ? "text-paper/90" : "text-ink-secondary")}>{e.summary}</p>

                {e.body ? (
                  <>
                    <div id={panelId} hidden={!expanded} className="mt-6">
                      <Markdown source={e.body} className={cn(e.isHighlighted && "text-paper/90")} />
                    </div>
                    <button
                      type="button"
                      aria-expanded={expanded}
                      aria-controls={panelId}
                      onClick={() => toggle(e.slug)}
                      className={cn(
                        "mt-6 inline-flex min-h-tap items-center gap-2 rounded-control px-1 text-sm font-semibold underline-offset-4 hover:underline",
                        e.isHighlighted ? "text-gold-accent" : "text-ojetil-red",
                      )}
                    >
                      {expanded ? t("showLess") : t("showMore")}
                      <ChevronDown aria-hidden="true" className={cn("size-4 transition-transform", expanded && "rotate-180")} />
                    </button>
                  </>
                ) : null}
              </article>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
