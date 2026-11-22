"use client";

import { Check, Copy, ExternalLink, Loader2, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Dialog } from "@/components/admin/dialog";
import { useMessageText } from "@/components/i18n/message-text";
import { Field, textareaClassName } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AppLocale } from "@/config/locales";
import { adminDateTime } from "@/lib/admin-format";
import { deleteMedia, updateMedia } from "@/modules/media/admin-actions";
import type { MediaAssetDTO } from "@/modules/media/schema";
import { MediaMeta } from "./media-common";

function Preview({ asset }: { asset: MediaAssetDTO }) {
  if (asset.kind === "IMAGE") {
    // eslint-disable-next-line @next/next/no-img-element -- admin preview of an uploaded image
    return <img src={asset.url} alt={asset.altText ?? ""} className="max-h-[50vh] w-full rounded-control bg-surface-muted object-contain" />;
  }
  if (asset.kind === "VIDEO_LINK") {
    return (
      <div className="relative aspect-video overflow-hidden rounded-control bg-ink">
        <iframe src={asset.url} title={asset.fileName} allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen className="absolute inset-0 size-full border-0" />
      </div>
    );
  }
  if (asset.kind === "VIDEO") return <video src={asset.url} controls preload="metadata" className="max-h-[50vh] w-full rounded-control bg-ink" />;
  if (asset.kind === "AUDIO") return <audio src={asset.url} controls preload="metadata" className="w-full" />;
  return null;
}

/** View, edit (name, credit, alt text), copy the link of, or delete one media item. */
export function MediaDetailsDialog({
  asset,
  onClose,
  canWrite,
  onChanged,
  onDeleted,
}: {
  asset: MediaAssetDTO | null;
  onClose: () => void;
  canWrite: boolean;
  onChanged: (asset: MediaAssetDTO) => void;
  onDeleted: (id: string) => void;
}) {
  const t = useTranslations("admin.media.details");
  const text = useMessageText();
  const uiLocale = useLocale() as AppLocale;
  const [form, setForm] = useState({ fileName: "", credit: "", altText: "" });
  const [status, setStatus] = useState<{ kind: "ok" | "error"; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  // Reset only when a different item is opened (not when the saved item comes back updated).
  const assetId = asset?.id;
  useEffect(() => {
    if (asset) setForm({ fileName: asset.fileName, credit: asset.credit ?? "", altText: asset.altText ?? "" });
    setStatus(null);
    setCopied(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the item id on purpose
  }, [assetId]);

  if (!asset) return null;
  const absoluteUrl = asset.url.startsWith("/") && typeof window !== "undefined" ? `${window.location.origin}${asset.url}` : asset.url;

  async function save() {
    if (!asset) return;
    setBusy(true);
    const r = await updateMedia({ id: asset.id, ...form });
    setBusy(false);
    if (!r.ok) return setStatus({ kind: "error", message: text(Object.values(r.error.fieldErrors ?? {})[0]?.[0] ?? r.error.message) });
    setStatus({ kind: "ok", message: t("saved") });
    onChanged(r.data);
  }

  async function remove() {
    if (!asset) return;
    setBusy(true);
    const r = await deleteMedia({ id: asset.id });
    setBusy(false);
    if (!r.ok) return setStatus({ kind: "error", message: text(r.error.message) });
    onDeleted(asset.id);
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => (!o ? onClose() : undefined)}
      title={t("title")}
      closeLabel={t("close")}
      size="lg"
      footer={
        canWrite ? (
          <>
            <ConfirmDialog
              title={t("deleteTitle")}
              description={t("deleteDescription")}
              confirmLabel={t("delete")}
              tone="destructive"
              onConfirm={() => void remove()}
              trigger={
                <Button type="button" variant="ghost" className="mr-auto text-status-rejected hover:bg-status-rejected-bg" disabled={busy}>
                  <Trash2 aria-hidden="true" /> {t("delete")}
                </Button>
              }
            />
            <Button type="button" disabled={busy || !form.fileName.trim()} onClick={() => void save()}>
              {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null} {t("save")}
            </Button>
          </>
        ) : undefined
      }
    >
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-2">
          <Preview asset={asset} />
          <MediaMeta asset={asset} />
          {asset.width && asset.height ? <p className="text-xs text-ink-secondary">{t("dimensions", { width: asset.width, height: asset.height })}</p> : null}
          <p className="text-xs text-ink-secondary">
            {asset.createdBy ? t("addedBy", { name: asset.createdBy, date: adminDateTime(new Date(asset.createdAt), uiLocale) }) : t("addedOn", { date: adminDateTime(new Date(asset.createdAt), uiLocale) })}
          </p>
        </div>
        <fieldset disabled={!canWrite || busy} className="space-y-4">
          <Field id="media-name" label={t("fileName")}>
            <Input id="media-name" value={form.fileName} maxLength={200} onChange={(e) => setForm({ ...form, fileName: e.target.value })} />
          </Field>
          <Field id="media-credit" label={t("credit")} hint={t("creditHint")}>
            <Input id="media-credit" value={form.credit} maxLength={200} onChange={(e) => setForm({ ...form, credit: e.target.value })} />
          </Field>
          {asset.kind === "IMAGE" ? (
            <Field id="media-alt" label={t("altText")} hint={t("altHint")}>
              <textarea id="media-alt" rows={3} maxLength={300} className={textareaClassName} value={form.altText} onChange={(e) => setForm({ ...form, altText: e.target.value })} />
            </Field>
          ) : null}
          <div className="space-y-1.5">
            <span className="text-sm font-medium">{t("link")}</span>
            <p className="break-all rounded-control bg-surface-muted px-2 py-1.5 font-mono text-xs">{absoluteUrl}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  void navigator.clipboard.writeText(absoluteUrl).then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  })
                }
              >
                {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />} {copied ? t("copied") : t("copyLink")}
              </Button>
              <Button asChild size="sm" variant="ghost">
                <a href={asset.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink aria-hidden="true" /> {t("open")}
                </a>
              </Button>
            </div>
          </div>
          {status ? (
            <p role={status.kind === "error" ? "alert" : "status"} className={status.kind === "error" ? "text-sm text-status-rejected" : "text-sm text-status-verified"}>
              {status.message}
            </p>
          ) : null}
        </fieldset>
      </div>
    </Dialog>
  );
}
