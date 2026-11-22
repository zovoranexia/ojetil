import type { AppLocale } from "@/config/locales";
import { APP_TIME_ZONE } from "@/lib/dates";

/**
 * Backoffice date/time display, always in Díli time with the zone shown, as
 * DD/MM/YYYY and 24-hour HH:MM in every UI language. The `locale` parameter is
 * kept for call-site compatibility (and possible future wording).
 */
const cache = new Map<string, Intl.DateTimeFormat>();
function fmt(locale: AppLocale, kind: "dateTime" | "date" | "calendar"): Intl.DateTimeFormat {
  const key = `${locale}:${kind}`;
  let f = cache.get(key);
  if (!f) {
    // Always DD/MM/YYYY and a 24-hour HH:MM clock, whatever the UI language
    // (e.g. id-ID would print "01 Des 2026, 21.30"). en-GB yields exactly that.
    const base = { day: "2-digit", month: "2-digit", year: "numeric" } as const;
    f = new Intl.DateTimeFormat("en-GB", {
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

/** Calendar date stored as @db.Date (UTC midnight) → "25/04/1969". */
export function adminCalendarDate(d: Date, locale: AppLocale = "en"): string {
  return fmt(locale, "calendar").format(d);
}
