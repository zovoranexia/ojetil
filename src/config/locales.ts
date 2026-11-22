/**
 * Locale registry. Safe to import from client components (no server deps).
 * Order here is the order shown in the language switcher: TET | PT | ID | EN.
 */
export const LOCALES = ["tet", "pt", "id", "en"] as const;
export type AppLocale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "tet";

export const LOCALE_META: Record<
  AppLocale,
  { short: string; nativeName: string; /** BCP-47 tag used for Intl number/date formatting. */ intl: string }
> = {
  // ICU has no Tetum date data; Portuguese (Timor-Leste) is the closest formatting
  // baseline. Tetum month/day names are supplied from the message catalogue.
  tet: { short: "TET", nativeName: "Tetun", intl: "pt-TL" },
  pt: { short: "PT", nativeName: "Português", intl: "pt-TL" },
  id: { short: "ID", nativeName: "Bahasa Indonesia", intl: "id-ID" },
  en: { short: "EN", nativeName: "English", intl: "en-GB" },
};

export function isAppLocale(value: unknown): value is AppLocale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Prisma `Locale` enum values are upper-case (TET, PT, ID, EN) and map to lower-case DB labels. */
export type DbLocale = Uppercase<AppLocale>;

export function toDbLocale(locale: AppLocale): DbLocale {
  return locale.toUpperCase() as DbLocale;
}

export function fromDbLocale(locale: DbLocale): AppLocale {
  return locale.toLowerCase() as AppLocale;
}
