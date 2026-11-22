import "server-only";
import { Prisma, type EventStatus } from "@prisma/client";
import { toDbLocale, type AppLocale } from "@/config/locales";
import { generateTicketCode } from "@/lib/codes";
import { db } from "@/lib/db";
import { eventAvailability } from "./availability";
import type { EventRegistrationData } from "./registration-schema";

export type RegistrationFailure = "notFound" | "closed" | "full" | "duplicate";

export class EventRegistrationError extends Error {
  override name = "EventRegistrationError";
  constructor(readonly reason: RegistrationFailure) {
    super(reason);
  }
}

/**
 * Registers an attendee without ever overbooking:
 *  1. `SELECT … FOR UPDATE` locks the event row, serialising concurrent
 *     registrations for the same event.
 *  2. Capacity, status, deadline and duplicates are checked inside that lock.
 *  3. A random ticket code is issued (retried on the astronomically rare clash).
 */
export async function registerForEvent(
  data: EventRegistrationData,
  locale: AppLocale,
): Promise<{ ticketCode: string; isOnline: boolean }> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await db.$transaction(
        async (tx) => {
          const [event] = await tx.$queryRaw<
            Array<{
              id: string;
              status: EventStatus;
              capacity: number;
              registrationOpen: boolean;
              registrationDeadline: Date | null;
              startAt: Date;
              endAt: Date;
              isOnline: boolean;
            }>
          >`SELECT "id", "status", "capacity", "registrationOpen", "registrationDeadline", "startAt", "endAt", "isOnline"
            FROM "events" WHERE "slug" = ${data.eventSlug} FOR UPDATE`;

          if (!event || event.status === "DRAFT") throw new EventRegistrationError("notFound");

          const registered = await tx.eventRegistration.count({
            where: { eventId: event.id, status: { not: "CANCELLED" } },
          });
          const availability = eventAvailability(event, registered);
          if (availability.state === "full") throw new EventRegistrationError("full");
          if (!availability.canRegister) throw new EventRegistrationError("closed");

          const existing = await tx.eventRegistration.findUnique({
            where: { eventId_email: { eventId: event.id, email: data.email } },
            select: { id: true },
          });
          if (existing) throw new EventRegistrationError("duplicate");

          const created = await tx.eventRegistration.create({
            data: {
              eventId: event.id,
              ticketCode: generateTicketCode(),
              fullName: data.fullName,
              email: data.email,
              phone: data.phone || null,
              institution: data.institution || null,
              municipality: data.municipality || null,
              locale: toDbLocale(locale),
            },
            select: { ticketCode: true },
          });
          return { ticketCode: created.ticketCode, isOnline: event.isOnline };
        },
        // Registrations for one event queue on the row lock; allow time to acquire a connection.
        { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, maxWait: 15_000, timeout: 10_000 },
      );
    } catch (error) {
      // Unique violation: either a ticket-code clash (retry) or a concurrent duplicate email.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const target = String(error.meta?.target ?? "");
        if (target.includes("email")) throw new EventRegistrationError("duplicate");
        continue;
      }
      throw error;
    }
  }
  throw new Error("Could not allocate a unique ticket code.");
}
