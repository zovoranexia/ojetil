"use client";

import { Link2, Loader2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { Dialog } from "@/components/admin/dialog";
import { useMessageText } from "@/components/i18n/message-text";
import { Field } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { addVideoLink } from "@/modules/media/admin-actions";
import { MEDIA_ACCEPT, type MediaAssetDTO } from "@/modules/media/schema";
import { uploadMediaFile } from "./media-common";

/**
 * Drop zone + "Choose files" + "Add video by link". Files are uploaded one by
 * one (keeps each request under the size limit and shows progress); every
 * success is reported through `onAdded`.
 */
export function MediaUploadZone({
  onAdded,
  accept = MEDIA_ACCEPT,
  allowLinks = true,
  limits,
  compact = false,
}: {
  onAdded: (assets: MediaAssetDTO[]) => void;
  accept?: string;
  allowLinks?: boolean;
  limits: { imageMb: number; fileMb: number };
  compact?: boolean;
}) {
  const t = useTranslations("admin.media");
  const text = useMessageText();
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [done, setDone] = useState<number | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);

  async function uploadAll(files: File[]) {
    if (!files.length) return;
    setErrors([]);
    setDone(null);
    const added: MediaAssetDTO[] = [];
    const failed: string[] = [];
    for (let i = 0; i < files.length; i++) {
      setProgress({ current: i + 1, total: files.length });
      const r = await uploadMediaFile(files[i]!);
      if (r.ok) added.push(r.asset);
      else failed.push(t("uploadFailed", { name: files[i]!.name, error: text(r.message) }));
    }
    setProgress(null);
    setErrors(failed);
    if (added.length) {
      setDone(added.length);
      onAdded(added);
    }
  }

  return (
    <div
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        void uploadAll(Array.from(e.dataTransfer.files));
      }}
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-card border-2 border-dashed text-center transition-colors",
        compact ? "p-4" : "px-4 py-8",
        dragging ? "border-ojetil-red bg-status-rejected-bg/40" : "border-border-subtle",
      )}
    >
      {progress ? <Loader2 aria-hidden="true" className="size-7 animate-spin text-ink-secondary" /> : <Upload aria-hidden="true" className="size-7 text-ink-secondary" />}
      <div>
        <p className="font-semibold">{progress ? t("uploading", progress) : t("dropTitle")}</p>
        {!compact ? <p className="mt-1 text-sm text-ink-secondary">{t("dropHint")}</p> : null}
        <p className="mt-1 text-xs text-ink-secondary">{t("limits", limits)}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button type="button" size="sm" disabled={Boolean(progress)} onClick={() => input.current?.click()}>
          <Upload aria-hidden="true" /> {t("chooseFiles")}
        </Button>
        {allowLinks ? (
          <Button type="button" size="sm" variant="outline" disabled={Boolean(progress)} onClick={() => setLinkOpen(true)}>
            <Link2 aria-hidden="true" /> {t("addLink")}
          </Button>
        ) : null}
      </div>
      <div aria-live="polite" className="w-full space-y-1 text-sm">
        {done ? <p className="text-status-verified">{t("uploaded", { count: done })}</p> : null}
        {errors.map((e) => (
          <p key={e} className="text-status-rejected">
            {e}
          </p>
        ))}
      </div>
      <input
        ref={input}
        type="file"
        multiple
        accept={accept}
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          void uploadAll(files);
        }}
      />
      {allowLinks ? <VideoLinkDialog open={linkOpen} onOpenChange={setLinkOpen} onAdded={(a) => onAdded([a])} /> : null}
    </div>
  );
}

export function VideoLinkDialog({ open, onOpenChange, onAdded }: { open: boolean; onOpenChange: (o: boolean) => void; onAdded: (asset: MediaAssetDTO) => void }) {
  const t = useTranslations("admin.media");
  const tCommon = useTranslations("admin.common");
  const text = useMessageText();
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    const r = await addVideoLink({ url, title });
    setBusy(false);
    if (!r.ok) return setError(text(r.error.fieldErrors?.url?.[0] ?? r.error.message));
    setUrl("");
    setTitle("");
    onOpenChange(false);
    onAdded(r.data);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("link.title")}
      closeLabel={t("details.close")}
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {tCommon("cancel")}
          </Button>
          <Button type="button" disabled={busy || !url.trim()} onClick={() => void submit()}>
            {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null} {t("link.add")}
          </Button>
        </>
      }
    >
      <div className="space-y-4 text-left">
        <Field id="media-link-url" label={t("link.urlLabel")} required error={error ?? undefined}>
          <Input
            id="media-link-url"
            value={url}
            placeholder="https://www.youtube.com/watch?v=…"
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void submit();
              }
            }}
          />
        </Field>
        <Field id="media-link-title" label={t("link.titleLabel")}>
          <Input id="media-link-title" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} />
        </Field>
      </div>
    </Dialog>
  );
}
