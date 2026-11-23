import type { MediaKind } from "@prisma/client";
import { z } from "zod";
import { MUNICIPALITY_VALUES } from "@/config/municipalities";
import { msg } from "@/lib/i18n-message";
import { slugField } from "@/modules/content/admin-common";
import { translationsSchema, type TranslationFieldSpec } from "@/modules/content/admin-schema";

/** Client-safe Gallery form rules (shared by the album editor and the server action). */
export const GALLERY_TRANSLATION_FIELDS: readonly TranslationFieldSpec[] = [
  { name: "title", label: msg("admin.gallery.fields.title"), required: true, max: 200 },
  { name: "description", label: msg("admin.gallery.fields.description"), required: false, max: 1000, multiline: true, rows: 3 },
];

/** Media kinds an album can hold. */
export const GALLERY_MEDIA_KINDS = ["IMAGE", "VIDEO", "VIDEO_LINK"] as const satisfies readonly MediaKind[];
export const GALLERY_MAX_ITEMS = 300;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
export function isValidIsoDate(v: string): boolean {
  if (!ISO_DATE.test(v)) return false;
  const [y, m, d] = v.split("-").map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export const galleryFormSchema = z.object({
  id: z.string().optional(),
  slug: slugField,
  takenOn: z.string().trim().refine((v) => v === "" || isValidIsoDate(v), msg("admin.gallery.validation.date")),
  municipality: z.union([z.enum(MUNICIPALITY_VALUES), z.literal("")]),
  eventId: z.string().trim().max(40),
  translations: translationsSchema(GALLERY_TRANSLATION_FIELDS, "any"),
  items: z
    .array(
      z.object({
        assetId: z.string().min(1).max(40),
        caption: z.string().trim().max(300, msg("admin.validation.maxChars", { max: 300 })),
      }),
    )
    .max(GALLERY_MAX_ITEMS, msg("admin.gallery.validation.tooMany", { max: GALLERY_MAX_ITEMS }))
    .refine((items) => new Set(items.map((i) => i.assetId)).size === items.length, msg("admin.gallery.validation.duplicate")),
});

export type GalleryFormValues = z.input<typeof galleryFormSchema>;
