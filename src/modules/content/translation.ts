import type { Locale } from "@prisma/client";
import { isAppLocale, toDbLocale, type AppLocale } from "@/config/locales";

/**
 * Picks the translation for `locale`, falling back to Tetun (the default),
 * then to any available translation, so a page never renders empty while an
 * editor finishes a locale.
 */
export function pickTranslation<T extends { locale: Locale }>(translations: readonly T[], locale: AppLocale): T | null {
  const wanted = toDbLocale(locale);
  return (
    translations.find((t) => t.locale === wanted) ??
    translations.find((t) => t.locale === "TET") ??
    translations[0] ??
    null
  );
}

/** Translations to load for a request: the requested locale plus the Tetun fallback. */
export function translationLocales(locale: AppLocale): Locale[] {
  if (!isAppLocale(locale)) return ["TET"]; // defence in depth: never pass an unknown value to Prisma
  const wanted = toDbLocale(locale);
  return wanted === "TET" ? ["TET"] : [wanted, "TET"];
}
