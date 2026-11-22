import type { ContentStatus } from "@prisma/client";
import { z } from "zod";
import { SLUG_PATTERN } from "@/lib/slug";

/** Client-safe field rules shared by CMS forms and their server actions. */
export const slugField = z
  .string()
  .trim()
  .min(3, "Slug must be at least 3 characters.")
  .max(96, "Slug is too long.")
  .regex(SLUG_PATTERN, "Use lowercase letters, numbers and single hyphens only.");

/** Optional image URL: a site path ("/uploads/…") or an https URL. */
export const imageUrlField = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || v.startsWith("/") || /^https:\/\/[^\s]+$/.test(v), "Use a site path starting with / or an https:// URL.");

export const CONTENT_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const satisfies readonly ContentStatus[];
