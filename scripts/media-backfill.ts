/**
 * Registers files that already exist under PUBLIC_UPLOAD_DIR (e.g. news images
 * uploaded before the Media library existed) as Media library items.
 *
 *   npm run media:backfill -- --dry-run   # report only
 *   npm run media:backfill
 *
 * Idempotent: files already known (by storage key) are skipped. The run is
 * written to the append-only audit log.
 */
import "dotenv/config";
import { readdir, stat } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import { parseArgs } from "node:util";
import type { MediaKind } from "@prisma/client";
import sharp from "sharp";
import { db } from "../src/lib/db";
import { getServerEnv } from "../src/lib/env";
import { recordAudit } from "../src/modules/audit/service";

const KINDS: Record<string, { kind: Exclude<MediaKind, "VIDEO_LINK">; mime: string }> = {
  webp: { kind: "IMAGE", mime: "image/webp" },
  pdf: { kind: "PDF", mime: "application/pdf" },
  mp4: { kind: "VIDEO", mime: "video/mp4" },
  mp3: { kind: "AUDIO", mime: "audio/mpeg" },
};

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const out: string[] = [];
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(full)));
    else if (e.isFile()) out.push(full);
  }
  return out;
}

async function main(): Promise<void> {
  const { "dry-run": dryRun } = parseArgs({ options: { "dry-run": { type: "boolean", default: false } }, strict: true }).values;
  const root = resolve(getServerEnv().PUBLIC_UPLOAD_DIR);
  const files = await walk(root);
  const known = new Set((await db.mediaAsset.findMany({ select: { fileKey: true } })).map((r) => r.fileKey));

  let added = 0;
  for (const full of files) {
    const key = relative(root, full).split(sep).join("/");
    const ext = key.slice(key.lastIndexOf(".") + 1).toLowerCase();
    const type = KINDS[ext];
    if (!type || known.has(key) || !/^[a-z0-9/_-]+\.(webp|pdf|mp4|mp3)$/i.test(key)) continue;
    if (dryRun) {
      console.log(`  would add ${key}`);
      added++;
      continue;
    }
    const info = await stat(full);
    const meta = type.kind === "IMAGE" ? await sharp(full).metadata().catch(() => null) : null;
    await db.mediaAsset.create({
      data: {
        kind: type.kind,
        url: `/uploads/${key}`,
        fileKey: key,
        fileName: key.split("/").pop()!,
        mimeType: type.mime,
        fileSize: info.size,
        width: meta?.width ?? null,
        height: meta?.height ?? null,
        createdAt: info.mtime,
      },
    });
    added++;
  }
  console.log(`${dryRun ? "Would register" : "Registered"} ${added} file(s) from ${root}.`);
  if (!dryRun && added) {
    await recordAudit({
      action: "MEDIA_UPLOADED",
      actor: null,
      target: { type: "MediaAsset", id: "*" },
      metadata: { backfill: true, files: added },
      context: { ipAddress: null, userAgent: "scripts/media-backfill" },
    });
  }
}

main()
  .catch((error: unknown) => {
    console.error("✖ Backfill failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
