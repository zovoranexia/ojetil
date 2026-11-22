"use client";

import { ArrowUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** Focus target rendered at the very top of <body> in [locale]/layout.tsx. */
const PAGE_TOP_ID = "page-top";

/**
 * Floating "back to top" button for public pages. Appears once the reader has
 * scrolled about one screen, scrolls smoothly (instantly with reduced motion)
 * and then moves keyboard focus to the start of the page, so the next Tab lands
 * on the skip link instead of somewhere deep in the content.
 */
export function BackToTop() {
  const t = useTranslations("common");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // setState bails out when the value is unchanged, so this is cheap per scroll event.
    const update = () => setVisible(window.scrollY > window.innerHeight * 0.9);
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const scrollToTop = () => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    // preventScroll keeps the smooth scroll from being cut short by the focus jump.
    document.getElementById(PAGE_TOP_ID)?.focus({ preventScroll: true });
  };

  return (
    <button
      type="button"
      onClick={scrollToTop}
      title={t("backToTop")}
      className={cn(
        "fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-40 grid size-12 place-items-center rounded-full border border-gold-accent/50 bg-ink text-paper shadow-[0_8px_24px_-6px_rgb(24_24_27/0.5)] transition-[opacity,transform,visibility,background-color] duration-200 hover:bg-ojetil-red focus-visible:bg-ojetil-red md:bottom-6 md:right-6 print:hidden",
        visible ? "visible translate-y-0 opacity-100" : "invisible translate-y-3 opacity-0",
      )}
    >
      <ArrowUp aria-hidden="true" className="size-5" />
      <span className="sr-only">{t("backToTop")}</span>
    </button>
  );
}
