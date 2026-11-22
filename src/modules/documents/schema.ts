import { z } from "zod";
import { slugField } from "@/modules/content/admin-common";
import { translationsSchema, type TranslationFieldSpec } from "@/modules/content/admin-schema";

/** Client-safe Documents form rules (shared by the editor and the API route). */
export const DOCUMENT_TRANSLATION_FIELDS: readonly TranslationFieldSpec[] = [
  { name: "title", label: "Title", required: true, max: 200 },
  { name: "description", label: "Description", required: false, max: 600, multiline: true, rows: 3, hint: "Optional. One or two sentences about the document." },
];

export const documentFormSchema = z.object({
  slug: slugField,
  translations: translationsSchema(DOCUMENT_TRANSLATION_FIELDS),
});

export type DocumentFormValues = z.input<typeof documentFormSchema>;

/** Public download path of a published document. */
export function documentDownloadPath(slug: string): string {
  return `/documents/${slug}.pdf`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}
