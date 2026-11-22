import "server-only";
import type { AttendeeStatus, EventStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { toDiliLocalInput } from "@/lib/dates";
import { fromTranslationRows } from "@/modules/content/admin-schema";
import { EVENT_TRANSLATION_FIELDS, type EventFormValues } from "./admin-schema";

export async function listEventsAdmin(params: { status?: EventStatus; scope?: "upcoming" | "past" }) {
  const now = new Date();
  const rows = await db.event.findMany({
    where: {
      ...(params.status ? { status: params.status } : {}),
      ...(params.scope === "upcoming" ? { endAt: { gt: now } } : params.scope === "past" ? { endAt: { lte: now } } : {}),
    },
    orderBy: { startAt: params.scope === "past" ? "desc" : "asc" },
    select: {
      id: true,
      slug: true,
      type: true,
      status: true,
      startAt: true,
      endAt: true,
      location: true,
      isOnline: true,
      capacity: true,
      translations: { select: { locale: true, title: true } },
      _count: { select: { registrations: { where: { status: { not: "CANCELLED" } } } } },
    },
  });
  return rows.map((r) => ({
    ...r,
    title: r.translations.find((t) => t.locale === "TET")?.title ?? r.slug,
    registered: r._count.registrations,
    isPast: r.endAt <= now,
  }));
}

export async function getEventForEdit(id: string): Promise<(EventFormValues & { registered: number; totalRegistrations: number }) | null> {
  const e = await db.event.findUnique({
    where: { id },
    include: { translations: true, _count: { select: { registrations: { where: { status: { not: "CANCELLED" } } } } } },
  });
  if (!e) return null;
  // Deletion is blocked by ANY registration (cancelled ones included) so tickets stay traceable.
  const totalRegistrations = await db.eventRegistration.count({ where: { eventId: id } });
  return {
    id: e.id,
    slug: e.slug,
    type: e.type,
    status: e.status,
    startAt: toDiliLocalInput(e.startAt),
    endAt: toDiliLocalInput(e.endAt),
    location: e.location,
    municipality: e.municipality ?? "",
    isOnline: e.isOnline,
    onlineUrl: e.onlineUrl ?? "",
    capacity: e.capacity,
    registrationOpen: e.registrationOpen,
    registrationDeadline: toDiliLocalInput(e.registrationDeadline),
    coverImageUrl: e.coverImageUrl ?? "",
    translations: fromTranslationRows(e.translations, EVENT_TRANSLATION_FIELDS),
    registered: e._count.registrations,
    totalRegistrations,
  };
}

export async function getEventAttendees(eventId: string, params: { q?: string; status?: AttendeeStatus }) {
  const event = await db.event.findUnique({
    where: { id: eventId },
    select: { id: true, slug: true, capacity: true, startAt: true, endAt: true, translations: { select: { locale: true, title: true } } },
  });
  if (!event) return null;
  const where: Prisma.EventRegistrationWhereInput = {
    eventId,
    ...(params.status ? { status: params.status } : {}),
    ...(params.q
      ? {
          OR: [
            { fullName: { contains: params.q, mode: "insensitive" } },
            { email: { contains: params.q, mode: "insensitive" } },
            { ticketCode: { contains: params.q.toUpperCase() } },
          ],
        }
      : {}),
  };
  const [attendees, counts] = await Promise.all([
    db.eventRegistration.findMany({
      where,
      orderBy: [{ status: "asc" }, { fullName: "asc" }],
      select: { id: true, ticketCode: true, fullName: true, email: true, phone: true, institution: true, municipality: true, status: true, checkedInAt: true, createdAt: true },
    }),
    db.eventRegistration.groupBy({ by: ["status"], where: { eventId }, _count: { _all: true } }),
  ]);
  const count = (s: AttendeeStatus) => counts.find((c) => c.status === s)?._count._all ?? 0;
  return {
    event: { ...event, title: event.translations.find((t) => t.locale === "TET")?.title ?? event.slug },
    attendees,
    summary: { registered: count("REGISTERED"), attended: count("ATTENDED"), cancelled: count("CANCELLED") },
  };
}
