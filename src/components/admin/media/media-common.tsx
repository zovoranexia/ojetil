"use client";

import { FileAudio, FileText, Film, MonitorPlay } from "lucide-react";
import { useTranslations } from "next-intl";
import { msg } from "@/lib/i18n-message";
import { cn } from "@/lib/utils";
import { formatBytes, videoThumbnail, type MediaAssetDTO } from "@/modules/media/schema";

/** Uploads one file to the Media library. Errors are msg()-encoded (decode with useMessageText). */
export async function uploadMediaFile(file: File): Promise<{ ok: true; asset: MediaAssetDTO } | { ok: false; message: string }> {
  const body = new FormData();
  body.set("file", file);
  try {
    const res = await fetch("/api/admin/media", { method: "POST", body });
    const json = (await res.json().catch(() => ({}))) as MediaAssetDTO & { message?: string };
    if (!res.ok || !json.id) return { ok: false, message: json.message ?? msg("admin.media.errors.network") };
    return { ok: true, asset: json };
  } catch {
    return { ok: false, message: msg("admin.media.errors.network") };
  }
}

/** Square-ish preview for a media item: the image itself, a YouTube thumbnail, or a type icon. */
export function MediaThumb({ asset, className }: { asset: MediaAssetDTO; className?: string }) {
  const thumb = asset.kind === "IMAGE" ? asset.url : asset.kind === "VIDEO_LINK" ? videoThumbnail(asset.url) : null;
  const Icon = asset.kind === "PDF" ? FileText : asset.kind === "AUDIO" ? FileAudio : asset.kind === "VIDEO" ? Film : MonitorPlay;
  return (
    <div className={cn("relative flex aspect-square items-center justify-center overflow-hidden bg-surface-muted text-ink-secondary", className)}>
      {thumb ? (
        // eslint-disable-next-line @next/next/no-img-element -- admin thumbnails of uploaded or YouTube images
        <img src={thumb} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
      ) : (
        <Icon aria-hidden="true" className="size-10" strokeWidth={1.5} />
      )}
      {asset.kind === "VIDEO_LINK" && thumb ? (
        <span className="absolute inset-0 flex items-center justify-center bg-ink/20 text-white">
          <MonitorPlay aria-hidden="true" className="size-9 drop-shadow" />
        </span>
      ) : null}
    </div>
  );
}

/** "Image · 44 KB" line under a card. */
export function MediaMeta({ asset }: { asset: MediaAssetDTO }) {
  const t = useTranslations("admin.media.kinds");
  const size = formatBytes(asset.fileSize);
  return (
    <span className="block truncate text-xs text-ink-secondary">
      {t(asset.kind)}
      {size ? ` · ${size}` : ""}
    </span>
  );
}
