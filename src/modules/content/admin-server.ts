import "server-only";
import { Prisma, type AuditAction, type ContentStatus, type EventStatus } from "@prisma/client";
import { ActionError } from "@/lib/actions";
import { isEmptyArticleHtml, sanitizeArticleHtml } from "@/lib/content/sanitize";
import { msg } from "@/lib/i18n-message";
import type { TranslationFieldSpec } from "./admin-schema";

/**
 * Which audit actions a save represents: creation, publication changes,
 * or a plain update. Publishing is always recorded explicitly.
 */
export function contentAuditActions(previous: ContentStatus | null, next: ContentStatus): AuditAction[] {
  if (previous === null) return next === "PUBLISHED" ? ["CONTENT_CREATED", "CONTENT_PUBLISHED"] : ["CONTENT_CREATED"];
  if (previous !== "PUBLISHED" && next === "PUBLISHED") return ["CONTENT_PUBLISHED"];
  if (previous === "PUBLISHED" && next !== "PUBLISHED") return ["CONTENT_UNPUBLISHED"];
  return ["CONTENT_UPDATED"];
}

export function eventAuditActions(previous: EventStatus | null, next: EventStatus): AuditAction[] {
  if (previous === null) return next === "PUBLISHED" ? ["EVENT_CREATED", "EVENT_PUBLISHED"] : ["EVENT_CREATED"];
  if (previous !== "PUBLISHED" && next === "PUBLISHED") return ["EVENT_PUBLISHED"];
  if (previous !== "CANCELLED" && next === "CANCELLED") return ["EVENT_CANCELLED"];
  if (previous === "PUBLISHED" && next === "DRAFT") return ["EVENT_UNPUBLISHED"];
  return ["EVENT_UPDATED"];
}

/** Maps a unique-constraint violation on `slug` to a friendly field error. */
export function rethrowSlugConflict(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002" && String(error.meta?.target ?? "").includes("slug")) {
    throw new ActionError("CONFLICT", msg("admin.content.errors.slugConflict"), { slug: [msg("admin.content.errors.slugConflictField")] });
  }
  throw error;
}

/**
 * Sanitises every rich-text field of the translation rows (strict HTML
 * allowlist, see src/lib/content/sanitize.ts). An editor that is visually
 * empty counts as empty: required fields then fail validation, optional ones
 * are stored as null.
 */
export function sanitizeRichTranslations<R extends { locale: string } & Record<string, unknown>>(rows: R[], fields: readonly TranslationFieldSpec[]): R[] {
  const rich = fields.filter((f) => f.rich);
  if (!rich.length) return rows;
  const fieldErrors: Record<string, string[]> = {};
  const out = rows.map((row) => {
    const next: Record<string, unknown> = { ...row };
    for (const f of rich) {
      const raw = typeof row[f.name] === "string" ? (row[f.name] as string) : "";
      const clean = raw ? sanitizeArticleHtml(raw) : "";
      if (isEmptyArticleHtml(clean)) {
        if (f.required) {
          fieldErrors[`translations.${row.locale}.${f.name}`] = [row.locale === "TET" ? msg("admin.validation.requiredTetun") : msg("admin.validation.requiredOnceStarted")];
        }
        next[f.name] = f.required ? "" : null;
      } else {
        next[f.name] = clean;
      }
    }
    return next as R;
  });
  if (Object.keys(fieldErrors).length) throw new ActionError("VALIDATION", msg("admin.errors.validation"), fieldErrors);
  return out;
}
