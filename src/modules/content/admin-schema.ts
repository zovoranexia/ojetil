import type { Locale } from "@prisma/client";
import { z } from "zod";
import { looksLikeHtml, markdownToHtml } from "@/lib/content/markdown-to-html";
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
  /** Rich-text (TipTap) field: value is HTML, sanitised on the server. */
  rich?: boolean;
}

export type TranslationValues = Record<ContentLocale, Record<string, string>>;

/**
 * Which languages must be present:
 *  • "tetun" (default): Tetun must be complete; other locales are optional;
 *  • "any": at least one locale must be complete — any of the four (news).
 * In both modes a started locale must have every required field filled
 * (no half-translated pages).
 */
export type TranslationRequirement = "tetun" | "any";

export function translationsSchema(fields: readonly TranslationFieldSpec[], requirement: TranslationRequirement = "tetun") {
  const localeShape = Object.fromEntries(
    fields.map((f) => [f.name, z.string().trim().max(f.max, msg("admin.validation.maxChars", { max: f.max }))]),
  ) as Record<string, z.ZodString>;

  return z
    .object(Object.fromEntries(CONTENT_LOCALES.map((l) => [l, z.object(localeShape)])) as Record<ContentLocale, z.ZodObject<Record<string, z.ZodString>>>)
    .superRefine((value, ctx) => {
      const isStarted = (locale: ContentLocale) => fields.some((f) => ((value[locale] as Record<string, string>)[f.name] ?? "").trim() !== "");
      if (requirement === "any" && !CONTENT_LOCALES.some(isStarted)) {
        const first = fields.find((f) => f.required) ?? fields[0]!;
        ctx.addIssue({ code: "custom", path: ["TET", first.name], message: msg("admin.validation.requiredAnyLanguage") });
        return;
      }
      for (const locale of CONTENT_LOCALES) {
        const v = value[locale] as Record<string, string>;
        const started = isStarted(locale);
        if ((requirement === "any" || locale !== "TET") && !started) continue;
        for (const f of fields) {
          if (f.required && (v[f.name] ?? "").trim() === "") {
            ctx.addIssue({
              code: "custom",
              path: [locale, f.name],
              message: locale === "TET" && requirement === "tetun" ? msg("admin.validation.requiredTetun") : msg("admin.validation.requiredOnceStarted"),
            });
          }
        }
      }
    });
}

/** Form values → Prisma translation rows (skipping untouched optional locales; Tetun too in "any" mode). */
export function toTranslationRows<K extends string>(
  values: Record<ContentLocale, Record<string, string>>,
  fields: readonly TranslationFieldSpec[],
  requirement: TranslationRequirement = "tetun",
): Array<{ locale: ContentLocale } & Record<K, string | null>> {
  return CONTENT_LOCALES.filter((l) => (l === "TET" && requirement === "tetun") || fields.some((f) => (values[l][f.name] ?? "").trim() !== "")).map((locale) => {
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
      const s = typeof v === "string" ? v : "";
      // Rich-text fields: legacy Markdown opens in the editor as equivalent HTML.
      out[row.locale as ContentLocale][f.name] = f.rich && s && !looksLikeHtml(s) ? markdownToHtml(s) : s;
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
