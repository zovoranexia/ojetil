import "server-only";
import { db } from "@/lib/db";
import { fromTranslationRows } from "./admin-schema";
import {
  LEADERSHIP_TRANSLATION_FIELDS,
  PROFILE_SECTION_KEYS,
  PROFILE_TRANSLATION_FIELDS,
  TIMELINE_TRANSLATION_FIELDS,
  type LeadershipFormValues,
  type ProfileFormValues,
  type TimelineFormValues,
} from "./institutional-schema";

const tetTitle = (rows: Array<{ locale: string; title: string }>, fallback: string) => rows.find((t) => t.locale === "TET")?.title ?? fallback;

export async function listMilestonesAdmin() {
  const rows = await db.timelineMilestone.findMany({
    orderBy: [{ displayOrder: "asc" }, { year: "asc" }],
    select: { id: true, slug: true, year: true, month: true, day: true, datePrecision: true, isHighlighted: true, status: true, displayOrder: true, updatedAt: true, translations: { select: { locale: true, title: true } } },
  });
  return rows.map((r) => ({ ...r, title: tetTitle(r.translations, r.slug), locales: r.translations.map((t) => t.locale) }));
}

export async function getMilestoneForEdit(id: string): Promise<TimelineFormValues | null> {
  const m = await db.timelineMilestone.findUnique({ where: { id }, include: { translations: true } });
  if (!m) return null;
  return {
    id: m.id,
    slug: m.slug,
    year: m.year,
    month: m.month ? String(m.month) : "",
    day: m.day ? String(m.day) : "",
    datePrecision: m.datePrecision,
    displayOrder: m.displayOrder,
    isHighlighted: m.isHighlighted,
    status: m.status,
    imageUrl: m.imageUrl ?? "",
    translations: fromTranslationRows(m.translations, TIMELINE_TRANSLATION_FIELDS),
  };
}

export async function nextMilestoneOrder(): Promise<number> {
  const max = await db.timelineMilestone.aggregate({ _max: { displayOrder: true } });
  return (max._max.displayOrder ?? 0) + 10;
}

export async function listLeadersAdmin() {
  const rows = await db.leadershipMember.findMany({
    orderBy: [{ level: "asc" }, { displayOrder: "asc" }],
    select: { id: true, fullName: true, level: true, municipality: true, termStart: true, termEnd: true, status: true, displayOrder: true, translations: { select: { locale: true, title: true } } },
  });
  return rows.map((r) => ({ ...r, title: tetTitle(r.translations, "—"), locales: r.translations.map((t) => t.locale) }));
}

export async function getLeaderForEdit(id: string): Promise<LeadershipFormValues | null> {
  const l = await db.leadershipMember.findUnique({ where: { id }, include: { translations: true } });
  if (!l) return null;
  return {
    id: l.id,
    fullName: l.fullName,
    photoUrl: l.photoUrl ?? "",
    level: l.level,
    municipality: l.municipality ?? "",
    termStart: l.termStart,
    termEnd: l.termEnd ? String(l.termEnd) : "",
    displayOrder: l.displayOrder,
    status: l.status,
    translations: fromTranslationRows(l.translations, LEADERSHIP_TRANSLATION_FIELDS),
  };
}

export async function listProfileSectionsAdmin() {
  const rows = await db.profileSection.findMany({ select: { key: true, status: true, updatedAt: true, translations: { select: { locale: true } } } });
  return PROFILE_SECTION_KEYS.map((key) => {
    const r = rows.find((x) => x.key === key);
    return { key, status: r?.status ?? null, updatedAt: r?.updatedAt ?? null, locales: r?.translations.map((t) => t.locale) ?? [] };
  });
}

export async function getProfileSectionForEdit(key: (typeof PROFILE_SECTION_KEYS)[number]): Promise<ProfileFormValues> {
  const s = await db.profileSection.findUnique({ where: { key }, include: { translations: true } });
  return { key, status: s?.status ?? "DRAFT", translations: fromTranslationRows(s?.translations ?? [], PROFILE_TRANSLATION_FIELDS) };
}
