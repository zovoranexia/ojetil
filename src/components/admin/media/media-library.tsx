"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { MediaAssetDTO } from "@/modules/media/schema";
import { MediaMeta, MediaThumb } from "./media-common";
import { MediaDetailsDialog } from "./media-details";
import { MediaUploadZone } from "./media-upload";

/** Client part of /admin/media: upload zone, grid, and the details dialog. Listing/filtering is server-rendered. */
export function MediaLibrary({
  items,
  canWrite,
  limits,
  filtered,
}: {
  items: MediaAssetDTO[];
  canWrite: boolean;
  limits: { imageMb: number; fileMb: number };
  filtered: boolean;
}) {
  const t = useTranslations("admin.media");
  const router = useRouter();
  const [list, setList] = useState(items);
  const [open, setOpen] = useState<MediaAssetDTO | null>(null);

  useEffect(() => setList(items), [items]);

  return (
    <div className="space-y-6">
      {canWrite ? <MediaUploadZone limits={limits} onAdded={() => router.refresh()} /> : <p className="rounded-card border border-border-subtle bg-paper p-3 text-sm">{t("readOnly")}</p>}

      {list.length ? (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
          {list.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => setOpen(a)}
                className="group block w-full overflow-hidden rounded-card border border-border-subtle bg-surface-card text-left transition-shadow hover:shadow-[0_8px_24px_-12px_rgb(24_24_27/0.25)] focus-visible:outline-2 focus-visible:outline-ojetil-red"
              >
                <MediaThumb asset={a} />
                <span className="block border-t border-border-subtle px-3 py-2.5">
                  <span className="block truncate text-sm font-medium" title={a.fileName}>
                    {a.fileName}
                  </span>
                  <MediaMeta asset={a} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-card border border-dashed border-border-subtle p-8 text-center text-ink-secondary">{filtered ? t("noResults") : t("empty")}</p>
      )}

      <MediaDetailsDialog
        asset={open}
        canWrite={canWrite}
        onClose={() => setOpen(null)}
        onChanged={(a) => {
          setList((l) => l.map((x) => (x.id === a.id ? a : x)));
          setOpen(a);
          router.refresh();
        }}
        onDeleted={(id) => {
          setList((l) => l.filter((x) => x.id !== id));
          setOpen(null);
          router.refresh();
        }}
      />
    </div>
  );
}
