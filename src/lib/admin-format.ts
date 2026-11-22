import { LOCALE_META, type AppLocale } from "@/config/locales";
import { APP_TIME_ZONE } from "@/lib/dates";

/**
 * Backoffice date/time display, always in Díli time with the zone shown.
 * Pass the UI locale (`getLocale()` / `useLocale()`); defaults to English, which
 * CSV exports keep using so files stay comparable. Tetun uses the pt-TL
 * baseline (ICU has no Tetum data), as on the public site.
 */
const cache = new Map<string, Intl.DateTimeFormat>();
function fmt(locale: AppLocale, kind: "dateTime" | "date" | "calendar"): Intl.DateTimeFormat {
  const key = `${locale}:${kind}`;
  let f = cache.get(key);
  if (!f) {
    const base = { day: "2-digit", month: "short", year: "numeric" } as const;
    f = new Intl.DateTimeFormat(LOCALE_META[locale].intl, {
      ...base,
      timeZone: kind === "calendar" ? "UTC" : APP_TIME_ZONE,
      ...(kind === "dateTime" ? { hour: "2-digit", minute: "2-digit", hourCycle: "h23" } : {}),
    });
    cache.set(key, f);
  }
  return f;
}

export function adminDateTime(d: Date | null | undefined, locale: AppLocale = "en"): string {
  return d ? `${fmt(locale, "dateTime").format(d)} OTL` : "—";
}

export function adminDate(d: Date | null | undefined, locale: AppLocale = "en"): string {
  return d ? fmt(locale, "date").format(d) : "—";
}

/** Calendar date stored as @db.Date (UTC midnight) → "25 Apr 1969". */
export function adminCalendarDate(d: Date, locale: AppLocale = "en"): string {
  return fmt(locale, "calendar").format(d);
}
