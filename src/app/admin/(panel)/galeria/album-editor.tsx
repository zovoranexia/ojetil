"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowDown, ArrowUp, ExternalLink, ImagePlus, Library, Loader2, Save, Star, Trash2, Wand2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRef, useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import type { ContentStatus } from "@prisma/client";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { applyFieldErrors, FormFeedback, type Feedback } from "@/components/admin/form-feedback";
import { MediaMeta, MediaThumb, uploadMediaFile } from "@/components/admin/media/media-common";
import { MediaPicker } from "@/components/admin/media/media-picker";
import { TranslationTabs } from "@/components/admin/translation-tabs";
import { useMessageText } from "@/components/i18n/message-text";
import { DateTime24Input } from "@/components/forms/date-time-24";
import { Field, fieldAria, selectClassName } from "@/components/forms/field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MUNICIPALITIES } from "@/config/municipalities";
import type { ActionResult } from "@/lib/actions";
import { slugify } from "@/lib/slug";
import { deleteAlbum, publishAlbum, saveAlbum, unpublishAlbum } from "@/modules/gallery/admin-actions";
import { GALLERY_MAX_ITEMS, GALLERY_MEDIA_KINDS, GALLERY_TRANSLATION_FIELDS, galleryFormSchema, type GalleryFormValues } from "@/modules/gallery/schema";
import type { MediaAssetDTO } from "@/modules/media/schema";

type Values = Omit<GalleryFormValues, "items">;
interface Item {
  asset: MediaAssetDTO;
  caption: string;
}

const formSchema = galleryFormSchema.omit({ items: true });

