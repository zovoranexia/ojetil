import type { Locale } from "@prisma/client";
import { isAppLocale, toDbLocale, type AppLocale } from "@/config/locales";

/** Fallback order after the reader's own language. */
export const FALLBACK_LOCALES: readonly Locale[] = ["TET", "PT", "ID", "EN"];

/**
 * Picks the translation for `locale`, falling back to Tetun (the default),
 * then to the other languages in a fixed order (PT, ID, EN), so a page never
 * renders empty — including news written in only one language.
 */
export function pickTranslation<T extends { locale: Locale }>(translations: readonly T[], locale: AppLocale): T | null {
  const wanted = toDbLocale(locale);
  for (const l of [wanted, ...FALLBACK_LOCALES]) {
    const hit = translations.find((t) => t.locale === l);
    if (hit) return hit;
  }
  return null;
}

/** Translations to load for a request: the requested locale plus the Tetun fallback. */
export function translationLocales(locale: AppLocale): Locale[] {
  if (!isAppLocale(locale)) return ["TET"]; // defence in depth: never pass an unknown value to Prisma
  const wanted = toDbLocale(locale);
  return wanted === "TET" ? ["TET"] : [wanted, "TET"];
}
