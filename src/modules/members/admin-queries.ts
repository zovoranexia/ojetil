import "server-only";
import type { MemberCategory, Municipality, Prisma, RegistrationStatus } from "@prisma/client";
import { MUNICIPALITY_VALUES } from "@/config/municipalities";
import { db } from "@/lib/db";
import { nationalIdBlindIndex } from "./pii";
import { MEMBER_CATEGORIES } from "./registration-schema";

/*
 * Backoffice read models. None of these select encrypted columns: decryption
 * happens only in the audited reveal action and export route.
 */
export const MEMBER_STATUSES = ["PENDING_VERIFICATION", "NEEDS_REVISION", "VERIFIED", "REJECTED"] as const satisfies readonly RegistrationStatus[];
export const MEMBER_PAGE_SIZE = 20;

export function parseMemberFilters(sp: Record<string, string | string[] | undefined>) {
  const one = (k: string) => {
    const v = sp[k];
    return (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
  };
  const status = one("status");
  const category = one("category");
  const municipality = one("municipality");
  /** "OFFICE" | "ONLINE" | "SELF" (office entries verified by the person who entered them). */
  const channel = one("channel");
  return {
    q: one("q")?.slice(0, 80),
    status: (MEMBER_STATUSES as readonly string[]).includes(status ?? "") ? (status as RegistrationStatus) : undefined,
    category: (MEMBER_CATEGORIES as readonly string[]).includes(category ?? "") ? (category as MemberCategory) : undefined,
    municipality: (MUNICIPALITY_VALUES as readonly string[]).includes(municipality ?? "") ? (municipality as Municipality) : undefined,
    channel: channel === "OFFICE" || channel === "ONLINE" || channel === "SELF" ? channel : undefined,
    page: Math.max(Number.parseInt(one("page") ?? "1", 10) || 1, 1),
  };
}

export type MemberFilters = ReturnType<typeof parseMemberFilters>;

function whereFor(f: MemberFilters): Prisma.MemberRegistrationWhereInput {
  const and: Prisma.MemberRegistrationWhereInput[] = [];
  if (f.status) and.push({ status: f.status });
  if (f.category) and.push({ category: f.category });
  if (f.municipality) and.push({ municipality: f.municipality });
  if (f.channel === "ONLINE") and.push({ channel: "ONLINE" });
  if (f.channel === "OFFICE") and.push({ channel: "OFFICE" });
  // Monitoring: office entries verified by the same staff member who entered them.
  if (f.channel === "SELF") and.push({ channel: "OFFICE", status: "VERIFIED", registeredById: { not: null }, verifiedById: { equals: db.memberRegistration.fields.registeredById } });
  if (f.q) {
    const or: Prisma.MemberRegistrationWhereInput[] = [
      { fullName: { contains: f.q, mode: "insensitive" } },
      { clandestineAlias: { contains: f.q, mode: "insensitive" } },
      { trackingCode: { contains: f.q.toUpperCase() } },
    ];
    // Exact national-ID match through the blind index — no decryption needed.
    if (f.q.replace(/[\s.\-/]/g, "").length >= 5) or.push({ nationalIdHash: nationalIdBlindIndex(f.q) });
    and.push({ OR: or });
  }
  return and.length ? { AND: and } : {};
}

export async function listMembers(f: MemberFilters) {
  const where = whereFor(f);
  const total = await db.memberRegistration.count({ where });
  const pageCount = Math.max(Math.ceil(total / MEMBER_PAGE_SIZE), 1);
  const page = Math.min(f.page, pageCount);
  const items = await db.memberRegistration.findMany({
    where,
    // Oldest pending first is the natural queue order; otherwise newest first.
    orderBy: f.status === "PENDING_VERIFICATION" ? { createdAt: "asc" } : { createdAt: "desc" },
    skip: (page - 1) * MEMBER_PAGE_SIZE,
    take: MEMBER_PAGE_SIZE,
    select: {
      id: true,
      trackingCode: true,
      fullName: true,
      clandestineAlias: true,
      category: true,
      status: true,
      municipality: true,
      createdAt: true,
      verifiedAt: true,
      nationalIdHash: true,
      channel: true,
      registeredById: true,
      verifiedById: true,
    },
  });

  // Flag rows whose national ID appears on another application (possible duplicate).
  const hashes = [...new Set(items.map((i) => i.nationalIdHash))];
  const counts = hashes.length
    ? await db.memberRegistration.groupBy({ by: ["nationalIdHash"], where: { nationalIdHash: { in: hashes } }, _count: { _all: true } })
    : [];
  const dupes = new Set(counts.filter((c) => c._count._all > 1).map((c) => c.nationalIdHash));

  return {
    items: items.map(({ nationalIdHash, ...rest }) => ({ ...rest, possibleDuplicate: dupes.has(nationalIdHash) })),
    total,
    page,
    pageCount,
  };
}

/** Counts only — the Viewer (Board) role never sees individual records. */
export async function memberAggregates() {
  const [byStatus, byCategory] = await Promise.all([
    db.memberRegistration.groupBy({ by: ["status"], _count: { _all: true } }),
    db.memberRegistration.groupBy({ by: ["category", "status"], _count: { _all: true } }),
  ]);
  return {
    byStatus: Object.fromEntries(MEMBER_STATUSES.map((s) => [s, byStatus.find((b) => b.status === s)?._count._all ?? 0])) as Record<RegistrationStatus, number>,
    byCategory: MEMBER_CATEGORIES.map((c) => ({
      category: c,
      total: byCategory.filter((b) => b.category === c).reduce((s, b) => s + b._count._all, 0),
      verified: byCategory.filter((b) => b.category === c && b.status === "VERIFIED").reduce((s, b) => s + b._count._all, 0),
    })),
  };
}

export async function getMemberDetail(id: string) {
  const member = await db.memberRegistration.findUnique({
    where: { id },
    select: {
      id: true,
      trackingCode: true,
      category: true,
      status: true,
      fullName: true,
      clandestineAlias: true,
      dateOfBirth: true,
      gender: true,
      profilePhotoKey: true,
      municipality: true,
      administrativePost: true,
      email: true,
      nationalIdHash: true,
      yearJoined: true,
      clandestineCell: true,
      clandestineRegion: true,
      witnessReference: true,
      institution: true,
      interests: true,
      motivation: true,
      consentVersion: true,
      consentAt: true,
      submittedLocale: true,
      verifiedAt: true,
      verificationNotes: true,
      verifiedById: true,
      verifiedBy: { select: { name: true, email: true } },
      channel: true,
      registeredById: true,
      registeredBy: { select: { name: true, email: true } },
      createdAt: true,
      updatedAt: true,
      statusChanges: {
        orderBy: { createdAt: "desc" },
        select: { id: true, fromStatus: true, toStatus: true, note: true, createdAt: true, actor: { select: { name: true, email: true } } },
      },
    },
  });
  if (!member) return null;

  const duplicates = await db.memberRegistration.findMany({
    where: { nationalIdHash: member.nationalIdHash, id: { not: member.id } },
    select: { id: true, trackingCode: true, fullName: true, status: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  // Never hand the blind index or storage key to the page.
  const rest: Omit<typeof member, "nationalIdHash" | "profilePhotoKey"> & { nationalIdHash?: string; profilePhotoKey?: string | null } = { ...member };
  delete rest.nationalIdHash;
  delete rest.profilePhotoKey;
  return { ...rest, hasPhoto: Boolean(member.profilePhotoKey), duplicates };
}
