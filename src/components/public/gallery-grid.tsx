"use client";

import { ChevronLeft, ChevronRight, Film, Play, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface GalleryGridItem {
  id: string;
  kind: "IMAGE" | "VIDEO" | "VIDEO_LINK" | "PDF" | "AUDIO";
  url: string;
  width: number | null;
  height: number | null;
  altText: string | null;
  credit: string | null;
  caption: string | null;
  /** Thumbnail for video links (YouTube); null otherwise. */
  thumb: string | null;
}

export interface GalleryLabels {
  open: string;
  close: string;
  previous: string;
  next: string;
  counter: string; // "{n} / {total}" with placeholders
  credit: string; // "Foto: {name}"
  video: string;
}

/**
 * Photo grid with an accessible lightbox: Esc closes, ←/→ (or swipe) move,
 * focus returns to the thumbnail. Images load lazily; videos load only when opened.
 */
export function GalleryGrid({ items, labels, title }: { items: GalleryGridItem[]; labels: GalleryLabels; title: string }) {
  const [index, setIndex] = useState<number | null>(null);
  const triggers = useRef<Array<HTMLButtonElement | null>>([]);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const touchX = useRef<number | null>(null);

  const lastOpened = useRef<number | null>(null);
  const close = useCallback(() => setIndex(null), []);

  // Return focus to the thumbnail that opened the lightbox, once it has closed.
  useEffect(() => {
    if (index !== null) lastOpened.current = index;
    else if (lastOpened.current !== null) {
      triggers.current[lastOpened.current]?.focus();
      lastOpened.current = null;
    }
  }, [index]);
  const go = useCallback((delta: number) => setIndex((i) => (i === null ? i : (i + delta + items.length) % items.length)), [items.length]);

  useEffect(() => {
    if (index === null) return;
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "Tab") {
        // Keep focus inside the dialog.
        const nodes = Array.from(document.querySelectorAll<HTMLElement>("#gallery-lightbox button, #gallery-lightbox iframe, #gallery-lightbox video"));
        if (!nodes.length) return;
        const first = nodes[0]!;
        const last = nodes[nodes.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [index, close, go]);

  const current = index !== null ? items[index] : null;

  return (
    <>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:gap-3 lg:grid-cols-4">
        {items.map((it, i) => (
          <li key={it.id}>
            <button
              ref={(el) => {
                triggers.current[i] = el;
              }}
              type="button"
              onClick={() => setIndex(i)}
              className="group relative block aspect-square w-full overflow-hidden rounded-control bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ojetil-red"
            >
              <span className="sr-only">
                {labels.open}: {it.caption || it.altText || `${title} ${i + 1}`}
              </span>
              {it.kind === "IMAGE" ? (
                // eslint-disable-next-line @next/next/no-img-element -- already-resized WebP from the media library
                <img src={it.url} alt="" loading="lazy" decoding="async" className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
              ) : it.thumb ? (
                // eslint-disable-next-line @next/next/no-img-element -- YouTube thumbnail
                <img src={it.thumb} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" className="size-full object-cover" />
              ) : (
                <span className="flex size-full items-center justify-center text-ink-secondary">
                  <Film aria-hidden="true" className="size-10" strokeWidth={1.5} />
                </span>
              )}
              {it.kind !== "IMAGE" ? (
                <span className="absolute inset-0 flex items-center justify-center bg-ink/25">
                  <span className="flex size-12 items-center justify-center rounded-full bg-white/90 text-ink shadow">
                    <Play aria-hidden="true" className="ml-0.5 size-5" />
                  </span>
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>

      {current && index !== null ? (
        <div
          id="gallery-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="fixed inset-0 z-50 flex flex-col bg-ink/95 text-paper"
          onTouchStart={(e) => {
            touchX.current = e.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(e) => {
            const start = touchX.current;
            const end = e.changedTouches[0]?.clientX;
            if (start !== null && end !== undefined && Math.abs(end - start) > 50) go(end < start ? 1 : -1);
            touchX.current = null;
          }}
        >
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <p className="text-sm tabular-nums text-paper/80" aria-live="polite">
              {labels.counter.replace("{n}", String(index + 1)).replace("{total}", String(items.length))}
            </p>
            <button ref={closeBtn} type="button" onClick={close} className="inline-flex size-11 items-center justify-center rounded-full hover:bg-paper/10" title={labels.close}>
              <X aria-hidden="true" className="size-6" />
              <span className="sr-only">{labels.close}</span>
            </button>
          </div>

          <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 md:px-16" onClick={(e) => e.target === e.currentTarget && close()}>
            {current.kind === "IMAGE" ? (
              // eslint-disable-next-line @next/next/no-img-element -- full-size view
              <img key={current.id} src={current.url} alt={current.altText || current.caption || ""} className="max-h-full max-w-full object-contain" />
            ) : current.kind === "VIDEO" ? (
              <video key={current.id} src={current.url} controls playsInline preload="metadata" className="max-h-full max-w-full" aria-label={current.caption || labels.video} />
            ) : (
              <div className="aspect-video w-full max-w-5xl">
                <iframe
                  key={current.id}
                  src={current.url}
                  title={current.caption || labels.video}
                  allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                  className="size-full rounded-control"
                />
              </div>
            )}
            {items.length > 1 ? (
              <>
                <button type="button" onClick={() => go(-1)} className={cn(navBtn, "left-2 md:left-4")} title={labels.previous}>
                  <ChevronLeft aria-hidden="true" className="size-7" />
                  <span className="sr-only">{labels.previous}</span>
                </button>
                <button type="button" onClick={() => go(1)} className={cn(navBtn, "right-2 md:right-4")} title={labels.next}>
                  <ChevronRight aria-hidden="true" className="size-7" />
                  <span className="sr-only">{labels.next}</span>
                </button>
              </>
            ) : null}
          </div>

          <div className="min-h-16 px-4 pb-5 pt-3 text-center">
            {current.caption ? <p className="mx-auto max-w-3xl text-base">{current.caption}</p> : null}
            {current.credit ? <p className="mt-1 text-xs text-paper/60">{labels.credit.replace("{name}", current.credit)}</p> : null}
          </div>
        </div>
      ) : null}
    </>
  );
}

const navBtn = "absolute top-1/2 inline-flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-ink/60 text-paper hover:bg-ink/80";
