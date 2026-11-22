import type { Locale } from "@prisma/client";

/** One value per database locale. Using a Record makes a missing translation a type error. */
export type L10n<T> = Record<Locale, T>;

export const SEED_LOCALES: readonly Locale[] = ["TET", "PT", "ID", "EN"];

/** Expands an L10n record into Prisma `createMany`-style rows. */
export function translationRows<T extends object>(content: L10n<T>): Array<T & { locale: Locale }> {
  return SEED_LOCALES.map((locale) => ({ locale, ...content[locale] }));
}

export function log(step: string, detail: string): void {
  console.log(`  ✔ ${step.padEnd(22)} ${detail}`);
}
