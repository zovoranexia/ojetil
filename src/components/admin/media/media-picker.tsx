"use client";

import { Check, Loader2, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import type { MediaKind } from "@prisma/client";
import { Dialog } from "@/components/admin/dialog";
import { useMessageText } from "@/components/i18n/message-text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { listMediaAction } from "@/modules/media/admin-actions";
import type { MediaAssetDTO } from "@/modules/media/schema";
import { MediaMeta, MediaThumb } from "./media-common";
import { MediaUploadZone } from "./media-upload";

/**
 * Pick an item from the Media library (or upload / add a link first) — used
 * by the news editor for the cover image and for images/videos in the body.
 */
export function MediaPicker({
  open,
  onOpenChange,
  kinds,
  title,
  onSelect,
  canUpload,
  limits,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kinds: MediaKind[];
  title: string;
  onSelect: (asset: MediaAssetDTO) => void;
  canUpload: boolean;
  limits: { imageMb: number; fileMb: number };
}) {
  const t = useTranslations("admin.media");
  const text = useMessageText();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<MediaAssetDTO[]>([]);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<MediaAssetDTO | null>(null);
  const kindsKey = kinds.join(",");

  const load = useCallback(
    async (nextPage: number, query: string, append: boolean) => {
      setLoading(true);
      setError(null);
      const r = await listMediaAction({ q: query || undefined, kinds: kindsKey.split(",") as MediaKind[], page: nextPage });
      setLoading(false);
      if (!r.ok) return setError(text(r.error.message));
      setItems((prev) => (append ? [...prev, ...r.data.items] : r.data.items));
      setPage(r.data.page);
      setPageCount(r.data.pageCount);
    },
    [kindsKey, text],
  );

  useEffect(() => {
    if (!open) return;
    setSelected(null);
    void load(1, q, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload on open only; search has its own trigger
  }, [open, load]);

  const choose = (asset: MediaAssetDTO) => {
    onSelect(asset);
    onOpenChange(false);
  };

  const accept = kinds.includes("IMAGE") && kinds.length === 1 ? "image/jpeg,image/png,image/webp,image/gif,image/avif" : undefined;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      closeLabel={t("details.close")}
      size="xl"
      footer={
        <Button type="button" disabled={!selected} onClick={() => selected && choose(selected)}>
          <Check aria-hidden="true" /> {t("picker.insert")}
        </Button>
      }
    >
      <div className="space-y-4">
        {canUpload ? (
          <MediaUploadZone
            compact
            limits={limits}
            accept={accept}
            allowLinks={kinds.includes("VIDEO_LINK")}
            onAdded={(added) => {
              const usable = added.filter((a) => kinds.includes(a.kind));
              setItems((prev) => [...usable, ...prev.filter((p) => !usable.some((u) => u.id === p.id))]);
              if (usable.length === 1) setSelected(usable[0]!);
            }}
          />
        ) : null}
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            void load(1, q, false);
          }}
          className="flex gap-2"
        >
          <label htmlFor="media-picker-q" className="sr-only">
            {t("searchLabel")}
          </label>
          <div className="relative flex-1">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-secondary" />
            <Input id="media-picker-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("searchPlaceholder")} className="pl-9" />
          </div>
          <Button type="submit" variant="outline">
            {t("filter")}
          </Button>
        </form>
        {error ? (
          <p role="alert" className="text-sm text-status-rejected">
            {error}
          </p>
        ) : null}
        {items.length ? (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {items.map((a) => {
              const isSel = selected?.id === a.id;
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    aria-pressed={isSel}
                    onClick={() => setSelected(a)}
                    onDoubleClick={() => choose(a)}
                    className={cn(
                      "relative block w-full overflow-hidden rounded-card border bg-surface-card text-left focus-visible:outline-2 focus-visible:outline-ojetil-red",
                      isSel ? "border-ojetil-red ring-2 ring-ojetil-red" : "border-border-subtle hover:border-border-strong",
                    )}
                  >
                    <MediaThumb asset={a} />
                    <span className="block px-2 py-2">
                      <span className="block truncate text-xs font-medium" title={a.fileName}>
                        {a.fileName}
                      </span>
                      <MediaMeta asset={a} />
                    </span>
                    {isSel ? (
                      <span className="absolute right-2 top-2 inline-flex size-6 items-center justify-center rounded-full bg-ojetil-red text-white">
                        <Check aria-hidden="true" className="size-4" />
                        <span className="sr-only">{t("picker.selected")}</span>
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : !loading ? (
          <p className="rounded-card border border-dashed border-border-subtle p-6 text-center text-sm text-ink-secondary">{q ? t("noResults") : t("empty")}</p>
        ) : null}
        {loading ? <Loader2 aria-hidden="true" className="mx-auto size-6 animate-spin text-ink-secondary" /> : null}
        {!loading && page < pageCount ? (
          <div className="text-center">
            <Button type="button" variant="outline" size="sm" onClick={() => void load(page + 1, q, true)}>
              {t("picker.loadMore")}
            </Button>
          </div>
        ) : null}
      </div>
    </Dialog>
  );
}
