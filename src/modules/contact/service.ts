import "server-only";
import type { ContactMessageStatus, Prisma } from "@prisma/client";
import { toDbLocale, type AppLocale } from "@/config/locales";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/security/guards";
import { recordAudit } from "@/modules/audit/service";
import type { ContactData } from "./schema";

/** Stores a message from the public form. The topic key is kept in `subject`. */
export async function createContactMessage(data: ContactData, locale: AppLocale): Promise<{ id: string }> {
  return db.contactMessage.create({
    data: { name: data.name, email: data.email, phone: data.phone ?? null, subject: data.topic, message: data.message, locale: toDbLocale(locale) },
    select: { id: true },
  });
}

/* ── Backoffice ───────────────────────────────────────────────────────────── */

const PAGE_SIZE = 25;

export async function listContactMessages(params: { status?: ContactMessageStatus; q?: string; page: number }) {
  const where: Prisma.ContactMessageWhereInput = {
    // Archived messages only appear when asked for explicitly.
    status: params.status ?? { not: "ARCHIVED" },
    ...(params.q
      ? {
          OR: [
            { name: { contains: params.q, mode: "insensitive" } },
            { email: { contains: params.q, mode: "insensitive" } },
            { message: { contains: params.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const total = await db.contactMessage.count({ where });
  const pageCount = Math.max(Math.ceil(total / PAGE_SIZE), 1);
  const page = Math.min(params.page, pageCount);
  const items = await db.contactMessage.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: { id: true, name: true, email: true, subject: true, message: true, status: true, locale: true, createdAt: true },
  });
  return { items, total, page, pageCount };
}

export async function countNewContactMessages(): Promise<number> {
  return db.contactMessage.count({ where: { status: "NEW" } });
}

/**
 * Opens a message. A NEW message becomes READ (audited) the first time a
 * member of the Secretariat opens it, so the inbox shows what still needs attention.
 */
export async function openContactMessage(id: string, user: SessionUser) {
  const message = await db.contactMessage.findUnique({ where: { id } });
  if (!message || message.status !== "NEW") return message;
  return db.$transaction(async (tx) => {
    const updated = await tx.contactMessage.update({ where: { id }, data: { status: "READ" } });
    await recordAudit({ action: "MESSAGE_STATUS_CHANGED", actor: user, target: { type: "ContactMessage", id }, metadata: { from: "NEW", to: "READ", auto: true } }, tx);
    return updated;
  });
}

export async function setContactMessageStatus(id: string, status: ContactMessageStatus, user: SessionUser): Promise<boolean> {
  return db.$transaction(async (tx) => {
    const current = await tx.contactMessage.findUnique({ where: { id }, select: { status: true } });
    if (!current) return false;
    if (current.status === status) return true;
    await tx.contactMessage.update({ where: { id }, data: { status } });
    await recordAudit({ action: "MESSAGE_STATUS_CHANGED", actor: user, target: { type: "ContactMessage", id }, metadata: { from: current.status, to: status } }, tx);
    return true;
  });
}

/** Permanent removal (e.g. spam, or a sender asking for their data to be erased). */
export async function deleteContactMessage(id: string, user: SessionUser): Promise<boolean> {
  return db.$transaction(async (tx) => {
    const current = await tx.contactMessage.findUnique({ where: { id }, select: { status: true, createdAt: true } });
    if (!current) return false;
    await tx.contactMessage.delete({ where: { id } });
    // No name/email in the audit trail: deletion may be an erasure request.
    await recordAudit({ action: "MESSAGE_DELETED", actor: user, target: { type: "ContactMessage", id }, metadata: { status: current.status, receivedAt: current.createdAt.toISOString() } }, tx);
    return true;
  });
}
