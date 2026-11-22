import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import sharp from "sharp";
import { getServerEnv } from "@/lib/env";
import { decryptPiiBytes, encryptPiiBytes } from "@/lib/security/crypto";
import { MAX_PHOTO_BYTES } from "./registration-schema";

/**
 * Member profile photos:
 *  1. Verified by magic bytes (JPEG / PNG / WebP) — the browser's MIME type is not trusted.
 *  2. Re-encoded with sharp to a 600×600 WebP. This strips EXIF/GPS metadata
 *     (a phone photo can reveal where someone lives) and neutralises crafted files.
 *  3. Encrypted with AES-256-GCM and written outside /public. Only an
 *     authorised, audited admin route can decrypt and serve it (Phase 5).
 */
export class PhotoValidationError extends Error {
  override name = "PhotoValidationError";
  constructor(readonly reason: "photoSize" | "photoType") {
    super(reason);
  }
}

function sniffImageType(buf: Buffer): "jpeg" | "png" | "webp" | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "webp";
  return null;
}

/** Validates and normalises an uploaded photo. Returns a metadata-free WebP. */
export async function processProfilePhoto(file: File): Promise<Buffer> {
  if (file.size === 0 || file.size > MAX_PHOTO_BYTES) throw new PhotoValidationError("photoSize");
  const input = Buffer.from(await file.arrayBuffer());
  if (input.length > MAX_PHOTO_BYTES) throw new PhotoValidationError("photoSize");
  if (!sniffImageType(input)) throw new PhotoValidationError("photoType");

  try {
    return await sharp(input, { limitInputPixels: 40_000_000, failOn: "error" })
      .rotate() // apply EXIF orientation before the metadata is discarded
      .resize(600, 600, { fit: "cover", position: "attention" })
      .webp({ quality: 80 })
      .toBuffer(); // sharp drops all metadata unless .withMetadata() is called
  } catch {
    throw new PhotoValidationError("photoType");
  }
}

function uploadRoot(): string {
  return resolve(getServerEnv().UPLOAD_DIR);
}

/** Resolves a storage key to an absolute path, refusing anything outside the upload root. */
function pathForKey(key: string): string {
  const root = uploadRoot();
  const full = resolve(root, key);
  if (!full.startsWith(root + sep)) throw new Error("Invalid storage key.");
  return full;
}

/** Encrypts and stores a processed photo. Returns its storage key, e.g. "members/2026/9f…c1.webp.enc". */
export async function storeProfilePhoto(webp: Buffer, now: Date = new Date()): Promise<string> {
  const key = join("members", String(now.getUTCFullYear()), `${randomUUID()}.webp.enc`).split(sep).join("/");
  const full = pathForKey(key);
  await mkdir(dirname(full), { recursive: true });
  await writeFile(full, encryptPiiBytes("member.photo", webp), { mode: 0o600 });
  return key;
}

export async function readProfilePhoto(key: string): Promise<Buffer> {
  return decryptPiiBytes("member.photo", await readFile(pathForKey(key)));
}

export async function deleteProfilePhoto(key: string): Promise<void> {
  await rm(pathForKey(key), { force: true });
}
