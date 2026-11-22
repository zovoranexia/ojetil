import type { DocumentCategory } from "@prisma/client";
import { z } from "zod";
import { msg } from "@/lib/i18n-message";
import { slugField } from "@/modules/content/admin-common";
import { translationsSchema, type TranslationFieldSpec } from "@/modules/content/admin-schema";

/** Client-safe Documents form rules (shared by the editor and the API route). */
export const DOCUMENT_TRANSLATION_FIELDS: readonly TranslationFieldSpec[] = [
  { name: "title", label: msg("admin.documents.fields.title"), required: true, max: 200 },
  { name: "description", label: msg("admin.documents.fields.description"), required: false, max: 600, multiline: true, rows: 3, hint: msg("admin.documents.fields.descriptionHint") },
];

/** Library groups, in the order the public filter shows them. */
export const DOCUMENT_CATEGORIES = ["STATUTE", "REPORT", "PRESS_RELEASE", "LETTER", "OTHER"] as const satisfies readonly DocumentCategory[];

export function isDocumentCategory(v: string | undefined | null): v is DocumentCategory {
  return (DOCUMENT_CATEGORIES as readonly string[]).includes(v ?? "");
}

export const documentFormSchema = z.object({
  slug: slugField,
  category: z.enum(DOCUMENT_CATEGORIES).default("OTHER"),
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
