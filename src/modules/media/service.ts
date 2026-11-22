import "server-only";
import type { MediaAsset, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/security/guards";
import { recordAudit } from "@/modules/audit/service";
import type { MediaAssetDTO } from "./schema";
import { deleteMediaFile, displayFileName, storeMediaFile } from "./storage";

export function toMediaDTO(a: MediaAsset & { createdBy?: { name: string } | null }): MediaAssetDTO {
  return {
    id: a.id,
    kind: a.kind,
    url: a.url,
    fileName: a.fileName,
    fileSize: a.fileSize,
    width: a.width,
    height: a.height,
    credit: a.credit,
    altText: a.altText,
    createdAt: a.createdAt.toISOString(),
    createdBy: a.createdBy?.name ?? null,
  };
}

/**
 * Stores an uploaded file and registers it in the library (+ audit). Used by
 * the Media library page and by the editor's image upload, so every uploaded
 * file shows up in the library.
 */
export async function createMediaFromUpload(file: File, user: SessionUser, extra: { credit?: string } = {}): Promise<MediaAssetDTO> {
  const stored = await storeMediaFile(file);
  try {
    const asset = await db.$transaction(async (tx) => {
      const created = await tx.mediaAsset.create({
        data: {
          kind: stored.kind,
          url: stored.url,
          fileKey: stored.fileKey,
          fileName: displayFileName(file.name),
          mimeType: stored.mimeType,
          fileSize: stored.fileSize,
          width: stored.width,
          height: stored.height,
          credit: extra.credit?.trim().slice(0, 200) || null,
          createdById: user.id,
        },
        include: { createdBy: { select: { name: true } } },
      });
      await recordAudit(
        {
          action: "MEDIA_UPLOADED",
          actor: user,
          target: { type: "MediaAsset", id: created.id },
          metadata: { kind: created.kind, url: created.url, bytes: created.fileSize ?? 0, originalName: created.fileName.slice(0, 120) },
        },
        tx,
      );
      return created;
    });
    return toMediaDTO(asset);
  } catch (error) {
    await deleteMediaFile(stored.fileKey).catch(() => undefined);
    throw error;
  }
}

/** Articles that reference a media URL (cover or body), to prevent deleting media still in use. */
export async function mediaUsage(url: string): Promise<Array<{ id: string; slug: string }>> {
  const where: Prisma.NewsArticleWhereInput = {
    OR: [{ coverImageUrl: url }, { translations: { some: { body: { contains: url } } } }],
  };
  return db.newsArticle.findMany({ where, select: { id: true, slug: true }, take: 20 });
}
