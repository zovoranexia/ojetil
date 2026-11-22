"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { hasPermission } from "@/config/rbac";
import { ActionError, authorizedAction } from "@/lib/actions";
import { db } from "@/lib/db";
import { recordAudit } from "@/modules/audit/service";
import { contentAuditActions, rethrowSlugConflict } from "./admin-server";
import { filledLocales, toTranslationRows, type ContentLocale } from "./admin-schema";
import {
  LEADERSHIP_TRANSLATION_FIELDS,
  PROFILE_TRANSLATION_FIELDS,
  TIMELINE_TRANSLATION_FIELDS,
  leadershipFormSchema,
  profileFormSchema,
  timelineFormSchema,
} from "./institutional-schema";

function assertCanPublish(role: Parameters<typeof hasPermission>[0], status: string) {
  if (status === "PUBLISHED" && !hasPermission(role, "content:publish")) throw new ActionError("FORBIDDEN", "Your role cannot publish content.");
}

/* ── Timeline ─────────────────────────────────────────────────────── */
export const saveMilestone = authorizedAction("content:write", timelineFormSchema, async (input, user) => {
  assertCanPublish(user.role, input.status);
  type Row = { title: string; summary: string; body: string | null; imageAlt: string | null };
  const translations = toTranslationRows<keyof Row>(input.translations, TIMELINE_TRANSLATION_FIELDS) as Array<{ locale: ContentLocale } & Row>;
  const precise = input.datePrecision === "MONTH" || input.datePrecision === "DAY";
  const data = {
    slug: input.slug,
    year: input.year,
    month: precise ? Number(input.month) : null,
    day: input.datePrecision === "DAY" ? Number(input.day) : null,
    datePrecision: input.datePrecision,
    displayOrder: input.displayOrder,
    isHighlighted: input.isHighlighted,
    status: input.status,
    imageUrl: input.imageUrl || null,
  };
  try {
    const saved = await db.$transaction(async (tx) => {
      const previous = input.id ? await tx.timelineMilestone.findUnique({ where: { id: input.id }, select: { status: true } }) : null;
      if (input.id && !previous) throw new ActionError("NOT_FOUND", "Milestone not found.");
      const row = input.id
        ? await tx.timelineMilestone.update({ where: { id: input.id }, data: { ...data, translations: { deleteMany: {}, create: translations } }, select: { id: true } })
        : await tx.timelineMilestone.create({ data: { ...data, translations: { create: translations } }, select: { id: true } });
      for (const action of contentAuditActions(previous?.status ?? null, input.status)) {
        await recordAudit(
          { action, actor: user, target: { type: "TimelineMilestone", id: row.id }, metadata: { slug: input.slug, locales: filledLocales(input.translations, TIMELINE_TRANSLATION_FIELDS), status: input.status } },
          tx,
        );
      }
      return row;
    });
    revalidatePath("/admin/linimasa");
    return { id: saved.id };
  } catch (error) {
    if (error instanceof ActionError) throw error;
    rethrowSlugConflict(error);
  }
});

export const deleteMilestone = authorizedAction("content:write", z.object({ id: z.string().min(1) }), async ({ id }, user) => {
  await db.$transaction(async (tx) => {
    const row = await tx.timelineMilestone.findUnique({ where: { id }, select: { slug: true } });
    if (!row) throw new ActionError("NOT_FOUND", "Milestone not found.");
    await tx.timelineMilestone.delete({ where: { id } });
    await recordAudit({ action: "CONTENT_DELETED", actor: user, target: { type: "TimelineMilestone", id }, metadata: { slug: row.slug } }, tx);
  });
  revalidatePath("/admin/linimasa");
  return { id };
});

/* ── Leadership ───────────────────────────────────────────────────── */
export const saveLeader = authorizedAction("content:write", leadershipFormSchema, async (input, user) => {
  assertCanPublish(user.role, input.status);
  type Row = { title: string; bio: string | null };
  const translations = toTranslationRows<keyof Row>(input.translations, LEADERSHIP_TRANSLATION_FIELDS) as Array<{ locale: ContentLocale } & Row>;
  const data = {
    fullName: input.fullName,
    photoUrl: input.photoUrl || null,
    level: input.level,
    municipality: input.level === "MUNICIPAL" ? input.municipality || null : null,
    termStart: input.termStart,
    termEnd: input.termEnd ? Number(input.termEnd) : null,
    displayOrder: input.displayOrder,
    status: input.status,
  };
  const saved = await db.$transaction(async (tx) => {
    const previous = input.id ? await tx.leadershipMember.findUnique({ where: { id: input.id }, select: { status: true } }) : null;
    if (input.id && !previous) throw new ActionError("NOT_FOUND", "Leader not found.");
    const row = input.id
      ? await tx.leadershipMember.update({ where: { id: input.id }, data: { ...data, translations: { deleteMany: {}, create: translations } }, select: { id: true } })
      : await tx.leadershipMember.create({ data: { ...data, translations: { create: translations } }, select: { id: true } });
    for (const action of contentAuditActions(previous?.status ?? null, input.status)) {
      await recordAudit(
        { action, actor: user, target: { type: "LeadershipMember", id: row.id }, metadata: { title: `${input.fullName} — ${translations[0]!.title}`, level: input.level, status: input.status } },
        tx,
      );
    }
    return row;
  });
  revalidatePath("/admin/pengurus");
  return { id: saved.id };
});

export const deleteLeader = authorizedAction("content:write", z.object({ id: z.string().min(1) }), async ({ id }, user) => {
  await db.$transaction(async (tx) => {
    const row = await tx.leadershipMember.findUnique({ where: { id }, select: { fullName: true } });
    if (!row) throw new ActionError("NOT_FOUND", "Leader not found.");
    await tx.leadershipMember.delete({ where: { id } });
    await recordAudit({ action: "CONTENT_DELETED", actor: user, target: { type: "LeadershipMember", id }, metadata: { title: row.fullName } }, tx);
  });
  revalidatePath("/admin/pengurus");
  return { id };
});

/* ── Profile sections (fixed set; edit only) ──────────────────────── */
export const saveProfileSection = authorizedAction("content:write", profileFormSchema, async (input, user) => {
  assertCanPublish(user.role, input.status);
  type Row = { title: string; body: string };
  const translations = toTranslationRows<keyof Row>(input.translations, PROFILE_TRANSLATION_FIELDS) as Array<{ locale: ContentLocale } & Row>;
  const saved = await db.$transaction(async (tx) => {
    const previous = await tx.profileSection.findUnique({ where: { key: input.key }, select: { status: true } });
    const row = await tx.profileSection.upsert({
      where: { key: input.key },
      create: { key: input.key, status: input.status, displayOrder: 99, translations: { create: translations } },
      update: { status: input.status, translations: { deleteMany: {}, create: translations } },
      select: { id: true },
    });
    for (const action of contentAuditActions(previous?.status ?? null, input.status)) {
      await recordAudit(
        { action, actor: user, target: { type: "ProfileSection", id: row.id }, metadata: { slug: input.key, locales: filledLocales(input.translations, PROFILE_TRANSLATION_FIELDS), status: input.status } },
        tx,
      );
    }
    return row;
  });
  revalidatePath("/admin/profil");
  return { id: saved.id };
});
