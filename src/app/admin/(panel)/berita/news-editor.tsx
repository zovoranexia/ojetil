"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarClock, ExternalLink, ImageIcon, Loader2, RefreshCw, Save, Send, Trash2, Undo2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import type { ContentStatus } from "@prisma/client";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { applyFieldErrors, FormFeedback, type Feedback } from "@/components/admin/form-feedback";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { ACCEPTED_IMAGE_TYPES, uploadEditorialImage } from "@/components/admin/upload-image";
import { Field, fieldAria, selectClassName, textareaClassName } from "@/components/forms/field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MUNICIPALITIES } from "@/config/municipalities";
import { fromDiliLocalInput } from "@/lib/dates";
import { slugify } from "@/lib/slug";
import { cn } from "@/lib/utils";
import { CONTENT_LOCALES, type ContentLocale } from "@/modules/content/admin-schema";
import { formatFileSize } from "@/modules/documents/schema";
import { deleteNewsArticle, saveNewsArticle } from "@/modules/news/admin-actions";
import { newsFormSchema, type NewsFormValues } from "@/modules/news/admin-schema";
import { NEWS_CATEGORY_LABELS, NEWS_CATEGORY_VALUES } from "@/modules/news/categories";

const LANGUAGE_NAMES: Record<ContentLocale, string> = { TET: "Tetun", PT: "Portuguese", ID: "Indonesian", EN: "English" };

const dili = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dili", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export interface DocumentOption {
  id: string;
  title: string;
  fileSize: number;
  unpublished?: boolean;
}

