"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarClock, ExternalLink, ImageIcon, Loader2, RefreshCw, Save, Send, Trash2, Undo2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import type { ContentStatus } from "@prisma/client";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { applyFieldErrors, FormFeedback, type Feedback } from "@/components/admin/form-feedback";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { MediaPicker } from "@/components/admin/media/media-picker";
import { useMessageText } from "@/components/i18n/message-text";
import { DateTime24Input } from "@/components/forms/date-time-24";
import { Field, fieldAria, selectClassName, textareaClassName } from "@/components/forms/field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AppLocale } from "@/config/locales";
import { MUNICIPALITIES } from "@/config/municipalities";
import { adminDateTime } from "@/lib/admin-format";
import { fromDiliLocalInput } from "@/lib/dates";
import { slugify } from "@/lib/slug";
import { cn } from "@/lib/utils";
import { CONTENT_LOCALES, type ContentLocale } from "@/modules/content/admin-schema";
import { formatFileSize } from "@/modules/documents/schema";
import { deleteNewsArticle, saveNewsArticle } from "@/modules/news/admin-actions";
import { newsFormSchema, type NewsFormValues } from "@/modules/news/admin-schema";
import { NEWS_CATEGORY_VALUES } from "@/modules/news/categories";

export interface DocumentOption {
  id: string;
  title: string;
  fileSize: number;
  unpublished?: boolean;
}

/** Cover image: chosen from (or uploaded into) the Media library. */
function CoverImageField({
  value,
  onChange,
  disabled,
  maxBytes,
  maxMediaBytes,
}: {
  value: string;
  onChange: (url: string) => void;
  disabled: boolean;
  maxBytes: number;
  maxMediaBytes: number;
}) {
  const [picking, setPicking] = useState(false);
  const t = useTranslations("admin.news");
  const tMedia = useTranslations("admin.media");

  return (
    <div className="space-y-1.5">
      <span id="cover-label" className="text-sm font-medium text-ink">
        {t("fields.coverImage")}
      </span>
      {value ? (
        <div className="overflow-hidden rounded-card border border-border-subtle">
          {/* eslint-disable-next-line @next/next/no-img-element -- admin preview of an arbitrary uploaded/https image */}
          <img src={value} alt="" className="aspect-[16/9] w-full bg-surface-muted object-cover" />
          <div className="flex gap-1 border-t border-border-subtle p-1.5">
            <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={() => setPicking(true)}>
              <RefreshCw aria-hidden="true" /> {t("editor.coverReplace")}
            </Button>
            <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={() => onChange("")} className="text-status-rejected">
              <X aria-hidden="true" /> {t("editor.coverRemove")}
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          aria-labelledby="cover-label"
          aria-describedby="cover-hint"
          disabled={disabled}
          onClick={() => setPicking(true)}
          className="flex aspect-[16/10] w-full flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed border-border-subtle text-sm text-ink-secondary transition-colors hover:border-border-strong hover:text-ink disabled:opacity-60"
        >
          <ImageIcon aria-hidden="true" className="size-6" />
          {t("editor.coverChoose")}
        </button>
      )}
      <p id="cover-hint" className="text-xs text-ink-secondary">
        {t("editor.coverHint", { mb: Math.round(maxBytes / 1_048_576) })}
      </p>
      <MediaPicker
        open={picking}
        onOpenChange={setPicking}
        kinds={["IMAGE"]}
        title={tMedia("picker.titleImages")}
        canUpload={!disabled}
        limits={{ imageMb: Math.round(maxBytes / 1_048_576), fileMb: Math.round(maxMediaBytes / 1_048_576) }}
        onSelect={(asset) => onChange(asset.url)}
      />
    </div>
  );
}

