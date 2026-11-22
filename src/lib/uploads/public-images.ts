import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import sharp, { type OutputInfo } from "sharp";
import { getServerEnv } from "@/lib/env";

/**
 * Public editorial images (news covers and images inside article bodies).
 *
 * Deliberately separate from member photos (UPLOAD_DIR, encrypted, private):
 * everything here is world-readable at /uploads/<key>.
 *  1. Type verified by magic bytes (JPEG / PNG / WebP / GIF / AVIF) — the browser's MIME type is not trusted.
 *  2. Re-encoded by sharp: EXIF orientation applied, all metadata (GPS!) dropped,
 *     downscaled to at most 1600 px wide, WebP q80 — small enough for mobile data.
 *  3. Written under a random name; existing files are never overwritten.
 */
export class ImageUploadError extends Error {
  override name = "ImageUploadError";
  constructor(readonly reason: "size" | "type") {
    super(reason === "size" ? "Image is empty or too large." : "Unsupported or damaged image. Use JPEG, PNG, WebP, GIF or AVIF.");
  }
}

export const PUBLIC_UPLOAD_URL_PREFIX = "/uploads/";
const MAX_WIDTH = 1600;

function sniff(buf: Buffer): string | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "webp";
  if (buf.length >= 6 && (buf.toString("ascii", 0, 6) === "GIF87a" || buf.toString("ascii", 0, 6) === "GIF89a")) return "gif";
  if (buf.length >= 12 && buf.toString("ascii", 4, 8) === "ftyp" && /^(avif|avis)$/.test(buf.toString("ascii", 8, 12))) return "avif";
  return null;
}

function root(): string {
  return resolve(getServerEnv().PUBLIC_UPLOAD_DIR);
}

/** Absolute path for a key ("news/2026/<uuid>.webp"), refusing traversal outside the root. */
export function publicUploadPath(key: string): string | null {
  if (!/^[a-z0-9/_-]+\.(webp|pdf|mp4|mp3)$/i.test(key) || key.includes("..")) return null;
  const base = root();
  const full = resolve(base, key);
  return full.startsWith(base + sep) ? full : null;
}

export interface StoredImage {
  url: string;
  /** Relative to PUBLIC_UPLOAD_DIR. */
  key: string;
  width: number;
  height: number;
  bytes: number;
}

export async function storePublicImage(file: File, folder: "news" | "media" = "media", now: Date = new Date()): Promise<StoredImage> {
  const max = getServerEnv().MAX_IMAGE_UPLOAD_BYTES;
  if (file.size === 0 || file.size > max) throw new ImageUploadError("size");
  const input = Buffer.from(await file.arrayBuffer());
  if (input.length === 0 || input.length > max) throw new ImageUploadError("size");
  if (!sniff(input)) throw new ImageUploadError("type");

  let output: { data: Buffer; info: OutputInfo };
  try {
    output = await sharp(input, { limitInputPixels: 60_000_000, failOn: "error", animated: false })
      .rotate()
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer({ resolveWithObject: true });
  } catch {
    throw new ImageUploadError("type");
  }

  const key = `${folder}/${now.getUTCFullYear()}/${randomUUID()}.webp`;
  const full = publicUploadPath(key)!;
  await mkdir(dirname(full), { recursive: true });
  await writeFile(full, output.data, { flag: "wx", mode: 0o644 });
  return { url: `${PUBLIC_UPLOAD_URL_PREFIX}${key}`, key, width: output.info.width, height: output.info.height, bytes: output.data.length };
}

export async function readPublicUpload(key: string): Promise<{ data: Buffer; mtime: Date } | null> {
  const full = publicUploadPath(key);
  if (!full) return null;
  try {
    const [data, info] = await Promise.all([readFile(full), stat(full)]);
    return { data, mtime: info.mtime };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}
