"use client";

import { useLocale, useTranslations } from "next-intl";
import type { MouseEvent } from "react";
import { LOCALES, LOCALE_META, type AppLocale } from "@/config/locales";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/**
 * TET | PT | ID | EN — always visible in the top bar (never hidden in the
 * mobile menu). Keeps the visitor on the equivalent page in the new language,
 * including the query string (search terms, filters, page, pre-filled codes).
 *
 * The href is the plain path (works without JavaScript); on click the current
 * query is read from the address bar, so it is always up to date even after
 * client-side filter changes. (A useSearchParams-based version inside the shared
 * layout left its Suspense fallback on screen and lost the query.)
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  function switchTo(event: MouseEvent<HTMLAnchorElement>, target: AppLocale) {
    const search = window.location.search;
    // Let modified clicks (new tab/window) and query-less pages use the plain link.
    if (!search || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    router.push({ pathname, query: Object.fromEntries(new URLSearchParams(search)) }, { locale: target });
  }

  return (
    <nav aria-label={t("language")} className={cn("flex items-center", className)}>
      <ul className="flex items-center">
        {LOCALES.map((l, i) => {
          const active = l === locale;
          return (
            <li key={l} className="flex items-center">
              {i > 0 ? (
                <span aria-hidden="true" className="text-paper/30">
                  |
                </span>
              ) : null}
              <Link
                href={pathname}
                locale={l}
                hrefLang={l}
                lang={l}
                onClick={(e) => switchTo(e, l)}
                aria-current={active ? "true" : undefined}
                title={LOCALE_META[l].nativeName}
                className={cn(
                  "relative inline-flex min-h-tap min-w-tap items-center justify-center px-1.5 text-[0.8125rem] font-semibold tracking-wide transition-colors",
                  active ? "text-gold-accent" : "text-paper/80 hover:text-paper",
                )}
              >
                <span className="sr-only">{LOCALE_META[l].nativeName} — </span>
                {LOCALE_META[l].short}
                {active ? <span aria-hidden="true" className="absolute inset-x-2 bottom-2 h-0.5 bg-gold-accent" /> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
