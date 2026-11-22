import { LOCALE_META, type AppLocale } from "@/config/locales";
import { APP_TIME_ZONE, diliParts } from "@/lib/dates";

/**
 * Locale-aware formatting pinned to Asia/Dili. ICU has no Tetun calendar data,
 * so Tetun month and weekday names are supplied here; PT/ID/EN use Intl.
 * Client-safe (no server imports).
 */
const TET_MONTHS = [
  "Janeiru", "Fevereiru", "Marsu", "Abríl", "Maiu", "Juñu",
  "Jullu", "Agostu", "Setembru", "Outubru", "Novembru", "Dezembru",
] as const;
const TET_WEEKDAYS = ["Domingu", "Segunda", "Tersa", "Kuarta", "Kinta", "Sesta", "Sábadu"] as const;

const pad = (n: number) => String(n).padStart(2, "0");

export interface DateFormatOptions {
  weekday?: boolean;
  /** Include the year (default true). */
  year?: boolean;
}

/** "Sábadu, 5 Dezembru 2026" · "sábado, 5 de dezembro de 2026" · "Sabtu, 5 Desember 2026" · "Saturday 5 December 2026" */
export function formatDate(date: Date, locale: AppLocale, opts: DateFormatOptions = {}): string {
  const { weekday = false, year = true } = opts;
  if (locale === "tet") {
    const p = diliParts(date);
    const wd = TET_WEEKDAYS[new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay()]!;
    const core = `${p.day} ${TET_MONTHS[p.month - 1]}${year ? ` ${p.year}` : ""}`;
    return weekday ? `${wd}, ${core}` : core;
  }
  return new Intl.DateTimeFormat(LOCALE_META[locale].intl, {
    timeZone: APP_TIME_ZONE,
    day: "numeric",
    month: "long",
    ...(year ? { year: "numeric" } : {}),
    ...(weekday ? { weekday: "long" } : {}),
  }).format(date);
}

/** 24-hour Díli wall-clock time: "09:00" (Indonesian convention: "09.00"). */
export function formatTime(date: Date, locale: AppLocale): string {
  if (locale === "tet") {
    const p = diliParts(date);
    return `${pad(p.hour)}:${pad(p.minute)}`;
  }
  return new Intl.DateTimeFormat(LOCALE_META[locale].intl, {
    timeZone: APP_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

/** Same-day: "Sábadu, 5 Dezembru 2026 · 09:00–13:00"; multi-day: both full dates. */
export function formatDateTimeRange(start: Date, end: Date, locale: AppLocale): string {
  const s = diliParts(start);
  const e = diliParts(end);
  const sameDay = s.year === e.year && s.month === e.month && s.day === e.day;
  if (sameDay) {
    return `${formatDate(start, locale, { weekday: true })} · ${formatTime(start, locale)}–${formatTime(end, locale)}`;
  }
  return `${formatDate(start, locale, { weekday: true })} ${formatTime(start, locale)} – ${formatDate(end, locale, { weekday: true })} ${formatTime(end, locale)}`;
}

/** Calendar date without a time zone (historical dates): "12 Novembru 1991", "Janeiru 1990". */
export function formatCalendarDate(locale: AppLocale, year: number, month?: number | null, day?: number | null): string {
  if (!month) return String(year);
  if (locale === "tet") return day ? `${day} ${TET_MONTHS[month - 1]} ${year}` : `${TET_MONTHS[month - 1]} ${year}`;
  return new Intl.DateTimeFormat(LOCALE_META[locale].intl, {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    ...(day ? { day: "numeric" } : {}),
  }).format(new Date(Date.UTC(year, month - 1, day ?? 1)));
}

/** Compact date badge parts for event cards: { day: "05", month: "Dez" }. */
export function dateBadge(date: Date, locale: AppLocale): { day: string; month: string; year: string } {
  const p = diliParts(date);
  const month =
    locale === "tet"
      ? TET_MONTHS[p.month - 1]!.slice(0, 3)
      : new Intl.DateTimeFormat(LOCALE_META[locale].intl, { timeZone: APP_TIME_ZONE, month: "short" })
          .format(date)
          .replace(".", "");
  return { day: pad(p.day), month, year: String(p.year) };
}

export function formatNumber(value: number, locale: AppLocale): string {
  return new Intl.NumberFormat(LOCALE_META[locale].intl).format(value);
}

/** ISO 8601 for <time dateTime>. */
export function isoDate(date: Date): string {
  return date.toISOString();
}