function CoverImageField({ value, onChange, disabled, maxBytes }: { value: string; onChange: (url: string) => void; disabled: boolean; maxBytes: number }) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function choose(file: File | undefined) {
    if (!file) return;
    setError(null);
    setUploading(true);
    const r = await uploadEditorialImage(file, maxBytes);
    setUploading(false);
    if (r.ok) onChange(r.url);
    else setError(r.message);
  }

  return (
    <div className="space-y-1.5">
      <span id="cover-label" className="text-sm font-medium text-ink">
        Cover image
      </span>
      {value ? (
        <div className="overflow-hidden rounded-card border border-border-subtle">
          {/* eslint-disable-next-line @next/next/no-img-element -- admin preview of an arbitrary uploaded/https image */}
          <img src={value} alt="" className="aspect-[16/9] w-full bg-surface-muted object-cover" />
          <div className="flex gap-1 border-t border-border-subtle p-1.5">
            <Button type="button" variant="ghost" size="sm" disabled={disabled || uploading} onClick={() => input.current?.click()}>
              {uploading ? <Loader2 aria-hidden="true" className="animate-spin" /> : <RefreshCw aria-hidden="true" />} Replace
            </Button>
            <Button type="button" variant="ghost" size="sm" disabled={disabled || uploading} onClick={() => onChange("")} className="text-status-rejected">
              <X aria-hidden="true" /> Remove
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          aria-labelledby="cover-label"
          aria-describedby="cover-hint"
          disabled={disabled || uploading}
          onClick={() => input.current?.click()}
          className="flex aspect-[16/10] w-full flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed border-border-subtle text-sm text-ink-secondary transition-colors hover:border-border-strong hover:text-ink disabled:opacity-60"
        >
          {uploading ? <Loader2 aria-hidden="true" className="size-6 animate-spin" /> : <ImageIcon aria-hidden="true" className="size-6" />}
          {uploading ? "Uploading…" : "Choose…"}
        </button>
      )}
      <p id="cover-hint" className="text-xs text-ink-secondary">
        JPEG, PNG or WebP up to {Math.round(maxBytes / 1_048_576)} MB. Resized and compressed automatically; hidden in Low-Data Mode.
      </p>
      {error ? (
        <p role="alert" className="text-sm text-status-rejected">
          {error}
        </p>
      ) : null}
      <input
        ref={input}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES}
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          void choose(e.target.files?.[0]);
          e.target.value = "";
        }}
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
  publishedSlug,
}: {
  initial: NewsFormValues;
  readOnly: boolean;
  canPublish: boolean;
  documents: DocumentOption[];
  maxImageBytes: number;
  /** Slug currently live on the site (for the "View on site" link). */
  publishedSlug: string | null;
}) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [locale, setLocale] = useState<ContentLocale>("TET");
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
        announce({ kind: "error", message: "Please correct the highlighted fields (check every language tab)." });
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
  const coverImageUrl = watch("coverImageUrl");
  const tetTitle = translations.TET.title;
  const scheduleDate = publishedAtInput ? fromDiliLocalInput(publishedAtInput) : null;
  const isFuture = scheduleDate ? scheduleDate.getTime() > Date.now() : false;
  const live = savedStatus === "PUBLISHED";
  const savedDate = initial.publishedAt ? fromDiliLocalInput(initial.publishedAt) : null;
  const alreadyOut = live && savedDate !== null && savedDate.getTime() <= Date.now();
  const statusBadge =
    savedStatus === "PUBLISHED"
      ? isFuture
        ? { tone: "info" as const, label: "Scheduled" }
        : { tone: "verified" as const, label: "Published" }
      : savedStatus === "ARCHIVED"
        ? { tone: "pending" as const, label: "Archived" }
        : { tone: "neutral" as const, label: "Draft" };

  // Primary button keeps the article's current state; Publish/Unpublish change it.
  const primaryStatus: ContentStatus = isNew ? "DRAFT" : savedStatus;
  const primaryLabel = isNew || savedStatus === "DRAFT" ? "Save draft" : live ? "Update" : "Save changes";

  const localeState = (l: ContentLocale) => {
    const v = translations[l];
    if (tErrors[l] && Object.keys(tErrors[l]!).length) return "error";
    if (v.title?.trim() && v.body?.trim()) return "complete";
    if (Object.values(v).some((x) => x.trim())) return "partial";
    return "empty";
  };

  return (
    <form onSubmit={(e) => (e.preventDefault(), void submit(primaryStatus, "Article saved."))} noValidate className="space-y-6">
      <FormFeedback ref={feedbackRef} feedback={feedback} />
      <fieldset disabled={readOnly || isSubmitting} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        {/* ── Content (per language) ─────────────────────────────── */}
        <section aria-label="Content" className="min-w-0 space-y-5 rounded-card border border-border-subtle bg-surface-card p-5 md:p-7">
          <div>
            <div role="tablist" aria-label="Content language" className="inline-flex max-w-full gap-1 overflow-x-auto rounded-card bg-surface-muted p-1">
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
                    {LANGUAGE_NAMES[l]}
                    <span className="sr-only">
                      ({state === "complete" ? "filled in" : state === "partial" ? "incomplete" : state === "error" ? "has errors" : "empty"})
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-sm text-ink-secondary">Tetum is the primary language. Others are optional — empty ones fall back to Tetum.</p>
          </div>

          <div role="tabpanel" id="lang-panel" aria-labelledby={`lang-tab-${locale}`} className="space-y-5">
            {CONTENT_LOCALES.map((l) => {
              const id = (f: string) => `translations-${l}-${f}`;
              const err = (f: string) => tErrors[l]?.[f]?.message;
              return (
                <div key={l} hidden={locale !== l} lang={l.toLowerCase()}>
                  <Field id={id("title")} label="Title" required={l === "TET"} error={err("title")}>
                    <Input disabled={readOnly} {...fieldAria(id("title"), { error: err("title") })} {...register(`translations.${l}.title`)} />
                  </Field>
                </div>
              );
            })}

            <Field id="slug" label="Address (slug)" hint="Optional — generated from the title. Letters, numbers and dashes only. Shared by all languages." error={errors.slug?.message}>
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
                <div key={l} hidden={locale !== l} lang={l.toLowerCase()} className="space-y-5">
                  <Field id={id("excerpt")} label="Summary" hint="One or two sentences shown on cards and in search results." error={err("excerpt")}>
                    <textarea rows={3} disabled={readOnly} className={textareaClassName} {...fieldAria(id("excerpt"), { hint: true, error: err("excerpt") })} {...register(`translations.${l}.excerpt`)} />
                  </Field>
                  <div className="space-y-1.5">
                    <span id={`${id("body")}-label`} className="text-sm font-medium text-ink">
                      Content{l === "TET" ? <span aria-hidden="true" className="ml-0.5 text-ojetil-red">*</span> : null}
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
                          lang={l.toLowerCase()}
                        />
                      )}
                    />
                    {err("body") ? (
                      <p id={`${id("body")}-error`} className="text-sm text-status-rejected">
                        {err("body")}
                      </p>
                    ) : null}
                  </div>
                  {coverImageUrl ? (
                    <Field id={id("coverImageAlt")} label="Cover image description (alt text)" hint="Describe the cover image for people who cannot see it." error={err("coverImageAlt")}>
                      <Input disabled={readOnly} {...fieldAria(id("coverImageAlt"), { hint: true, error: err("coverImageAlt") })} {...register(`translations.${l}.coverImageAlt`)} />
                    </Field>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Sidebar ─────────────────────────────────────────────── */}
        <div className="space-y-6 xl:self-start">
          <section aria-labelledby="publishing-heading" className="space-y-4 rounded-card border border-border-subtle bg-surface-card p-5 md:p-6">
            <h2 id="publishing-heading" className="font-serif text-lg font-semibold">
              Publishing
            </h2>
            <Badge tone={statusBadge.tone}>{statusBadge.label}</Badge>

            <div className="rounded-card border border-border-subtle bg-paper/60 p-3">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <CalendarClock aria-hidden="true" className="size-4 text-ink-secondary" />
                <span className="text-ink-secondary">{live && !isFuture ? "Published:" : "Publish:"}</span>
                <span className="font-semibold">{scheduleDate ? `${dili.format(scheduleDate)} (Díli)` : "immediately"}</span>
                {!readOnly ? (
                  <button type="button" onClick={() => setScheduling((s) => !s)} aria-expanded={scheduling} aria-controls="publishedAt" className="font-semibold text-ojetil-red hover:underline">
                    {scheduling ? "Done" : "Edit"}
                  </button>
                ) : null}
              </p>
              {scheduling ? (
                <div className="mt-3 space-y-2">
                  <label htmlFor="publishedAt" className="text-xs font-medium text-ink-secondary">
                    Date and time in Díli (UTC+9). A future time schedules the article.
                  </label>
                  <Input type="datetime-local" {...fieldAria("publishedAt", { error: errors.publishedAt?.message })} {...register("publishedAt")} />
                  {publishedAtInput ? (
                    <button type="button" onClick={() => setValue("publishedAt", "", { shouldDirty: true })} className="inline-flex items-center gap-1 text-sm font-semibold text-ink-secondary hover:text-ink">
                      <Undo2 aria-hidden="true" className="size-3.5" /> {alreadyOut ? "Keep original date" : "Publish immediately"}
                    </button>
                  ) : null}
                </div>
              ) : null}
              {errors.publishedAt?.message ? <p className="mt-2 text-sm text-status-rejected">{errors.publishedAt.message}</p> : null}
            </div>

            {!readOnly ? (
              <div className="space-y-2">
                <Button type="submit" className="w-full" aria-busy={isSubmitting}>
                  {isSubmitting ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Save aria-hidden="true" />}
                  {isSubmitting ? "Saving…" : primaryLabel}
                </Button>
                {isNew ? (
                  <p className="text-sm text-ink-secondary">Save the draft first; publishing options appear afterwards.</p>
                ) : canPublish ? (
                  live ? (
                    <Button type="button" variant="outline" className="w-full" onClick={() => void submit("DRAFT", "Article unpublished — it is a draft again.")}>
                      Unpublish
                    </Button>
                  ) : (
                    <Button type="button" variant="editorial" className="w-full" onClick={() => void submit("PUBLISHED", isFuture ? "Article scheduled." : "Article published.")}>
                      <Send aria-hidden="true" /> {isFuture ? "Schedule" : "Publish"}
                    </Button>
                  )
                ) : (
                  <p className="text-sm text-ink-secondary">Your role cannot publish.</p>
                )}
              </div>
            ) : null}

            {live && publishedSlug && !isFuture ? (
              <a href={`/notisia/${publishedSlug}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-tap items-center gap-1.5 text-sm font-semibold text-ojetil-red hover:underline">
                View on site <ExternalLink aria-hidden="true" className="size-4" />
              </a>
            ) : null}
            {!isNew && !readOnly ? (
              <div className="border-t border-border-subtle pt-3">
                <ConfirmDialog
                  title="Delete permanently?"
                  description="This cannot be undone. The deletion is recorded in the audit log."
                  confirmLabel="Delete"
                  tone="destructive"
                  onConfirm={onDelete}
                  trigger={
                    <Button type="button" variant="ghost" size="sm" className="text-status-rejected hover:bg-status-rejected-bg">
                      <Trash2 aria-hidden="true" /> Delete article
                    </Button>
                  }
                />
              </div>
            ) : null}
          </section>

          <section aria-labelledby="details-heading" className="space-y-5 rounded-card border border-border-subtle bg-surface-card p-5 md:p-6">
            <h2 id="details-heading" className="font-serif text-lg font-semibold">
              Details
            </h2>
            <Field id="category" label="Type" error={errors.category?.message}>
              <select className={selectClassName} {...fieldAria("category", { error: errors.category?.message })} {...register("category")}>
                {NEWS_CATEGORY_VALUES.map((c) => (
                  <option key={c} value={c}>
                    {NEWS_CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="municipality" label="Municipality" hint="Optional — for news about a specific município." error={errors.municipality?.message}>
              <select className={selectClassName} {...fieldAria("municipality", { hint: true, error: errors.municipality?.message })} {...register("municipality")}>
                <option value="">National (no município)</option>
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
              render={({ field }) => <CoverImageField value={field.value} onChange={(url) => field.onChange(url)} disabled={readOnly} maxBytes={maxImageBytes} />}
            />
            {errors.coverImageUrl?.message ? <p className="text-sm text-status-rejected">{errors.coverImageUrl.message}</p> : null}
            <Field id="documentId" label="PDF attachment" hint="A published document from the Documents section." error={errors.documentId?.message}>
              <select className={selectClassName} {...fieldAria("documentId", { hint: true, error: errors.documentId?.message })} {...register("documentId")}>
                <option value="">— None —</option>
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title} ({formatFileSize(d.fileSize)}){d.unpublished ? " — unpublished, hidden on the site" : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="byline" label="Byline" hint="Optional — e.g. the author's name for opinion articles." error={errors.byline?.message}>
              <Input {...fieldAria("byline", { hint: true, error: errors.byline?.message })} {...register("byline")} />
            </Field>
            <Field id="tags" label="Tags" hint="Separate with commas." error={errors.tags?.message}>
              <Input {...fieldAria("tags", { hint: true, error: errors.tags?.message })} {...register("tags")} />
            </Field>
            <label className="flex min-h-tap items-center gap-3 text-sm">
              <input type="checkbox" className="size-5 accent-ojetil-red" {...register("isFeatured")} />
              Feature on the home page
            </label>
          </section>
        </div>
      </fieldset>
    </form>
  );
}
