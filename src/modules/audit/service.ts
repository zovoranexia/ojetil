import type { AuditAction, AuditCategory, Prisma, PrismaClient, Role } from "@prisma/client";
import { hasPermission } from "@/config/rbac";
import { db } from "@/lib/db";
import { getRequestContext, type RequestContext } from "@/lib/request-context";
import { ForbiddenError } from "@/lib/security/permissions";

/**
 * Append-only audit trail. Every sensitive action (PII views, status changes,
 * exports, publishing, role changes, logins) goes through `recordAudit`.
 * The database trigger guarantees entries can never be edited or removed.
 */

/** Exhaustive: adding an AuditAction without a category is a type error. */
export const AUDIT_ACTION_CATEGORY: Record<AuditAction, AuditCategory> = {
  LOGIN_SUCCEEDED: "AUTH",
  LOGIN_FAILED: "AUTH",
  LOGOUT: "AUTH",
  ACCOUNT_LOCKED: "AUTH",
  MEMBER_PII_VIEWED: "VERIFICATION",
  MEMBER_STATUS_CHANGED: "VERIFICATION",
  MEMBER_EXPORTED: "VERIFICATION",
  CONTENT_CREATED: "CONTENT",
  CONTENT_UPDATED: "CONTENT",
  CONTENT_PUBLISHED: "CONTENT",
  CONTENT_UNPUBLISHED: "CONTENT",
  CONTENT_DELETED: "CONTENT",
  MEDIA_UPLOADED: "CONTENT",
  MEDIA_UPDATED: "CONTENT",
  MEDIA_DELETED: "CONTENT",
  EVENT_CREATED: "EVENTS",
  EVENT_UPDATED: "EVENTS",
  EVENT_PUBLISHED: "EVENTS",
  EVENT_UNPUBLISHED: "EVENTS",
  EVENT_CANCELLED: "EVENTS",
  EVENT_DELETED: "EVENTS",
  EVENT_ATTENDEES_EXPORTED: "EVENTS",
  EVENT_ATTENDANCE_UPDATED: "EVENTS",
  USER_CREATED: "USERS",
  USER_ROLE_CHANGED: "USERS",
  USER_DEACTIVATED: "USERS",
  USER_REACTIVATED: "USERS",
  USER_PASSWORD_RESET: "USERS",
  USER_PASSWORD_CHANGED: "USERS",
  SEED_EXECUTED: "SYSTEM",
};

/** Who performed the action. `null` for anonymous/public or system actions. */
export interface AuditActor {
  id: string;
  email: string;
  role: Role;
}

export interface AuditEntryInput {
  action: AuditAction;
  actor: AuditActor | null;
  target?: { type: string; id: string };
  metadata?: Prisma.InputJsonObject;
  /** Override request context (e.g. inside Auth.js callbacks that receive a Request). */
  context?: RequestContext;
}

type Client = PrismaClient | Prisma.TransactionClient;

/*
 * Defence in depth: decrypted PII must never be written to the audit trail.
 * Metadata keys that name a sensitive field are rejected outright.
 */
const FORBIDDEN_METADATA_KEYS = new Set([
  "address",
  "phone",
  "phonenumber",
  "nationalid",
  "bi",
  "password",
  "passwordhash",
  "ciphertext",
  "secret",
  "token",
]);

export class AuditMetadataError extends Error {
  override name = "AuditMetadataError";
}

function assertNoSensitiveKeys(value: unknown, path = "metadata"): void {
  if (Array.isArray(value)) {
    value.forEach((v, i) => assertNoSensitiveKeys(v, `${path}[${i}]`));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, v] of Object.entries(value)) {
      if (FORBIDDEN_METADATA_KEYS.has(key.toLowerCase().replace(/[_-]/g, ""))) {
        throw new AuditMetadataError(`Audit ${path}.${key} looks like sensitive data and is not allowed.`);
      }
      assertNoSensitiveKeys(v, `${path}.${key}`);
    }
  }
}

/**
 * Append one audit entry. Pass a transaction client to make the audit record
 * atomic with the change it describes.
 */
export async function recordAudit(input: AuditEntryInput, client: Client = db): Promise<void> {
  if (input.metadata) assertNoSensitiveKeys(input.metadata);
  const ctx = input.context ?? (await getRequestContext());

  await client.auditLog.create({
    data: {
      action: input.action,
      category: AUDIT_ACTION_CATEGORY[input.action],
      actorId: input.actor?.id ?? null,
      actorEmail: input.actor?.email ?? null,
      actorRole: input.actor?.role ?? null,
      targetType: input.target?.type ?? null,
      targetId: input.target?.id ?? null,
      metadata: input.metadata,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    },
  });
}

/**
 * Which audit entries a role may read:
 *  SUPER_ADMIN / VIEWER → everything · VERIFIER → VERIFICATION only · EDITOR → none.
 */
export function auditVisibilityFilter(role: Role): Prisma.AuditLogWhereInput {
  if (hasPermission(role, "audit:read:all")) return {};
  if (hasPermission(role, "audit:read:verification")) return { category: "VERIFICATION" };
  throw new ForbiddenError({ anyOf: ["audit:read:all", "audit:read:verification"] });
}

export interface AuditQuery {
  category?: AuditCategory;
  action?: AuditAction;
  actorId?: string;
  /** Case-insensitive substring of the actor email snapshot. */
  actorEmail?: string;
  targetType?: string;
  targetId?: string;
  /** Inclusive lower bound. */
  from?: Date;
  /** Exclusive upper bound (e.g. the start of the day after the last day wanted). */
  to?: Date;
  page?: number;
  pageSize?: number;
}

/** Paginated, role-scoped audit log listing (newest first). */
export async function listAuditLogs(role: Role, query: AuditQuery = {}) {
  const visibility = auditVisibilityFilter(role);
  const pageSize = Math.min(Math.max(query.pageSize ?? 50, 1), 200);
  const page = Math.max(query.page ?? 1, 1);

  const where: Prisma.AuditLogWhereInput = {
    AND: [
      visibility,
      query.category ? { category: query.category } : {},
      query.action ? { action: query.action } : {},
      query.actorId ? { actorId: query.actorId } : {},
      query.actorEmail ? { actorEmail: { contains: query.actorEmail, mode: "insensitive" as const } } : {},
      query.targetType ? { targetType: query.targetType } : {},
      query.targetId ? { targetId: query.targetId } : {},
      query.from || query.to ? { createdAt: { gte: query.from, lt: query.to } } : {},
    ],
  };

  const [total, items] = await db.$transaction([
    db.auditLog.count({ where }),
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        action: true,
        category: true,
        actorId: true,
        actorEmail: true,
        actorRole: true,
        targetType: true,
        targetId: true,
        metadata: true,
        ipAddress: true,
        createdAt: true,
      },
    }),
  ]);

  return { items, total, page, pageSize, pageCount: Math.max(Math.ceil(total / pageSize), 1) };
}
