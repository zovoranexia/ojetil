"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { hasPermission } from "@/config/rbac";
import { ActionError, authorizedAction } from "@/lib/actions";
import { db } from "@/lib/db";
import { fromDiliLocalInput } from "@/lib/dates";
import { msg } from "@/lib/i18n-message";
import { recordAudit } from "@/modules/audit/service";
import { eventAuditActions, rethrowSlugConflict } from "@/modules/content/admin-server";
import { filledLocales, toTranslationRows } from "@/modules/content/admin-schema";
import { EVENT_TRANSLATION_FIELDS, attendanceSchema, eventFormSchema } from "./admin-schema";

type EventRow = { title: string; summary: string; description: string; locationDetails: string | null };

export const saveEvent = authorizedAction("events:write", eventFormSchema, async (input, user) => {
  if (input.status === "PUBLISHED" && !hasPermission(user.role, "events:publish")) {
    throw new ActionError("FORBIDDEN", msg("admin.events.validation.cannotPublish"));
  }
  const startAt = fromDiliLocalInput(input.startAt)!;
  const endAt = fromDiliLocalInput(input.endAt)!;
  const registrationDeadline = input.registrationDeadline ? fromDiliLocalInput(input.registrationDeadline) : null;
  const translations = toTranslationRows<keyof EventRow>(input.translations, EVENT_TRANSLATION_FIELDS) as Array<{ locale: "TET" | "PT" | "ID" | "EN" } & EventRow>;

  try {
    const saved = await db.$transaction(async (tx) => {
      // Same row lock the public registration takes, so the capacity check below can't race a sign-up.
      if (input.id) await tx.$queryRaw`SELECT "id" FROM "events" WHERE "id" = ${input.id} FOR UPDATE`;
      const previous = input.id
        ? await tx.event.findUnique({
            where: { id: input.id },
            select: { status: true, publishedAt: true, _count: { select: { registrations: { where: { status: { not: "CANCELLED" } } } } } },
          })
        : null;
      if (input.id && !previous) throw new ActionError("NOT_FOUND", msg("admin.events.validation.notFound"));
      if (previous && input.capacity < previous._count.registrations) {
        throw new ActionError("VALIDATION", msg("admin.events.validation.capacityBelow"), {
          capacity: [msg("admin.events.validation.capacityAtLeast", { count: previous._count.registrations })],
        });
      }

      const data = {
        slug: input.slug,
        type: input.type,
        status: input.status,
        startAt,
        endAt,
        location: input.location,
        municipality: input.municipality || null,
        isOnline: input.isOnline,
        onlineUrl: input.isOnline ? input.onlineUrl : null,
        capacity: input.capacity,
        registrationOpen: input.registrationOpen,
        registrationDeadline,
        coverImageUrl: input.coverImageUrl || null,
        publishedAt: input.status === "PUBLISHED" ? (previous?.publishedAt ?? new Date()) : (previous?.publishedAt ?? null),
      };
      const event = input.id
        ? await tx.event.update({ where: { id: input.id }, data: { ...data, translations: { deleteMany: {}, create: translations } }, select: { id: true } })
        : await tx.event.create({ data: { ...data, createdById: user.id, translations: { create: translations } }, select: { id: true } });

      for (const action of eventAuditActions(previous?.status ?? null, input.status)) {
        await recordAudit(
          {
            action,
            actor: user,
            target: { type: "Event", id: event.id },
            metadata: { slug: input.slug, title: translations[0]!.title, locales: filledLocales(input.translations, EVENT_TRANSLATION_FIELDS), status: input.status },
          },
          tx,
        );
      }
      return event;
    });
    revalidatePath("/admin/acara");
    return { id: saved.id };
  } catch (error) {
    if (error instanceof ActionError) throw error;
    rethrowSlugConflict(error);
  }
});

/** Events with attendees cannot be deleted — cancel them instead so attendees' tickets stay traceable. */
export const deleteEvent = authorizedAction("events:write", z.object({ id: z.string().min(1) }), async ({ id }, user) => {
  await db.$transaction(async (tx) => {
    const event = await tx.event.findUnique({ where: { id }, select: { slug: true, _count: { select: { registrations: true } } } });
    if (!event) throw new ActionError("NOT_FOUND", msg("admin.events.validation.notFound"));
    if (event._count.registrations > 0) {
      throw new ActionError("CONFLICT", msg("admin.events.validation.hasRegistrations", { count: event._count.registrations }));
    }
    await tx.event.delete({ where: { id } });
    await recordAudit({ action: "EVENT_DELETED", actor: user, target: { type: "Event", id }, metadata: { slug: event.slug } }, tx);
  });
  revalidatePath("/admin/acara");
  return { id };
});

/** Check-in / cancel an attendee. */
export const updateAttendance = authorizedAction("events:write", attendanceSchema, async ({ registrationId, status }, user) => {
  const result = await db.$transaction(async (tx) => {
    const reg = await tx.eventRegistration.findUnique({ where: { id: registrationId }, select: { status: true, ticketCode: true, eventId: true } });
    if (!reg) throw new ActionError("NOT_FOUND", msg("admin.events.validation.registrationNotFound"));
    if (reg.status === status) return { eventId: reg.eventId, status };

    // Re-activating a cancelled registration takes a seat: enforce capacity under the event row lock.
    if (reg.status === "CANCELLED") {
      const [event] = await tx.$queryRaw<Array<{ capacity: number }>>`
        SELECT "capacity" FROM "events" WHERE "id" = ${reg.eventId} FOR UPDATE`;
      const taken = await tx.eventRegistration.count({ where: { eventId: reg.eventId, status: { not: "CANCELLED" } } });
      if (event && taken >= event.capacity) {
        throw new ActionError("CONFLICT", msg("admin.events.validation.eventFull", { taken, capacity: event.capacity }));
      }
    }
    await tx.eventRegistration.update({
      where: { id: registrationId },
      data: { status, checkedInAt: status === "ATTENDED" ? new Date() : null },
    });
    await recordAudit(
      {
        action: "EVENT_ATTENDANCE_UPDATED",
        actor: user,
        target: { type: "EventRegistration", id: registrationId },
        metadata: { ticketCode: reg.ticketCode, eventId: reg.eventId, from: reg.status, to: status },
      },
      tx,
    );
    return { eventId: reg.eventId, status };
  });
  revalidatePath(`/admin/acara/${result.eventId}/peserta`);
  return result;
});
