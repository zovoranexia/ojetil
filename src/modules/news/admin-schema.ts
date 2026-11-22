import { z } from "zod";
import { MUNICIPALITY_VALUES } from "@/config/municipalities";
import { CONTENT_STATUSES, imageUrlField, slugField } from "@/modules/content/admin-common";
import { translationsSchema, type TranslationFieldSpec } from "@/modules/content/admin-schema";
import { NEWS_CATEGORY_VALUES } from "./categories";

/**
 * Per-language fields. `body` is rich-text HTML (sanitised on the server);
 * an empty editor submits "". Summary is optional: when left empty the server
 * derives it from the first sentences of the content.
 */
export const NEWS_TRANSLATION_FIELDS: readonly TranslationFieldSpec[] = [
  { name: "title", label: "Title", required: true, max: 200 },
  { name: "excerpt", label: "Summary", required: false, max: 400, multiline: true, rows: 3, hint: "One or two sentences shown on cards and in search results." },
  { name: "body", label: "Content", required: true, max: 300_000 },
  { name: "coverImageAlt", label: "Cover image description (alt text)", required: false, max: 200 },
];

export const NEWS_TAG_MAX = 12;
export const NEWS_TAG_MAX_LENGTH = 40;

/** "Youth, civic education , youth" → ["Youth", "civic education"] (trimmed, case-insensitive de-dup). */
export function parseTags(input: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input.split(",")) {
    const tag = raw.replace(/\s+/g, " ").trim().slice(0, NEWS_TAG_MAX_LENGTH);
    const key = tag.toLocaleLowerCase();
    if (!tag || seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
  }
  return out;
}

export const newsFormSchema = z.object({
  id: z.string().optional(),
  /** Empty = generated from the Tetun title. */
  slug: z.union([z.literal(""), slugField]),
  category: z.enum(NEWS_CATEGORY_VALUES, { error: "Choose a type." }),
  status: z.enum(CONTENT_STATUSES),
  /** Díli wall-clock "YYYY-MM-DDTHH:mm"; empty = the moment it is published. */
  publishedAt: z.string().trim(),
  isFeatured: z.boolean(),
  coverImageUrl: imageUrlField,
  /** "" = national scope. */
  municipality: z.union([z.literal(""), z.enum(MUNICIPALITY_VALUES)]),
  byline: z.string().trim().max(120, "Byline: at most 120 characters."),
  tags: z
    .string()
    .max(600)
    .refine((v) => parseTags(v).length <= NEWS_TAG_MAX, `At most ${NEWS_TAG_MAX} tags.`),
  /** "" = no attachment. */
  documentId: z.string().trim().max(40),
  translations: translationsSchema(NEWS_TRANSLATION_FIELDS),
});

export type NewsFormValues = z.input<typeof newsFormSchema>;
