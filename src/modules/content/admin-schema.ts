import type { Locale } from "@prisma/client";
import { z } from "zod";
import { msg } from "@/lib/i18n-message";

/** Client-safe helpers shared by every multilingual CMS editor. */
export const CONTENT_LOCALES = ["TET", "PT", "ID", "EN"] as const satisfies readonly Locale[];
export type ContentLocale = (typeof CONTENT_LOCALES)[number];

export const LOCALE_TAB_LABELS: Record<ContentLocale, string> = { TET: "TET", PT: "PT", ID: "ID", EN: "EN" };

export interface TranslationFieldSpec {
  name: string;
  /** `msg()`-encoded message key, e.g. msg("admin.news.fields.title"). */
  label: string;
  required: boolean;
  max: number;
  multiline?: boolean;
  rows?: number;
  /** `msg()`-encoded message key. */
  hint?: string;
}

export type TranslationValues = Record<ContentLocale, Record<string, string>>;

/**
 * Validation rules:
 *  • Tetun (default locale) must be complete;
 *  • other locales are optional, but once any field is filled, every required
 *    field in that locale must be filled (no half-translated pages).
 */
export function translationsSchema(fields: readonly TranslationFieldSpec[]) {
  const localeShape = Object.fromEntries(
    fields.map((f) => [f.name, z.string().trim().max(f.max, msg("admin.validation.maxChars", { max: f.max }))]),
  ) as Record<string, z.ZodString>;

  return z
    .object(Object.fromEntries(CONTENT_LOCALES.map((l) => [l, z.object(localeShape)])) as Record<ContentLocale, z.ZodObject<Record<string, z.ZodString>>>)
    .superRefine((value, ctx) => {
      for (const locale of CONTENT_LOCALES) {
        const v = value[locale] as Record<string, string>;
        const started = fields.some((f) => (v[f.name] ?? "").trim() !== "");
        if (locale !== "TET" && !started) continue;
        for (const f of fields) {
          if (f.required && (v[f.name] ?? "").trim() === "") {
            ctx.addIssue({
              code: "custom",
              path: [locale, f.name],
              message: locale === "TET" ? msg("admin.validation.requiredTetun") : msg("admin.validation.requiredOnceStarted"),
            });
          }
        }
      }
    });
}

/** Form values → Prisma translation rows (skipping untouched optional locales). */
export function toTranslationRows<K extends string>(
  values: Record<ContentLocale, Record<string, string>>,
  fields: readonly TranslationFieldSpec[],
): Array<{ locale: ContentLocale } & Record<K, string | null>> {
  return CONTENT_LOCALES.filter((l) => l === "TET" || fields.some((f) => (values[l][f.name] ?? "").trim() !== "")).map((locale) => {
    const row: Record<string, string | null> = {};
    for (const f of fields) {
      const v = (values[locale][f.name] ?? "").trim();
      row[f.name] = v === "" && !f.required ? null : v;
    }
    return { locale, ...row } as { locale: ContentLocale } & Record<K, string | null>;
  });
}

/** Prisma translation rows → form default values (empty strings for missing locales). */
export function fromTranslationRows(
  rows: ReadonlyArray<{ locale: Locale } & Record<string, unknown>>,
  fields: readonly TranslationFieldSpec[],
): TranslationValues {
  const out = Object.fromEntries(CONTENT_LOCALES.map((l) => [l, Object.fromEntries(fields.map((f) => [f.name, ""]))])) as TranslationValues;
  for (const row of rows) {
    for (const f of fields) {
      const v = row[f.name];
      out[row.locale as ContentLocale][f.name] = typeof v === "string" ? v : "";
    }
  }
  return out;
}

export function emptyTranslations(fields: readonly TranslationFieldSpec[]): TranslationValues {
  return fromTranslationRows([], fields);
}

/** Locales that have content, for audit metadata. */
export function filledLocales(values: TranslationValues, fields: readonly TranslationFieldSpec[]): ContentLocale[] {
  return CONTENT_LOCALES.filter((l) => fields.some((f) => (values[l][f.name] ?? "").trim() !== ""));
}
