import type { ContentStatus } from "@prisma/client";
import { z } from "zod";
import { SLUG_PATTERN } from "@/lib/slug";
import { msg } from "@/lib/i18n-message";

/** Client-safe field rules shared by CMS forms and their server actions. */
export const slugField = z
  .string()
  .trim()
  .min(3, msg("admin.validation.slugMin"))
  .max(96, msg("admin.validation.slugMax"))
  .regex(SLUG_PATTERN, msg("admin.validation.slugPattern"));

/** Optional image URL: a site path ("/uploads/…") or an https URL. */
export const imageUrlField = z
  .string()
  .trim()
  .max(500, msg("admin.validation.maxChars", { max: 500 }))
  .refine((v) => v === "" || v.startsWith("/") || /^https:\/\/[^\s]+$/.test(v), msg("admin.validation.imageUrl"));

export const CONTENT_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const satisfies readonly ContentStatus[];
