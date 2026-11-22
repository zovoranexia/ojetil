import type { DatePrecision } from "@prisma/client";
import type { AppLocale } from "@/config/locales";
import { formatCalendarDate } from "@/lib/format";

/** "1980s" / "12 Novembru 1991" / "Janeiru 1990" / "1998", honouring the recorded precision. */
export function milestoneLabel(
  m: { year: number; month: number | null; day: number | null; datePrecision: DatePrecision },
  locale: AppLocale,
  decade: (year: number) => string,
): string {
  switch (m.datePrecision) {
    case "DECADE":
      return decade(Math.floor(m.year / 10) * 10);
    case "YEAR":
      return String(m.year);
    case "MONTH":
      return formatCalendarDate(locale, m.year, m.month);
    case "DAY":
      return formatCalendarDate(locale, m.year, m.month, m.day);
  }
}

/** Short year marker for the timeline rail: "1980s" or "1991". */
export function milestoneYear(m: { year: number; datePrecision: DatePrecision }, decade: (year: number) => string): string {
  return m.datePrecision === "DECADE" ? decade(Math.floor(m.year / 10) * 10) : String(m.year);
}
