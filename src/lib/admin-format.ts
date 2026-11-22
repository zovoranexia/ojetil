import { APP_TIME_ZONE } from "@/lib/dates";

/** Backoffice date/time display: English, always in Díli time with the zone shown. */
const dateTimeFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: APP_TIME_ZONE,
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
const dateFmt = new Intl.DateTimeFormat("en-GB", { timeZone: APP_TIME_ZONE, day: "2-digit", month: "short", year: "numeric" });

export function adminDateTime(d: Date | null | undefined): string {
  return d ? `${dateTimeFmt.format(d)} OTL` : "—";
}

export function adminDate(d: Date | null | undefined): string {
  return d ? dateFmt.format(d) : "—";
}

/** Calendar date stored as @db.Date (UTC midnight) → "25 Apr 1969". */
export function adminCalendarDate(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" }).format(d);
}
