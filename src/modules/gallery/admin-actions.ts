"use server";

import type { Locale } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionError, authorizedAction } from "@/lib/actions";
import { db } from "@/lib/db";
import { msg } from "@/lib/i18n-message";
import { recordAudit } from "@/modules/audit/service";
import { rethrowSlugConflict } from "@/modules/content/admin-server";
import { filledLocales, toTranslationRows } from "@/modules/content/admin-schema";
import { GALLERY_MEDIA_KINDS, GALLERY_TRANSLATION_FIELDS, galleryFormSchema } from "./schema";

const notFound = () => new ActionError("NOT_FOUND", msg("admin.gallery.validation.notFound"));

function revalidate(slug?: string) {
  revalidatePath("/admin/galeria");
  revalidatePath("/[locale]/galeria", "page");
  if (slug) revalidatePath(`/[locale]/galeria/${slug}`, "page");
}

/** Create or update an album; the item list (order + captions) is replaced as a whole. */
export const saveAlbum = authorizedAction("content:write", galleryFormSchema, async (input, user) => {
  const translations = toTranslationRows<"title" | "description">(input.translations, GALLERY_TRANSLATION_FIELDS, "any") as Array<{ locale: Locale; title: string; description: string | null }>;
  if (translations.length === 0) throw new ActionError("VALIDATION", msg("admin.gallery.validation.titleOne"));

  // Only real media of an allowed kind (never trust ids from the browser).
  const assets = input.items.length
    ? await db.mediaAsset.findMany({ where: { id: { in: input.items.map((i) => i.assetId) }, kind: { in: [...GALLERY_MEDIA_KINDS] } }, select: { id: true } })
    : [];
  const valid = new Set(assets.map((a) => a.id));
  const items = input.items.filter((i) => valid.has(i.assetId)).map((i, position) => ({ assetId: i.assetId, position, caption: i.caption || null }));

  if (input.eventId) {
    const exists = await db.event.findUnique({ where: { id: input.eventId }, select: { id: true } });
    if (!exists) throw new ActionError("VALIDATION", msg("admin.gallery.validation.event"), { eventId: [msg("admin.gallery.validation.event")] });
  }

  const data = {
    slug: input.slug,
    takenOn: input.takenOn ? new Date(`${input.takenOn}T00:00:00Z`) : null,
    municipality: input.municipality || null,
    eventId: input.eventId || null,
  };

  try {
    const saved = await db.$transaction(async (tx) => {
      if (input.id) {
        const previous = await tx.galleryAlbum.findUnique({ where: { id: input.id }, select: { status: true } });
        if (!previous) throw notFound();
        if (previous.status === "PUBLISHED" && items.length === 0) throw new ActionError("VALIDATION", msg("admin.gallery.validation.publishedEmpty"));
        await tx.galleryAlbum.update({
          where: { id: input.id },
          data: { ...data, translations: { deleteMany: {}, create: translations }, items: { deleteMany: {}, create: items } },
        });
        await recordAudit(
          { action: "CONTENT_UPDATED", actor: user, target: { type: "GalleryAlbum", id: input.id }, metadata: { slug: input.slug, title: translations[0]!.title, items: items.length, locales: filledLocales(input.translations, GALLERY_TRANSLATION_FIELDS) } },
          tx,
        );
        return { id: input.id };
      }
      const album = await tx.galleryAlbum.create({
        data: { ...data, createdById: user.id, translations: { create: translations }, items: { create: items } },
        select: { id: true },
      });
      await recordAudit({ action: "CONTENT_CREATED", actor: user, target: { type: "GalleryAlbum", id: album.id }, metadata: { slug: input.slug, title: translations[0]!.title, items: items.length } }, tx);
      return album;
    });
    revalidate(input.slug);
    return saved;
  } catch (error) {
    if (error instanceof ActionError) throw error;
    rethrowSlugConflict(error);
  }
});

const idSchema = z.object({ id: z.string().min(1) });

async function setPublished(id: string, publish: boolean, user: Parameters<typeof recordAudit>[0]["actor"]) {
  const slug = await db.$transaction(async (tx) => {
    const album = await tx.galleryAlbum.findUnique({ where: { id }, select: { slug: true, status: true, publishedAt: true, _count: { select: { items: true } } } });
    if (!album) throw notFound();
    if (publish && album._count.items === 0) throw new ActionError("VALIDATION", msg("admin.gallery.validation.publishEmpty"));
    if (publish === (album.status === "PUBLISHED")) return album.slug;
    await tx.galleryAlbum.update({ where: { id }, data: { status: publish ? "PUBLISHED" : "DRAFT", publishedAt: publish ? (album.publishedAt ?? new Date()) : album.publishedAt } });
    await recordAudit({ action: publish ? "CONTENT_PUBLISHED" : "CONTENT_UNPUBLISHED", actor: user, target: { type: "GalleryAlbum", id }, metadata: { slug: album.slug } }, tx);
    return album.slug;
  });
  revalidate(slug);
}

export const publishAlbum = authorizedAction("content:publish", idSchema, async ({ id }, user) => {
  await setPublished(id, true, user);
  return { id };
});

export const unpublishAlbum = authorizedAction("content:publish", idSchema, async ({ id }, user) => {
  await setPublished(id, false, user);
  return { id };
});

/** Deletes the album only; its photos stay in the Media library. */
export const deleteAlbum = authorizedAction("content:write", idSchema, async ({ id }, user) => {
  const slug = await db.$transaction(async (tx) => {
    const album = await tx.galleryAlbum.findUnique({ where: { id }, select: { slug: true, status: true } });
    if (!album) throw notFound();
    await tx.galleryAlbum.delete({ where: { id } });
    await recordAudit({ action: "CONTENT_DELETED", actor: user, target: { type: "GalleryAlbum", id }, metadata: { slug: album.slug, status: album.status } }, tx);
    return album.slug;
  });
  revalidate(slug);
  return { id };
});
