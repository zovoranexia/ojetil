import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { MediaKind } from "@prisma/client";
import { getServerEnv } from "@/lib/env";
import { msg } from "@/lib/i18n-message";
import { ImageUploadError, publicUploadPath, PUBLIC_UPLOAD_URL_PREFIX, storePublicImage } from "@/lib/uploads/public-images";

/**
 * Media library files. Everything is public (served at /uploads/<key>):
 *  • images → re-encoded to WebP by storePublicImage (metadata/GPS stripped);
 *  • PDF / MP4 / MP3 → stored as uploaded after magic-byte checks.
 * The browser's MIME type is never trusted. Errors carry msg()-encoded keys.
 */
export class MediaFileError extends Error {
  override name = "MediaFileError";
}

export interface StoredMedia {
  kind: Exclude<MediaKind, "VIDEO_LINK">;
  url: string;
  fileKey: string;
  mimeType: string;
  fileSize: number;
  width: number | null;
  height: number | null;
}

const IMAGE_MIME = /^image\/(jpeg|png|webp|gif|avif)$/;

function sniffFile(buf: Buffer): { kind: "PDF" | "VIDEO" | "AUDIO"; ext: string; mime: string } | null {
  if (buf.length >= 64 && buf.toString("latin1", 0, 5) === "%PDF-" && buf.subarray(Math.max(0, buf.length - 2048)).toString("latin1").includes("%%EOF")) {
    return { kind: "PDF", ext: "pdf", mime: "application/pdf" };
  }
  // ISO base media (MP4): "ftyp" box at offset 4 with an MP4-family brand.
  if (buf.length >= 12 && buf.toString("latin1", 4, 8) === "ftyp" && /^(isom|iso2|iso5|iso6|mp41|mp42|avc1|M4V |MSNV|dash)$/.test(buf.toString("latin1", 8, 12))) {
    return { kind: "VIDEO", ext: "mp4", mime: "video/mp4" };
  }
  // MP3: ID3v2 tag, or an MPEG audio frame sync (11 set bits, layer III).
  if (buf.length >= 3 && (buf.toString("latin1", 0, 3) === "ID3" || (buf[0] === 0xff && (buf[1]! & 0xe0) === 0xe0 && (buf[1]! & 0x06) === 0x02))) {
    return { kind: "AUDIO", ext: "mp3", mime: "audio/mpeg" };
  }
  return null;
}

export async function storeMediaFile(file: File, now: Date = new Date()): Promise<StoredMedia> {
  if (file.size === 0) throw new MediaFileError(msg("admin.media.errors.empty"));

  if (IMAGE_MIME.test(file.type)) {
    try {
      const img = await storePublicImage(file, "media", now);
      return { kind: "IMAGE", url: img.url, fileKey: img.key, mimeType: "image/webp", fileSize: img.bytes, width: img.width, height: img.height };
    } catch (error) {
      if (error instanceof ImageUploadError) {
        throw new MediaFileError(
          error.reason === "size"
            ? msg("admin.media.errors.tooLarge", { mb: Math.round(getServerEnv().MAX_IMAGE_UPLOAD_BYTES / 1_048_576) })
            : msg("admin.media.errors.badImage"),
        );
      }
      throw error;
    }
  }

  const max = getServerEnv().MAX_MEDIA_FILE_BYTES;
  if (file.size > max) throw new MediaFileError(msg("admin.media.errors.tooLarge", { mb: Math.round(max / 1_048_576) }));
  const data = Buffer.from(await file.arrayBuffer());
  if (data.length > max) throw new MediaFileError(msg("admin.media.errors.tooLarge", { mb: Math.round(max / 1_048_576) }));
  const type = sniffFile(data);
  if (!type) throw new MediaFileError(msg("admin.media.errors.unsupported"));

  const fileKey = `media/${now.getUTCFullYear()}/${randomUUID()}.${type.ext}`;
  const full = publicUploadPath(fileKey)!;
  await mkdir(dirname(full), { recursive: true });
  await writeFile(full, data, { flag: "wx", mode: 0o644 });
  return { kind: type.kind, url: `${PUBLIC_UPLOAD_URL_PREFIX}${fileKey}`, fileKey, mimeType: type.mime, fileSize: data.length, width: null, height: null };
}

export async function deleteMediaFile(fileKey: string): Promise<void> {
  const full = publicUploadPath(fileKey);
  if (full) await rm(full, { force: true });
}

/** Original name, trimmed to something readable (kept for search; never used as a path). */
export function displayFileName(name: string): string {
  return name.replace(/[\u0000-\u001f]/g, "").trim().slice(0, 200) || "file";
}
