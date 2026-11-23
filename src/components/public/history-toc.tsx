"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * "On this page" list for a long article: links to its section headings and
 * highlights the section currently being read (scroll-spy).
 */
export function HistoryToc({ headings, label }: { headings: Array<{ id: string; text: string }>; label: string }) {
  const [active, setActive] = useState<string | null>(headings[0]?.id ?? null);

  useEffect(() => {
    const els = headings.map((h) => document.getElementById(h.id)).filter((el): el is HTMLElement => el !== null);
    if (!els.length) return;
    const observer = new IntersectionObserver(
      (records) => {
        const visible = records.filter((r) => r.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      // A heading counts as "current" once it reaches the top third of the screen.
      { rootMargin: "0px 0px -66% 0px", threshold: 0 },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [headings]);

  return (
    <nav aria-label={label}>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-text">{label}</p>
      <ol className="mt-3 space-y-0.5 border-l border-border-subtle">
        {headings.map((h) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              aria-current={active === h.id ? "location" : undefined}
              className={cn(
                "-ml-px block border-l-2 py-1.5 pl-4 text-sm leading-snug transition-colors",
                active === h.id ? "border-ojetil-red font-semibold text-ink" : "border-transparent text-ink-secondary hover:border-border-strong hover:text-ink",
              )}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