export function AlbumEditor({
  initial,
  initialItems,
  existing,
  events,
  readOnly,
  canPublish,
  limits,
}: {
  initial: Values;
  initialItems: Item[];
  existing: { id: string; status: ContentStatus; slug: string } | null;
  events: Array<{ id: string; label: string }>;
  readOnly: boolean;
  canPublish: boolean;
  limits: { imageMb: number; fileMb: number };
}) {
  const router = useRouter();
  const t = useTranslations("admin.gallery.editor");
  const tc = useTranslations("admin.common");
  const tStatus = useTranslations("admin.status.content");
  const text = useMessageText();
  const [items, setItems] = useState<Item[]>(initialItems);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [upload, setUpload] = useState<{ done: number; total: number; failed: number } | null>(null);
  const [pending, startTransition] = useTransition();
  const feedbackRef = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    getValues,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(formSchema), defaultValues: initial });

  const announce = (f: Feedback) => {
    setFeedback(f);
    requestAnimationFrame(() => feedbackRef.current?.focus());
  };

  const addAssets = (assets: MediaAssetDTO[]) =>
    setItems((prev) => {
      const seen = new Set(prev.map((i) => i.asset.id));
      const next = [...prev];
      for (const a of assets) if (!seen.has(a.id) && next.length < GALLERY_MAX_ITEMS) next.push({ asset: a, caption: "" });
      return next;
    });

  async function uploadFiles(files: FileList | null) {
    if (!files?.length) return;
    const list = Array.from(files).slice(0, GALLERY_MAX_ITEMS - items.length);
    let failed = 0;
    setUpload({ done: 0, total: list.length, failed: 0 });
    // One at a time: each file is re-encoded on the server; parallel uploads would only queue there.
    for (const [i, file] of list.entries()) {
      const r = await uploadMediaFile(file);
      if (r.ok) addAssets([r.asset]);
      else failed++;
      setUpload({ done: i + 1, total: list.length, failed });
    }
    if (fileInput.current) fileInput.current.value = "";
    if (failed) announce({ kind: "error", message: t("uploadFailed", { count: failed }) });
    setTimeout(() => setUpload(null), 2500);
  }

  const move = (from: number, to: number) =>
    setItems((prev) => {
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      const [it] = next.splice(from, 1);
      next.splice(to, 0, it!);
      return next;
    });

  const onSubmit = handleSubmit(
    async (values) => {
      const r = await saveAlbum({ ...values, items: items.map((i) => ({ assetId: i.asset.id, caption: i.caption })) });
      if (!r.ok) {
        applyFieldErrors(r.error.fieldErrors, setError as never);
        return announce({ kind: "error", message: r.error.message });
      }
      if (!existing) return router.push(`/admin/galeria/${r.data.id}?saved=1`);
      announce({ kind: "success", message: t("saved") });
      router.refresh();
    },
    () => announce({ kind: "error", message: t("checkFields") }),
  );

  function run(action: () => Promise<ActionResult<{ id: string }>>, success: string, after?: () => void) {
    startTransition(async () => {
      const r = await action();
      if (!r.ok) return announce({ kind: "error", message: r.error.message });
      if (after) return after();
      announce({ kind: "success", message: success });
      router.refresh();
    });
  }

  const busy = isSubmitting || pending || upload !== null;
  const published = existing?.status === "PUBLISHED";

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <FormFeedback ref={feedbackRef} feedback={feedback} />
      <fieldset disabled={readOnly || isSubmitting || pending} className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-6">
          <TranslationTabs fields={GALLERY_TRANSLATION_FIELDS} register={register} watch={watch} errors={errors} disabled={readOnly} requirement="any" />

          {/* Photos & videos */}
          <section aria-labelledby="album-items" className="space-y-4 rounded-card border border-border-subtle bg-surface-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 id="album-items" className="font-serif text-lg font-semibold">
                  {t("itemsTitle")} <span className="font-sans text-sm font-normal text-ink-secondary tabular-nums">({items.length})</span>
                </h2>
                <p className="text-sm text-ink-secondary">{t("itemsHint", { imageMb: limits.imageMb, fileMb: limits.fileMb })}</p>
              </div>
              {!readOnly ? (
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => fileInput.current?.click()} disabled={busy}>
                    <ImagePlus aria-hidden="true" /> {t("upload")}
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setPickerOpen(true)} disabled={busy}>
                    <Library aria-hidden="true" /> {t("fromLibrary")}
                  </Button>
                  <input
                    ref={fileInput}
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,image/gif,image/avif,video/mp4"
                    className="sr-only"
                    tabIndex={-1}
                    aria-label={t("upload")}
                    onChange={(e) => void uploadFiles(e.target.files)}
                  />
                </div>
              ) : null}
            </div>

            {upload ? (
              <p role="status" className="flex items-center gap-2 rounded-control bg-status-info-bg px-3 py-2 text-sm text-status-info">
                {upload.done < upload.total ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
                {t("uploading", { done: upload.done, total: upload.total })}
              </p>
            ) : null}

            {items.length ? (
              <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((it, i) => (
                  <li key={it.asset.id} className="overflow-hidden rounded-card border border-border-subtle bg-paper">
                    <div className="relative">
                      <MediaThumb asset={it.asset} className="aspect-[4/3]" />
                      {i === 0 ? (
                        <Badge tone="heritageDark" className="absolute left-2 top-2">
                          <Star aria-hidden="true" className="size-3" /> {t("cover")}
                        </Badge>
                      ) : null}
                      <span className="absolute right-2 top-2 rounded-control bg-ink/70 px-1.5 text-xs font-semibold tabular-nums text-white">{i + 1}</span>
                    </div>
                    <div className="space-y-2 p-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{it.asset.fileName}</p>
                        <MediaMeta asset={it.asset} />
                      </div>
                      <label className="sr-only" htmlFor={`caption-${it.asset.id}`}>
                        {t("caption", { n: i + 1 })}
                      </label>
                      <Input
                        id={`caption-${it.asset.id}`}
                        value={it.caption}
                        maxLength={300}
                        placeholder={t("captionPlaceholder")}
                        disabled={readOnly}
                        onChange={(e) => setItems((prev) => prev.map((p, j) => (j === i ? { ...p, caption: e.target.value } : p)))}
                        className="text-sm"
                      />
                      {!readOnly ? (
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} className="inline-flex size-9 items-center justify-center rounded-control hover:bg-surface-muted disabled:opacity-30" title={t("moveUp")}>
                            <ArrowUp aria-hidden="true" className="size-4" />
                            <span className="sr-only">{t("moveUp")}</span>
                          </button>
                          <button type="button" onClick={() => move(i, i + 1)} disabled={i === items.length - 1} className="inline-flex size-9 items-center justify-center rounded-control hover:bg-surface-muted disabled:opacity-30" title={t("moveDown")}>
                            <ArrowDown aria-hidden="true" className="size-4" />
                            <span className="sr-only">{t("moveDown")}</span>
                          </button>
                          {i > 0 && it.asset.kind === "IMAGE" ? (
                            <button type="button" onClick={() => move(i, 0)} className="inline-flex min-h-9 items-center gap-1 rounded-control px-2 text-xs font-semibold hover:bg-surface-muted">
                              <Star aria-hidden="true" className="size-3.5" /> {t("makeCover")}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => setItems((prev) => prev.filter((_, j) => j !== i))}
                            className="ml-auto inline-flex size-9 items-center justify-center rounded-control text-status-rejected hover:bg-status-rejected-bg"
                            title={t("remove")}
                          >
                            <X aria-hidden="true" className="size-4" />
                            <span className="sr-only">{t("remove")}</span>
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="rounded-card border-2 border-dashed border-border-subtle px-4 py-10 text-center text-sm text-ink-secondary">{t("empty")}</p>
            )}
          </section>
        </div>

        <div className="space-y-5 xl:self-start">
          <section className="space-y-4 rounded-card border border-border-subtle bg-surface-card p-5">
            <h2 className="font-serif text-lg font-semibold">{t("publishing")}</h2>
            <Badge tone={published ? "verified" : "neutral"}>{tStatus(published ? "PUBLISHED" : "DRAFT")}</Badge>
            <Field id="slug" label={t("slug")} required hint={t("slugHint")} error={errors.slug?.message}>
              <div className="flex gap-2">
                <Input className="font-mono text-sm" {...fieldAria("slug", { hint: true, error: errors.slug?.message })} {...register("slug")} />
                <button
                  type="button"
                  title={t("generateSlug")}
                  onClick={() => {
                    const tr = getValues("translations");
                    const title = tr.TET.title || tr.PT.title || tr.ID.title || tr.EN.title || "";
                    setValue("slug", slugify(title), { shouldValidate: true });
                  }}
                  className="inline-flex size-tap shrink-0 items-center justify-center rounded-control border border-border-subtle hover:border-border-strong md:size-10"
                >
                  <Wand2 aria-hidden="true" className="size-4" />
                  <span className="sr-only">{t("generateSlug")}</span>
                </button>
              </div>
            </Field>
            {!readOnly ? (
              <Button type="submit" className="w-full" aria-busy={isSubmitting} disabled={busy}>
                {isSubmitting ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Save aria-hidden="true" />}
                {isSubmitting ? tc("saving") : existing ? tc("saveChanges") : t("create")}
              </Button>
            ) : null}
            {existing && canPublish && !readOnly ? (
              published ? (
                <Button type="button" variant="outline" className="w-full" disabled={busy} onClick={() => run(() => unpublishAlbum({ id: existing.id }), t("unpublishedToast"))}>
                  {t("unpublish")}
                </Button>
              ) : (
                <Button type="button" variant="editorial" className="w-full" disabled={busy} onClick={() => run(() => publishAlbum({ id: existing.id }), t("publishedToast"))}>
                  {t("publish")}
                </Button>
              )
            ) : null}
            {existing && !published ? <p className="text-xs text-ink-secondary">{t("publishHint")}</p> : null}
            {existing && published ? (
              <a href={`/galeria/${existing.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-tap items-center gap-1.5 text-sm font-semibold text-ojetil-red hover:underline">
                {t("viewPublic")} <ExternalLink aria-hidden="true" className="size-4" />
              </a>
            ) : null}
          </section>

          <section className="space-y-4 rounded-card border border-border-subtle bg-surface-card p-5">
            <h2 className="font-serif text-lg font-semibold">{t("details")}</h2>
            <Field id="takenOn" label={t("takenOn")} hint={t("takenOnHint")} error={errors.takenOn?.message ? text(errors.takenOn.message) : undefined}>
              <Controller
                control={control}
                name="takenOn"
                render={({ field }) => (
                  <DateTime24Input id="takenOn" dateOnly value={field.value ?? ""} onChange={field.onChange} invalid={Boolean(errors.takenOn)} describedBy="takenOn-hint" dateLabel={tc("dateField")} timeLabel={tc("timeField")} calendarLabel={tc("openCalendar")} />
                )}
              />
            </Field>
            <Field id="municipality" label={t("municipality")}>
              <select className={selectClassName} {...fieldAria("municipality", {})} {...register("municipality")}>
                <option value="">{t("noMunicipality")}</option>
                {MUNICIPALITIES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="eventId" label={t("event")} hint={t("eventHint")} error={errors.eventId?.message}>
              <select className={selectClassName} {...fieldAria("eventId", { hint: true, error: errors.eventId?.message })} {...register("eventId")}>
                <option value="">{t("noEvent")}</option>
                {events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.label}
                  </option>
                ))}
              </select>
            </Field>
          </section>

          {existing && !readOnly ? (
            <ConfirmDialog
              title={t("deleteTitle")}
              description={t("deleteBody")}
              confirmLabel={tc("delete")}
              tone="destructive"
              onConfirm={() => run(() => deleteAlbum({ id: existing.id }), "", () => router.push("/admin/galeria"))}
              trigger={
                <Button type="button" variant="ghost" size="sm" className="text-status-rejected hover:bg-status-rejected-bg">
                  <Trash2 aria-hidden="true" /> {tc("delete")}
                </Button>
              }
            />
          ) : null}
        </div>
      </fieldset>

      <MediaPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        kinds={[...GALLERY_MEDIA_KINDS]}
        title={t("fromLibrary")}
        canUpload={!readOnly}
        limits={limits}
        onSelect={(asset) => addAssets([asset])}
      />
    </form>
  );
}
