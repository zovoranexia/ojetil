import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { getServerEnv } from "@/lib/env";
import { msg } from "@/lib/i18n-message";

/**
 * PDF storage for the Documents module. Files live under DOCUMENT_DIR (never
 * /public) with random names; the public route only streams PUBLISHED ones.
 * Validation: size limit, "%PDF-" magic bytes at offset 0 and an "%%EOF"
 * trailer near the end (rejects truncated uploads and renamed non-PDFs).
 * Upload errors carry msg()-encoded keys (decoded in the editor).
 */
export class DocumentFileError extends Error {
  override name = "DocumentFileError";
  constructor(message: string) {
    super(message);
  }
}

export function isPdf(buf: Buffer): boolean {
  if (buf.length < 64 || buf.toString("latin1", 0, 5) !== "%PDF-") return false;
  return buf.subarray(Math.max(0, buf.length - 2048)).toString("latin1").includes("%%EOF");
}

function root(): string {
  return resolve(getServerEnv().DOCUMENT_DIR);
}

function pathForKey(key: string): string {
  const base = root();
  const full = resolve(base, key);
  if (!/^\d{4}\/[0-9a-f-]{36}\.pdf$/.test(key) || !full.startsWith(base + sep)) throw new Error("Invalid document key.");
  return full;
}

export interface StoredDocumentFile {
  fileKey: string;
  fileName: string;
  fileSize: number;
  sha256: string;
}

/** Original name, reduced to something safe to show and to use in Content-Disposition. */
export function safeFileName(name: string): string {
  const base = name.replace(/\.pdf$/i, "").normalize("NFKD").replace(/[^\w.\- ]+/g, "").trim().slice(0, 100) || "document";
  return `${base}.pdf`;
}

export async function storeDocumentFile(file: File, now: Date = new Date()): Promise<StoredDocumentFile> {
  const max = getServerEnv().MAX_DOCUMENT_BYTES;
  const mb = Math.round(max / 1_048_576);
  if (file.size === 0) throw new DocumentFileError(msg("admin.documents.validation.fileEmpty"));
  if (file.size > max) throw new DocumentFileError(msg("admin.documents.validation.tooLarge", { size: `${mb} MB` }));
  const data = Buffer.from(await file.arrayBuffer());
  if (data.length > max) throw new DocumentFileError(msg("admin.documents.validation.tooLarge", { size: `${mb} MB` }));
  if (!isPdf(data)) throw new DocumentFileError(msg("admin.documents.validation.notPdf"));

  const fileKey = `${now.getUTCFullYear()}/${randomUUID()}.pdf`;
  const full = pathForKey(fileKey);
  await mkdir(dirname(full), { recursive: true });
  await writeFile(full, data, { flag: "wx", mode: 0o640 });
  return { fileKey, fileName: safeFileName(file.name), fileSize: data.length, sha256: createHash("sha256").update(data).digest("hex") };
}

/** Writes bytes generated in-process (seed). */
export async function storeDocumentBytes(data: Buffer, fileName: string, now: Date = new Date()): Promise<StoredDocumentFile> {
  if (!isPdf(data)) throw new DocumentFileError("This is not a valid PDF file.");
  const fileKey = `${now.getUTCFullYear()}/${randomUUID()}.pdf`;
  const full = pathForKey(fileKey);
  await mkdir(dirname(full), { recursive: true });
  await writeFile(full, data, { flag: "wx", mode: 0o640 });
  return { fileKey, fileName: safeFileName(fileName), fileSize: data.length, sha256: createHash("sha256").update(data).digest("hex") };
}

export async function readDocumentFile(key: string): Promise<Buffer | null> {
  try {
    return await readFile(pathForKey(key));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function deleteDocumentFile(key: string): Promise<void> {
  await rm(pathForKey(key), { force: true });
}
