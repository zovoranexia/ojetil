import "server-only";
import type { DatePrecision, LeadershipLevel, Municipality, ProfileSectionKey } from "@prisma/client";
import type { AppLocale } from "@/config/locales";
import { db } from "@/lib/db";
import { pickTranslation, translationLocales } from "./translation";

/* Public read models for institutional content: profile, timeline, leadership, impact stats. */

export interface ProfileSectionView {
  key: ProfileSectionKey;
  title: string;
  body: string;
}

export async function getProfileSections(locale: AppLocale): Promise<Partial<Record<ProfileSectionKey, ProfileSectionView>>> {
  const rows = await db.profileSection.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { displayOrder: "asc" },
    select: {
      key: true,
      translations: { where: { locale: { in: translationLocales(locale) } }, select: { locale: true, title: true, body: true } },
    },
  });
  const out: Partial<Record<ProfileSectionKey, ProfileSectionView>> = {};
  for (const r of rows) {
    const tr = pickTranslation(r.translations, locale);
    if (tr) out[r.key] = { key: r.key, title: tr.title, body: tr.body };
  }
  return out;
}

export interface MilestoneView {
  slug: string;
  year: number;
  month: number | null;
  day: number | null;
  datePrecision: DatePrecision;
  isHighlighted: boolean;
  imageUrl: string | null;
  title: string;
  summary: string;
  body: string | null;
  imageAlt: string | null;
}

export async function getTimeline(locale: AppLocale, opts: { highlightedOnly?: boolean; untilYear?: number } = {}): Promise<MilestoneView[]> {
  const rows = await db.timelineMilestone.findMany({
    where: {
      status: "PUBLISHED",
      ...(opts.highlightedOnly ? { isHighlighted: true } : {}),
      ...(opts.untilYear ? { year: { lte: opts.untilYear } } : {}),
    },
    orderBy: [{ displayOrder: "asc" }, { year: "asc" }],
    select: {
      slug: true,
      year: true,
      month: true,
      day: true,
      datePrecision: true,
      isHighlighted: true,
      imageUrl: true,
      translations: {
        where: { locale: { in: translationLocales(locale) } },
        select: { locale: true, title: true, summary: true, body: true, imageAlt: true },
      },
    },
  });
  return rows.flatMap((r) => {
    const tr = pickTranslation(r.translations, locale);
    if (!tr) return [];
    return [{ slug: r.slug, year: r.year, month: r.month, day: r.day, datePrecision: r.datePrecision, isHighlighted: r.isHighlighted, imageUrl: r.imageUrl, title: tr.title, summary: tr.summary, body: tr.body, imageAlt: tr.imageAlt }];
  });
}

export interface LeaderView {
  id: string;
  fullName: string;
  photoUrl: string | null;
  level: LeadershipLevel;
  municipality: Municipality | null;
  termStart: number;
  termEnd: number | null;
  title: string;
  bio: string | null;
}

export async function getLeadership(locale: AppLocale): Promise<{ national: LeaderView[]; municipal: LeaderView[] }> {
  const rows = await db.leadershipMember.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ level: "asc" }, { displayOrder: "asc" }],
    select: {
      id: true,
      fullName: true,
      photoUrl: true,
      level: true,
      municipality: true,
      termStart: true,
      termEnd: true,
      translations: { where: { locale: { in: translationLocales(locale) } }, select: { locale: true, title: true, bio: true } },
    },
  });
  const views: LeaderView[] = rows.flatMap((r) => {
    const tr = pickTranslation(r.translations, locale);
    if (!tr) return [];
    return [{ id: r.id, fullName: r.fullName, photoUrl: r.photoUrl, level: r.level, municipality: r.municipality, termStart: r.termStart, termEnd: r.termEnd, title: tr.title, bio: tr.bio }];
  });
  return { national: views.filter((v) => v.level === "NATIONAL"), municipal: views.filter((v) => v.level === "MUNICIPAL") };
}

/**
 * Home "impact strip". Aggregates only — never individual records.
 * Municipalities reached = distinct municipalities with a verified member or a held event.
 */
export async function getImpactStats(): Promise<{
  verifiedMembers: number;
  eventsHeld: number;
  participants: number;
  municipalities: number;
}> {
  const now = new Date();
  const [verifiedMembers, eventsHeld, participants, memberMunicipalities, eventMunicipalities] = await Promise.all([
    db.memberRegistration.count({ where: { status: "VERIFIED" } }),
    db.event.count({ where: { status: "PUBLISHED", startAt: { lte: now } } }),
    db.eventRegistration.count({ where: { status: { not: "CANCELLED" } } }),
    db.memberRegistration.findMany({ where: { status: "VERIFIED" }, distinct: ["municipality"], select: { municipality: true } }),
    db.event.findMany({
      where: { status: "PUBLISHED", municipality: { not: null } },
      distinct: ["municipality"],
      select: { municipality: true },
    }),
  ]);
  const reached = new Set<string>();
  for (const m of memberMunicipalities) if (m.municipality !== "DIASPORA") reached.add(m.municipality);
  for (const e of eventMunicipalities) if (e.municipality && e.municipality !== "DIASPORA") reached.add(e.municipality);
  return { verifiedMembers, eventsHeld, participants, municipalities: reached.size };
}
