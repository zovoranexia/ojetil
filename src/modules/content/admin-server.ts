import "server-only";
import { Prisma, type AuditAction, type ContentStatus, type EventStatus } from "@prisma/client";
import { ActionError } from "@/lib/actions";

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
    throw new ActionError("CONFLICT", "That slug is already used.", { slug: ["That slug is already used by another item."] });
  }
  throw error;
}
