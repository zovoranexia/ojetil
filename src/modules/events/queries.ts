import "server-only";
import type { EventType, Prisma } from "@prisma/client";
import type { AppLocale } from "@/config/locales";
import { db } from "@/lib/db";
import { pickTranslation, translationLocales } from "@/modules/content/translation";
import { eventAvailability, type Availability } from "./availability";

export const EVENT_TYPES = ["SEMINAR", "DEBATE", "WORKSHOP", "NATIONAL_DAY"] as const satisfies readonly EventType[];

export function isEventType(value: unknown): value is EventType {
  return typeof value === "string" && (EVENT_TYPES as readonly string[]).includes(value);
}

const ACTIVE_REGISTRATION = { status: { not: "CANCELLED" } } as const satisfies Prisma.EventRegistrationWhereInput;

const cardSelect = (locale: AppLocale) =>
  ({
    id: true,
    slug: true,
    type: true,
    status: true,
    startAt: true,
    endAt: true,
    timezone: true,
    location: true,
    municipality: true,
    isOnline: true,
    capacity: true,
    registrationOpen: true,
    registrationDeadline: true,
    coverImageUrl: true,
    translations: {
      where: { locale: { in: translationLocales(locale) } },
      select: { locale: true, title: true, summary: true },
    },
    _count: { select: { registrations: { where: ACTIVE_REGISTRATION } } },
  }) satisfies Prisma.EventSelect;

type CardRow = Prisma.EventGetPayload<{ select: ReturnType<typeof cardSelect> }>;

export interface EventCardData {
  slug: string;
  type: EventType;
  startAt: Date;
  endAt: Date;
  location: string;
  isOnline: boolean;
  coverImageUrl: string | null;
  title: string;
  summary: string;
  availability: Availability;
}

function toCard(row: CardRow, locale: AppLocale, now: Date): EventCardData | null {
  const tr = pickTranslation(row.translations, locale);
  if (!tr) return null;
  return {
    slug: row.slug,
    type: row.type,
    startAt: row.startAt,
    endAt: row.endAt,
    location: row.location,
    isOnline: row.isOnline,
    coverImageUrl: row.coverImageUrl,
    title: tr.title,
    summary: tr.summary,
    availability: eventAvailability(row, row._count.registrations, now),
  };
}

/** Public listing. Cancelled events stay visible (with a badge) so people are informed. */
export async function listEvents(params: {
  locale: AppLocale;
  scope: "upcoming" | "past";
  type?: EventType;
  take?: number;
}): Promise<EventCardData[]> {
  const now = new Date();
  const rows = await db.event.findMany({
    where: {
      status: { in: ["PUBLISHED", "CANCELLED"] },
      ...(params.type ? { type: params.type } : {}),
      ...(params.scope === "upcoming" ? { endAt: { gt: now } } : { endAt: { lte: now } }),
    },
    orderBy: { startAt: params.scope === "upcoming" ? "asc" : "desc" },
    take: params.take ?? 24,
    select: cardSelect(params.locale),
  });
  return rows.map((r) => toCard(r, params.locale, now)).filter((x): x is EventCardData => x !== null);
}

export async function getPublicEvent(slug: string, locale: AppLocale) {
  const now = new Date();
  const row = await db.event.findFirst({
    where: { slug, status: { in: ["PUBLISHED", "CANCELLED"] } },
    select: {
      ...cardSelect(locale),
      translations: {
        where: { locale: { in: translationLocales(locale) } },
        select: { locale: true, title: true, summary: true, description: true, locationDetails: true },
      },
    },
  });
  if (!row) return null;
  const tr = pickTranslation(row.translations, locale);
  if (!tr) return null;
  return {
    id: row.id,
    slug: row.slug,
    type: row.type,
    startAt: row.startAt,
    endAt: row.endAt,
    timezone: row.timezone,
    location: row.location,
    municipality: row.municipality,
    isOnline: row.isOnline,
    registrationDeadline: row.registrationDeadline,
    coverImageUrl: row.coverImageUrl,
    title: tr.title,
    summary: tr.summary,
    description: tr.description,
    locationDetails: tr.locationDetails,
    availability: eventAvailability(row, row._count.registrations, now),
  };
}
