"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ExternalLink, FileText, Loader2, Save, Trash2, Upload, Wand2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import type { ContentStatus } from "@prisma/client";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { applyFieldErrors, FormFeedback, type Feedback } from "@/components/admin/form-feedback";
import { TranslationTabs } from "@/components/admin/translation-tabs";
import { Field, fieldAria } from "@/components/forms/field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActionResult } from "@/lib/actions";
import { slugify } from "@/lib/slug";
import { deleteDocument, publishDocument, unpublishDocument } from "@/modules/documents/admin-actions";
import { DOCUMENT_TRANSLATION_FIELDS, documentDownloadPath, documentFormSchema, formatFileSize, type DocumentFormValues } from "@/modules/documents/schema";

interface Existing {
  id: string;
  status: ContentStatus;
  fileName: string;
  fileSize: number;
  articleCount: number;
}

export function DocumentEditor({
  initial,
  existing,
  readOnly,
  canPublish,
  maxBytes,
}: {
  initial: DocumentFormValues;
  existing: Existing | null;
  readOnly: boolean;
  canPublish: boolean;
  maxBytes: number;
}) {
  const router = useRouter();
  const t = useTranslations("admin.documents.editor");
  const tv = useTranslations("admin.documents.validation");
  const tc = useTranslations("admin.common");
  const tStatus = useTranslations("admin.status.content");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();
  const feedbackRef = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<DocumentFormValues>({ resolver: zodResolver(documentFormSchema), defaultValues: initial });

  const announce = (f: Feedback) => {
    setFeedback(f);
    requestAnimationFrame(() => feedbackRef.current?.focus());
  };

  function pickFile(f: File | null) {
    setFileError(undefined);
    if (!f) return setFile(null);
    if (f.type && f.type !== "application/pdf") return setFileError(tv("chooseFile"));
    if (f.size > maxBytes) return setFileError(tv("tooLarge", { size: formatFileSize(maxBytes) }));
    setFile(f);
    if (!getValues("slug")) setValue("slug", slugify(f.name.replace(/\.pdf$/i, "")));
  }

  const onSubmit = handleSubmit(
    async (values) => {
      if (!existing && !file) {
        setFileError(tv("chooseFile"));
        return announce({ kind: "error", message: t("chooseFileToUpload") });
      }
      const body = new FormData();
      body.set("data", JSON.stringify(values));
      if (file) body.set("file", file);
      let r: ActionResult<{ id: string }>;
      try {
        const res = await fetch(existing ? `/api/admin/documents/${existing.id}` : "/api/admin/documents", { method: "POST", body });
        r = (await res.json()) as ActionResult<{ id: string }>;
        if (!("ok" in r)) throw new Error();
      } catch {
        return announce({ kind: "error", message: t("uploadFailed") });
      }
      if (!r.ok) {
        applyFieldErrors(r.error.fieldErrors, setError as never);
        if (r.error.fieldErrors?.file?.[0]) setFileError(r.error.fieldErrors.file[0]);
        return announce({ kind: "error", message: r.error.message });
      }
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
      if (!existing) return router.push(`/admin/dokumen/${r.data.id}?saved=1`);
      announce({ kind: "success", message: t("saved") });
      router.refresh();
    },
    () => announce({ kind: "error", message: t("checkTabs") }),
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

  const busy = isSubmitting || pending;
  const published = existing?.status === "PUBLISHED";

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <FormFeedback ref={feedbackRef} feedback={feedback} />
      <fieldset disabled={readOnly || busy} className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <TranslationTabs fields={DOCUMENT_TRANSLATION_FIELDS} register={register} watch={watch} errors={errors} disabled={readOnly} />
          <div className="space-y-5 rounded-card border border-border-subtle bg-surface-card p-5">
            <Field id="file" label={t("fileLabel")} required={!existing} hint={t("fileHint", { size: formatFileSize(maxBytes) })} error={fileError}>
              <label
                htmlFor="file"
                className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed border-border-subtle p-4 text-center text-sm text-ink-secondary hover:border-border-strong"
              >
                <Upload aria-hidden="true" className="size-5" />
                {file ? (
                  <span className="font-medium text-ink">
                    {file.name} · {formatFileSize(file.size)}
                  </span>
                ) : existing ? (
                  t("chooseReplacement")
                ) : (
                  t("choosePdf")
                )}
              </label>
              <input
                ref={fileInput}
                type="file"
                accept="application/pdf,.pdf"
                className="sr-only"
                {...fieldAria("file", { hint: true, error: fileError })}
                onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
              />
            </Field>
            {existing ? (
              <p className="flex flex-wrap items-center gap-2 text-sm">
                <FileText aria-hidden="true" className="size-4 text-ink-secondary" />
                {t("currentFile")} <span className="font-medium">{existing.fileName}</span> · {formatFileSize(existing.fileSize)}
                <a href={`/api/admin/documents/${existing.id}/file`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-ojetil-red hover:underline">
                  {t("open")} <ExternalLink aria-hidden="true" className="size-3.5" />
                </a>
              </p>
            ) : null}
          </div>
        </div>

        <div className="space-y-5 xl:self-start">
          <section className="space-y-4 rounded-card border border-border-subtle bg-surface-card p-5">
            <h2 className="font-serif text-lg font-semibold">{t("publishing")}</h2>
            <Badge tone={published ? "verified" : "neutral"}>{tStatus(published ? "PUBLISHED" : "DRAFT")}</Badge>
            <Field id="slug" label={t("slugLabel")} required hint={existing && published ? documentDownloadPath(watch("slug") || "…") : t("slugHint")} error={errors.slug?.message}>
              <div className="flex gap-2">
                <Input className="font-mono text-sm" {...fieldAria("slug", { hint: true, error: errors.slug?.message })} {...register("slug")} />
                <button
                  type="button"
                  title={t("generateSlugTitle")}
                  onClick={() => setValue("slug", slugify(getValues("translations.TET.title") ?? ""), { shouldValidate: true })}
                  className="inline-flex size-tap shrink-0 items-center justify-center rounded-control border border-border-subtle hover:border-border-strong md:size-10"
                >
                  <Wand2 aria-hidden="true" className="size-4" />
                  <span className="sr-only">{t("generateSlugSr")}</span>
                </button>
              </div>
            </Field>
            {!readOnly ? (
              <Button type="submit" className="w-full" aria-busy={isSubmitting}>
                {isSubmitting ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Save aria-hidden="true" />}
                {isSubmitting ? tc("saving") : existing ? tc("saveChanges") : t("uploadAndSave")}
              </Button>
            ) : null}
            {!existing ? <p className="text-sm text-ink-secondary">{t("saveDraftFirst")}</p> : null}
            {existing && canPublish && !readOnly ? (
              published ? (
                <Button type="button" variant="outline" className="w-full" onClick={() => run(() => unpublishDocument({ id: existing.id }), t("unpublishedToast"))}>
                  {t("unpublish")}
                </Button>
              ) : (
                <Button type="button" variant="editorial" className="w-full" onClick={() => run(() => publishDocument({ id: existing.id }), t("publishedToast"))}>
                  {t("publish")}
                </Button>
              )
            ) : null}
            {existing && published ? (
              <a href={documentDownloadPath(initial.slug)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-tap items-center gap-1.5 text-sm font-semibold text-ojetil-red hover:underline">
                {t("publicLink")} <ExternalLink aria-hidden="true" className="size-4" />
              </a>
            ) : null}
            {existing && !readOnly ? (
              <ConfirmDialog
                title={t("deleteTitle")}
                description={
                  existing.articleCount
                    ? t("deleteAttached", { count: existing.articleCount })
                    : t("deleteUnattached")
                }
                confirmLabel={tc("delete")}
                tone="destructive"
                onConfirm={() => run(() => deleteDocument({ id: existing.id }), "", () => router.push("/admin/dokumen"))}
                trigger={
                  <Button type="button" variant="ghost" size="sm" className="text-status-rejected hover:bg-status-rejected-bg">
                    <Trash2 aria-hidden="true" /> {tc("delete")}
                  </Button>
                }
              />
            ) : null}
          </section>
        </div>
      </fieldset>
    </form>
  );
}
