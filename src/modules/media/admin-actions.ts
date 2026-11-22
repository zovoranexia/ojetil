"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionError, authorizedAction } from "@/lib/actions";
import { toVideoEmbedUrl } from "@/lib/content/video-embed";
import { db } from "@/lib/db";
import { msg } from "@/lib/i18n-message";
import { recordAudit } from "@/modules/audit/service";
import { listMedia } from "./queries";
import { mediaLinkSchema, mediaListSchema, mediaUpdateSchema } from "./schema";
import { mediaUsage, toMediaDTO } from "./service";
import { deleteMediaFile } from "./storage";

/** Library listing for the editor's media picker. */
export const listMediaAction = authorizedAction("content:read", mediaListSchema, async (input) => listMedia({ q: input.q || undefined, kinds: input.kinds, page: input.page }));

/** Registers a YouTube / Vimeo video by link (no file stored). */
export const addVideoLink = authorizedAction("content:write", mediaLinkSchema, async ({ url, title }, user) => {
  const embed = toVideoEmbedUrl(url);
  if (!embed) throw new ActionError("VALIDATION", msg("admin.media.errors.badLink"), { url: [msg("admin.media.errors.badLink")] });
  const existing = await db.mediaAsset.findUnique({ where: { url: embed }, include: { createdBy: { select: { name: true } } } });
  if (existing) return toMediaDTO(existing);
  const asset = await db.$transaction(async (tx) => {
    const created = await tx.mediaAsset.create({
      data: { kind: "VIDEO_LINK", url: embed, fileName: title || embed.replace(/^https:\/\//, ""), createdById: user.id },
      include: { createdBy: { select: { name: true } } },
    });
    await recordAudit({ action: "MEDIA_UPLOADED", actor: user, target: { type: "MediaAsset", id: created.id }, metadata: { kind: "VIDEO_LINK", url: embed } }, tx);
    return created;
  });
  revalidatePath("/admin/media");
  return toMediaDTO(asset);
});

export const updateMedia = authorizedAction("content:write", mediaUpdateSchema, async ({ id, fileName, credit, altText }, user) => {
  const asset = await db.$transaction(async (tx) => {
    const updated = await tx.mediaAsset.update({
      where: { id },
      data: { fileName, credit: credit || null, altText: altText || null },
      include: { createdBy: { select: { name: true } } },
    });
    await recordAudit({ action: "MEDIA_UPDATED", actor: user, target: { type: "MediaAsset", id }, metadata: { fileName, credit: credit || null } }, tx);
    return updated;
  });
  revalidatePath("/admin/media");
  return toMediaDTO(asset);
});

/** Deletes a media item and its file — refused while an article still uses it. */
export const deleteMedia = authorizedAction("content:write", z.object({ id: z.string().min(1) }), async ({ id }, user) => {
  const asset = await db.mediaAsset.findUnique({ where: { id } });
  if (!asset) throw new ActionError("NOT_FOUND", msg("admin.media.errors.notFound"));
  const usedBy = await mediaUsage(asset.url);
  if (usedBy.length) {
    throw new ActionError("CONFLICT", msg("admin.media.errors.inUse", { count: usedBy.length, slugs: usedBy.slice(0, 3).map((a) => a.slug).join(", ") }));
  }
  await db.$transaction(async (tx) => {
    await tx.mediaAsset.delete({ where: { id } });
    await recordAudit({ action: "MEDIA_DELETED", actor: user, target: { type: "MediaAsset", id }, metadata: { kind: asset.kind, url: asset.url, fileName: asset.fileName } }, tx);
  });
  if (asset.fileKey) await deleteMediaFile(asset.fileKey).catch(() => undefined);
  revalidatePath("/admin/media");
  return { id };
});
