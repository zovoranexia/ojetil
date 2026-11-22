import { z } from "zod";
import { CONTENT_STATUSES, imageUrlField, slugField } from "@/modules/content/admin-common";
import { translationsSchema, type TranslationFieldSpec } from "@/modules/content/admin-schema";
import { NEWS_CATEGORY_VALUES } from "./categories";

export const NEWS_TRANSLATION_FIELDS: readonly TranslationFieldSpec[] = [
  { name: "title", label: "Title", required: true, max: 200 },
  { name: "excerpt", label: "Summary", required: true, max: 400, multiline: true, rows: 3, hint: "One or two sentences shown on cards and in search results." },
  {
    name: "body",
    label: "Article body",
    required: true,
    max: 20000,
    multiline: true,
    rows: 14,
    hint: "Markdown: blank line between paragraphs, ## heading, **bold**, *italic*, “- ” for lists.",
  },
  { name: "coverImageAlt", label: "Cover image description (alt text)", required: false, max: 200 },
];

export const newsFormSchema = z.object({
  id: z.string().optional(),
  slug: slugField,
  category: z.enum(NEWS_CATEGORY_VALUES, { error: "Choose a category." }),
  status: z.enum(CONTENT_STATUSES),
  /** Díli wall-clock "YYYY-MM-DDTHH:mm"; empty = now when publishing. */
  publishedAt: z.string().trim(),
  isFeatured: z.boolean(),
  coverImageUrl: imageUrlField,
  translations: translationsSchema(NEWS_TRANSLATION_FIELDS),
});

export type NewsFormValues = z.input<typeof newsFormSchema>;
