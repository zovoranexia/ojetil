import type { EventStatus } from "@prisma/client";

/** Client-safe: derives the registration state shown on cards, detail pages and the form. */
export type AvailabilityState = "open" | "almostFull" | "full" | "closed" | "ended" | "cancelled";

export interface Availability {
  state: AvailabilityState;
  registered: number;
  capacity: number;
  seatsLeft: number;
  /** 0–1 fill ratio for the capacity meter. */
  ratio: number;
  canRegister: boolean;
}

export const ALMOST_FULL_RATIO = 0.85;

export function eventAvailability(
  event: {
    status: EventStatus;
    capacity: number;
    registrationOpen: boolean;
    registrationDeadline: Date | null;
    startAt: Date;
    endAt: Date;
  },
  registered: number,
  now: Date = new Date(),
): Availability {
  const seatsLeft = Math.max(event.capacity - registered, 0);
  const ratio = event.capacity > 0 ? Math.min(registered / event.capacity, 1) : 1;
  const base = { registered, capacity: event.capacity, seatsLeft, ratio };

  if (event.status === "CANCELLED") return { ...base, state: "cancelled", canRegister: false };
  if (event.endAt <= now) return { ...base, state: "ended", canRegister: false };
  if (seatsLeft === 0) return { ...base, state: "full", canRegister: false };
  const deadlinePassed = event.registrationDeadline ? event.registrationDeadline <= now : event.startAt <= now;
  if (!event.registrationOpen || deadlinePassed) return { ...base, state: "closed", canRegister: false };
  if (ratio >= ALMOST_FULL_RATIO) return { ...base, state: "almostFull", canRegister: true };
  return { ...base, state: "open", canRegister: true };
}
