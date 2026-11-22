import type { MediaKind } from "@prisma/client";
import { z } from "zod";
import { msg } from "@/lib/i18n-message";

/** Client-safe Media library types and rules. Labels: messages `admin.media.kinds.<KIND>`. */
export const MEDIA_KINDS = ["IMAGE", "PDF", "VIDEO", "AUDIO", "VIDEO_LINK"] as const satisfies readonly MediaKind[];

/** File types accepted by the upload zone (images are re-encoded to WebP). */
export const MEDIA_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/avif,application/pdf,video/mp4,audio/mpeg,.mp3";

export interface MediaAssetDTO {
  id: string;
  kind: MediaKind;
  url: string;
  fileName: string;
  fileSize: number | null;
  width: number | null;
  height: number | null;
  credit: string | null;
  altText: string | null;
  createdAt: string;
  createdBy: string | null;
}

export const mediaUpdateSchema = z.object({
  id: z.string().min(1),
  fileName: z.string().trim().min(1, msg("admin.validation.required")).max(200, msg("admin.validation.maxChars", { max: 200 })),
  credit: z.string().trim().max(200, msg("admin.validation.maxChars", { max: 200 })),
  altText: z.string().trim().max(300, msg("admin.validation.maxChars", { max: 300 })),
});
export type MediaUpdateValues = z.input<typeof mediaUpdateSchema>;

export const mediaLinkSchema = z.object({
  url: z.string().trim().min(1, msg("admin.validation.required")).max(500),
  title: z.string().trim().max(200, msg("admin.validation.maxChars", { max: 200 })),
});

export const mediaListSchema = z.object({
  q: z.string().trim().max(80).optional(),
  kinds: z.array(z.enum(MEDIA_KINDS)).max(5).optional(),
  page: z.number().int().min(1).max(10_000).default(1),
});

/** YouTube thumbnail for a canonical youtube-nocookie embed URL (null for Vimeo/other). */
export function videoThumbnail(embedUrl: string): string | null {
  const m = /youtube-nocookie\.com\/embed\/([A-Za-z0-9_-]{11})/.exec(embedUrl);
  return m ? `https://i.ytimg.com/vi/${m[1]}/hqdefault.jpg` : null;
}

export function formatBytes(bytes: number | null): string {
  if (bytes === null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}
