import "server-only";
import type { MediaKind, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { MediaAssetDTO } from "./schema";
import { toMediaDTO } from "./service";

export const MEDIA_PAGE_SIZE = 24;

export async function listMedia(params: { q?: string; kinds?: readonly MediaKind[]; page: number; pageSize?: number }): Promise<{
  items: MediaAssetDTO[];
  total: number;
  page: number;
  pageCount: number;
}> {
  const pageSize = params.pageSize ?? MEDIA_PAGE_SIZE;
  const where: Prisma.MediaAssetWhereInput = {
    ...(params.kinds?.length ? { kind: { in: [...params.kinds] } } : {}),
    ...(params.q
      ? {
          OR: [
            { fileName: { contains: params.q, mode: "insensitive" } },
            { credit: { contains: params.q, mode: "insensitive" } },
            { altText: { contains: params.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const total = await db.mediaAsset.count({ where });
  const pageCount = Math.max(Math.ceil(total / pageSize), 1);
  const page = Math.min(params.page, pageCount);
  const rows = await db.mediaAsset.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: { createdBy: { select: { name: true } } },
  });
  return { items: rows.map(toMediaDTO), total, page, pageCount };
}