export function NewsEditor({
  initial,
  readOnly,
  canPublish,
  documents,
  maxImageBytes,
  maxMediaBytes,
  publishedSlug,
}: {
  initial: NewsFormValues;
  readOnly: boolean;
  canPublish: boolean;
  documents: DocumentOption[];
  maxImageBytes: number;
  maxMediaBytes: number;
  /** Slug currently live on the site (for the "View on site" link). */
  publishedSlug: string | null;
}) {
  const router = useRouter();
  const t = useTranslations("admin.news");
  const tStatus = useTranslations("admin.status.content");
  const tCommon = useTranslations("admin.common");
  const text = useMessageText();
  const uiLocale = useLocale() as AppLocale;
  const [feedback, setFeedback] = useState<Feedback>(null);
  // Open on the first language that has content (an article may be Portuguese-only).
  const [locale, setLocale] = useState<ContentLocale>(() => CONTENT_LOCALES.find((l) => initial.translations[l]?.title?.trim()) ?? "TET");
  const [scheduling, setScheduling] = useState(false);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const isNew = !initial.id;
  const savedStatus = initial.status as ContentStatus;

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<NewsFormValues>({ resolver: zodResolver(newsFormSchema), defaultValues: initial, mode: "onSubmit", reValidateMode: "onChange" });

  const announce = (f: Feedback) => {
    setFeedback(f);
    requestAnimationFrame(() => feedbackRef.current?.focus());
  };

  const submit = (status: ContentStatus, successMessage: string) => {
    setValue("status", status);
    return handleSubmit(
      async (values) => {
        const r = await saveNewsArticle(values);
        if (!r.ok) {
          setValue("status", savedStatus);
          applyFieldErrors(r.error.fieldErrors, setError as never);
          const firstLocale = CONTENT_LOCALES.find((l) => Object.keys(r.error.fieldErrors ?? {}).some((k) => k.startsWith(`translations.${l}.`)));
          if (firstLocale) setLocale(firstLocale);
          return announce({ kind: "error", message: r.error.message });
        }
        if (isNew) {
          router.push(`/admin/berita/${r.data.id}?saved=1`);
          return;
        }
        setValue("slug", r.data.slug);
        setValue("publishedAt", r.data.publishedAt);
        setScheduling(false);
        announce({ kind: "success", message: successMessage });
        router.refresh();
      },
      (errs) => {
        setValue("status", savedStatus);
        const tErr = (errs.translations ?? {}) as Partial<Record<ContentLocale, unknown>>;
        const firstLocale = CONTENT_LOCALES.find((l) => tErr[l]);
        if (firstLocale) setLocale(firstLocale);
        announce({ kind: "error", message: t("validation.checkAllTabs") });
      },
    )();
  };

  async function onDelete() {
    if (!initial.id) return;
    const r = await deleteNewsArticle({ id: initial.id });
    if (r.ok) router.push("/admin/berita");
    else announce({ kind: "error", message: r.error.message });
  }

  const translations = watch("translations");
  const tErrors = (errors.translations ?? {}) as Partial<Record<ContentLocale, Record<string, { message?: string }>>>;
  const publishedAtInput = watch("publishedAt");
  // Slug placeholder: Tetun title, else the first title written in any language.
  const tetTitle = translations.TET.title?.trim() || CONTENT_LOCALES.map((l) => translations[l].title?.trim()).find(Boolean) || "";
  const scheduleDate = publishedAtInput ? fromDiliLocalInput(publishedAtInput) : null;
  const isFuture = scheduleDate ? scheduleDate.getTime() > Date.now() : false;
  const live = savedStatus === "PUBLISHED";
  const savedDate = initial.publishedAt ? fromDiliLocalInput(initial.publishedAt) : null;
  const alreadyOut = live && savedDate !== null && savedDate.getTime() <= Date.now();
  const statusBadge =
    savedStatus === "PUBLISHED"
      ? isFuture
        ? { tone: "info" as const, label: t("editor.scheduled") }
        : { tone: "verified" as const, label: tStatus("PUBLISHED") }
      : savedStatus === "ARCHIVED"
        ? { tone: "pending" as const, label: tStatus("ARCHIVED") }
        : { tone: "neutral" as const, label: tStatus("DRAFT") };

  // Primary button keeps the article's current state; Publish/Unpublish change it.
  const primaryStatus: ContentStatus = isNew ? "DRAFT" : savedStatus;
  const primaryLabel = isNew || savedStatus === "DRAFT" ? t("editor.saveDraft") : live ? t("editor.update") : tCommon("saveChanges");

  const localeState = (l: ContentLocale) => {
    const v = translations[l];
    if (tErrors[l] && Object.keys(tErrors[l]!).length) return "error";
    if (v.title?.trim() && v.body?.trim()) return "complete";
    if (Object.values(v).some((x) => x.trim())) return "partial";
    return "empty";
  };

  return (
    <form onSubmit={(e) => (e.preventDefault(), void submit(primaryStatus, t("toast.saved")))} noValidate className="space-y-6">
      <FormFeedback ref={feedbackRef} feedback={feedback} />
      <fieldset disabled={readOnly || isSubmitting} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        {/* ── Content (per language) ─────────────────────────────── */}
        <section aria-label={t("editor.contentSection")} className="flex min-w-0 flex-col gap-5 rounded-card border border-border-subtle bg-surface-card p-5 md:p-7">
          <div>
            <div role="tablist" aria-label={t("editor.contentLanguage")} className="inline-flex max-w-full gap-1 overflow-x-auto rounded-card bg-surface-muted p-1">
              {CONTENT_LOCALES.map((l) => {
                const state = localeState(l);
                return (
                  <button
                    key={l}
                    type="button"
                    role="tab"
                    id={`lang-tab-${l}`}
                    aria-selected={locale === l}
                    aria-controls="lang-panel"
                    onClick={() => setLocale(l)}
                    className={cn(
                      "inline-flex min-h-tap shrink-0 items-center gap-2 rounded-control px-3.5 text-[0.9375rem] transition-colors md:min-h-10",
                      locale === l ? "bg-surface-card font-semibold text-ink shadow-sm" : "text-ink-secondary hover:text-ink",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "size-2 rounded-full",
                        state === "complete" && "bg-status-verified",
                        state === "partial" && "bg-status-pending",
                        state === "error" && "bg-status-rejected",
                        state === "empty" && "bg-border-strong/50",
                      )}
                    />
                    {t(`languages.${l}`)}
                    <span className="sr-only">
                      ({t(`editor.localeState.${state}`)})
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-sm text-ink-secondary">{t("editor.primaryHint")}</p>
          </div>

          {/* Flex column down to the editor: on wide screens the editor stretches to the sidebar's height. */}
          <div role="tabpanel" id="lang-panel" aria-labelledby={`lang-tab-${locale}`} className="flex flex-1 flex-col gap-5">
            {CONTENT_LOCALES.map((l) => {
              const id = (f: string) => `translations-${l}-${f}`;
              const err = (f: string) => tErrors[l]?.[f]?.message;
              return (
                <div key={l} hidden={locale !== l} lang={l.toLowerCase()}>
                  <Field id={id("title")} label={t("fields.title")} required error={err("title")}>
                    <Input disabled={readOnly} {...fieldAria(id("title"), { error: err("title") })} {...register(`translations.${l}.title`)} />
                  </Field>
                </div>
              );
            })}

            <Field id="slug" label={t("fields.slug")} hint={t("fields.slugHint")} error={errors.slug?.message}>
              <Input
                className="font-mono text-sm"
                placeholder={slugify(tetTitle ?? "") || "titulu-artigu"}
                {...fieldAria("slug", { hint: true, error: errors.slug?.message })}
                {...register("slug")}
              />
            </Field>

            {CONTENT_LOCALES.map((l) => {
              const id = (f: string) => `translations-${l}-${f}`;
              const err = (f: string) => tErrors[l]?.[f]?.message;
              return (
                <div key={l} hidden={locale !== l} lang={l.toLowerCase()} className={cn("flex-1 flex-col gap-5", locale === l ? "flex" : "hidden")}>
                  <Field id={id("excerpt")} label={t("fields.excerpt")} hint={t("fields.excerptHint")} error={err("excerpt")}>
                    <textarea rows={3} disabled={readOnly} className={textareaClassName} {...fieldAria(id("excerpt"), { hint: true, error: err("excerpt") })} {...register(`translations.${l}.excerpt`)} />
                  </Field>
                  <div className="flex flex-1 flex-col gap-1.5">
                    <span id={`${id("body")}-label`} className="text-sm font-medium text-ink">
                      {t("fields.body")}
                      <span aria-hidden="true" className="ml-0.5 text-ojetil-red">*</span>
                    </span>
                    <Controller
                      control={control}
                      name={`translations.${l}.body`}
                      render={({ field }) => (
                        <RichTextEditor
                          id={id("body")}
                          labelledBy={`${id("body")}-label`}
                          value={field.value}
                          onChange={field.onChange}
                          disabled={readOnly}
                          invalid={Boolean(err("body"))}
                          describedBy={err("body") ? `${id("body")}-error` : undefined}
                          maxImageBytes={maxImageBytes}
                          maxMediaBytes={maxMediaBytes}
                          lang={l.toLowerCase()}
                          fill
                        />
                      )}
                    />
                    {err("body") ? (
                      <p id={`${id("body")}-error`} className="text-sm text-status-rejected">
                        {text(err("body")!)}
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Sidebar ─────────────────────────────────────────────── */}
        <div className="space-y-6 xl:self-start">
          <section aria-labelledby="publishing-heading" className="space-y-4 rounded-card border border-border-subtle bg-surface-card p-5 md:p-6">
            <h2 id="publishing-heading" className="font-serif text-lg font-semibold">
              {t("editor.publishing")}
            </h2>
            <Badge tone={statusBadge.tone}>{statusBadge.label}</Badge>

            <div className="rounded-card border border-border-subtle bg-paper/60 p-3">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <CalendarClock aria-hidden="true" className="size-4 text-ink-secondary" />
                <span className="text-ink-secondary">{live && !isFuture ? t("editor.publishedLabel") : t("editor.publishLabel")}</span>
                <span className="font-semibold">{scheduleDate ? adminDateTime(scheduleDate, uiLocale) : t("editor.immediately")}</span>
                {!readOnly ? (
                  <button type="button" onClick={() => setScheduling((s) => !s)} aria-expanded={scheduling} aria-controls="publishedAt" className="font-semibold text-ojetil-red hover:underline">
                    {scheduling ? t("editor.doneDate") : t("editor.editDate")}
                  </button>
                ) : null}
              </p>
              {scheduling ? (
                <div className="mt-3 space-y-2">
                  <label htmlFor="publishedAt" className="text-xs font-medium text-ink-secondary">
                    {t("editor.dateLabel")}
                  </label>
                  <Controller
                    control={control}
                    name="publishedAt"
                    render={({ field }) => (
                      <DateTime24Input
                        id="publishedAt"
                        value={field.value}
                        onChange={field.onChange}
                        invalid={Boolean(errors.publishedAt?.message)}
                        dateLabel={tCommon("dateField")}
                        timeLabel={tCommon("timeField")}
                        calendarLabel={tCommon("openCalendar")}
                      />
                    )}
                  />
                  {publishedAtInput ? (
                    <button type="button" onClick={() => setValue("publishedAt", "", { shouldDirty: true })} className="inline-flex items-center gap-1 text-sm font-semibold text-ink-secondary hover:text-ink">
                      <Undo2 aria-hidden="true" className="size-3.5" /> {alreadyOut ? t("editor.keepOriginalDate") : t("editor.publishImmediately")}
                    </button>
                  ) : null}
                </div>
              ) : null}
              {errors.publishedAt?.message ? <p className="mt-2 text-sm text-status-rejected">{text(errors.publishedAt.message)}</p> : null}
            </div>

            {!readOnly ? (
              <div className="space-y-2">
                <Button type="submit" className="w-full" aria-busy={isSubmitting}>
                  {isSubmitting ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Save aria-hidden="true" />}
                  {isSubmitting ? tCommon("saving") : primaryLabel}
                </Button>
                {isNew ? (
                  <p className="text-sm text-ink-secondary">{t("editor.saveFirst")}</p>
                ) : canPublish ? (
                  live ? (
                    <Button type="button" variant="outline" className="w-full" onClick={() => void submit("DRAFT", t("toast.unpublished"))}>
                      {t("editor.unpublish")}
                    </Button>
                  ) : (
                    <Button type="button" variant="editorial" className="w-full" onClick={() => void submit("PUBLISHED", isFuture ? t("toast.scheduled") : t("toast.published"))}>
                      <Send aria-hidden="true" /> {isFuture ? t("editor.schedule") : t("editor.publish")}
                    </Button>
                  )
                ) : (
                  <p className="text-sm text-ink-secondary">{t("editor.cannotPublish")}</p>
                )}
              </div>
            ) : null}

            {live && publishedSlug && !isFuture ? (
              <a href={`/notisia/${publishedSlug}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-tap items-center gap-1.5 text-sm font-semibold text-ojetil-red hover:underline">
                {t("editor.viewOnSite")} <ExternalLink aria-hidden="true" className="size-4" />
              </a>
            ) : null}
            {!isNew && !readOnly ? (
              <div className="border-t border-border-subtle pt-3">
                <ConfirmDialog
                  title={tCommon("deletePermanentlyTitle")}
                  description={tCommon("deletePermanentlyDescription")}
                  confirmLabel={tCommon("delete")}
                  tone="destructive"
                  onConfirm={onDelete}
                  trigger={
                    <Button type="button" variant="ghost" size="sm" className="text-status-rejected hover:bg-status-rejected-bg">
                      <Trash2 aria-hidden="true" /> {t("editor.deleteArticle")}
                    </Button>
                  }
                />
              </div>
            ) : null}
          </section>

          <section aria-labelledby="details-heading" className="space-y-5 rounded-card border border-border-subtle bg-surface-card p-5 md:p-6">
            <h2 id="details-heading" className="font-serif text-lg font-semibold">
              {t("editor.details")}
            </h2>
            <Field id="category" label={t("fields.category")} error={errors.category?.message}>
              <select className={selectClassName} {...fieldAria("category", { error: errors.category?.message })} {...register("category")}>
                {NEWS_CATEGORY_VALUES.map((c) => (
                  <option key={c} value={c}>
                    {t(`categories.${c}`)}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="municipality" label={t("fields.municipality")} hint={t("fields.municipalityHint")} error={errors.municipality?.message}>
              <select className={selectClassName} {...fieldAria("municipality", { hint: true, error: errors.municipality?.message })} {...register("municipality")}>
                <option value="">{t("fields.municipalityNone")}</option>
                {MUNICIPALITIES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </Field>
            <Controller
              control={control}
              name="coverImageUrl"
              render={({ field }) => <CoverImageField value={field.value} onChange={(url) => field.onChange(url)} disabled={readOnly} maxBytes={maxImageBytes} maxMediaBytes={maxMediaBytes} />}
            />
            {errors.coverImageUrl?.message ? <p className="text-sm text-status-rejected">{text(errors.coverImageUrl.message)}</p> : null}
            <Field id="documentId" label={t("fields.document")} hint={t("fields.documentHint")} error={errors.documentId?.message}>
              <select className={selectClassName} {...fieldAria("documentId", { hint: true, error: errors.documentId?.message })} {...register("documentId")}>
                <option value="">{t("fields.documentNone")}</option>
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title} ({formatFileSize(d.fileSize)}){d.unpublished ? t("fields.documentUnpublished") : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="byline" label={t("fields.byline")} hint={t("fields.bylineHint")} error={errors.byline?.message}>
              <Input {...fieldAria("byline", { hint: true, error: errors.byline?.message })} {...register("byline")} />
            </Field>
            <Field id="tags" label={t("fields.tags")} hint={t("fields.tagsHint")} error={errors.tags?.message}>
              <Input {...fieldAria("tags", { hint: true, error: errors.tags?.message })} {...register("tags")} />
            </Field>
            <label className="flex min-h-tap items-center gap-3 text-sm">
              <input type="checkbox" className="size-5 accent-ojetil-red" {...register("isFeatured")} />
              {t("fields.isFeatured")}
            </label>
          </section>
        </div>
      </fieldset>
    </form>
  );
}
