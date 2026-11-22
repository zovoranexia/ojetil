"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ExternalLink, FileText, Loader2, Save, Trash2, Upload, Wand2 } from "lucide-react";
import { useRouter } from "next/navigation";
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
    if (f.type && f.type !== "application/pdf") return setFileError("Choose a PDF file.");
    if (f.size > maxBytes) return setFileError(`The PDF is larger than ${formatFileSize(maxBytes)}.`);
    setFile(f);
    if (!getValues("slug")) setValue("slug", slugify(f.name.replace(/\.pdf$/i, "")));
  }

  const onSubmit = handleSubmit(
    async (values) => {
      if (!existing && !file) {
        setFileError("Choose a PDF file.");
        return announce({ kind: "error", message: "Choose a PDF file to upload." });
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
        return announce({ kind: "error", message: "Upload failed. Check your connection and the file size, then try again." });
      }
      if (!r.ok) {
        applyFieldErrors(r.error.fieldErrors, setError as never);
        if (r.error.fieldErrors?.file?.[0]) setFileError(r.error.fieldErrors.file[0]);
        return announce({ kind: "error", message: r.error.message });
      }
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
      if (!existing) return router.push(`/admin/dokumen/${r.data.id}?saved=1`);
      announce({ kind: "success", message: "Document saved." });
      router.refresh();
    },
    () => announce({ kind: "error", message: "Please correct the highlighted fields (check every language tab)." }),
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
            <Field id="file" label="PDF file" required={!existing} hint={`PDF only, up to ${formatFileSize(maxBytes)}.`} error={fileError}>
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
                  "Choose a new PDF to replace the current file…"
                ) : (
                  "Choose a PDF…"
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
                Current file: <span className="font-medium">{existing.fileName}</span> · {formatFileSize(existing.fileSize)}
                <a href={`/api/admin/documents/${existing.id}/file`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-ojetil-red hover:underline">
                  Open <ExternalLink aria-hidden="true" className="size-3.5" />
                </a>
              </p>
            ) : null}
          </div>
        </div>

        <div className="space-y-5 xl:self-start">
          <section className="space-y-4 rounded-card border border-border-subtle bg-surface-card p-5">
            <h2 className="font-serif text-lg font-semibold">Publishing</h2>
            <Badge tone={published ? "verified" : "neutral"}>{published ? "Published" : "Draft"}</Badge>
            <Field id="slug" label="Address (slug)" required hint={existing && published ? documentDownloadPath(watch("slug") || "…") : "Letters, numbers and dashes only."} error={errors.slug?.message}>
              <div className="flex gap-2">
                <Input className="font-mono text-sm" {...fieldAria("slug", { hint: true, error: errors.slug?.message })} {...register("slug")} />
                <button
                  type="button"
                  title="Generate from the Tetun title"
                  onClick={() => setValue("slug", slugify(getValues("translations.TET.title") ?? ""), { shouldValidate: true })}
                  className="inline-flex size-tap shrink-0 items-center justify-center rounded-control border border-border-subtle hover:border-border-strong md:size-10"
                >
                  <Wand2 aria-hidden="true" className="size-4" />
                  <span className="sr-only">Generate slug from Tetun title</span>
                </button>
              </div>
            </Field>
            {!readOnly ? (
              <Button type="submit" className="w-full" aria-busy={isSubmitting}>
                {isSubmitting ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Save aria-hidden="true" />}
                {isSubmitting ? "Saving…" : existing ? "Save changes" : "Upload & save draft"}
              </Button>
            ) : null}
            {!existing ? <p className="text-sm text-ink-secondary">Save the draft first; publishing options appear afterwards.</p> : null}
            {existing && canPublish && !readOnly ? (
              published ? (
                <Button type="button" variant="outline" className="w-full" onClick={() => run(() => unpublishDocument({ id: existing.id }), "Document unpublished.")}>
                  Unpublish
                </Button>
              ) : (
                <Button type="button" variant="editorial" className="w-full" onClick={() => run(() => publishDocument({ id: existing.id }), "Document published.")}>
                  Publish
                </Button>
              )
            ) : null}
            {existing && published ? (
              <a href={documentDownloadPath(initial.slug)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-tap items-center gap-1.5 text-sm font-semibold text-ojetil-red hover:underline">
                Public download link <ExternalLink aria-hidden="true" className="size-4" />
              </a>
            ) : null}
            {existing && !readOnly ? (
              <ConfirmDialog
                title="Delete this document?"
                description={
                  existing.articleCount
                    ? `It is attached to ${existing.articleCount} article(s); they will lose the attachment. This cannot be undone and is recorded in the audit log.`
                    : "The PDF file is removed permanently. This cannot be undone and is recorded in the audit log."
                }
                confirmLabel="Delete"
                tone="destructive"
                onConfirm={() => run(() => deleteDocument({ id: existing.id }), "", () => router.push("/admin/dokumen"))}
                trigger={
                  <Button type="button" variant="ghost" size="sm" className="text-status-rejected hover:bg-status-rejected-bg">
                    <Trash2 aria-hidden="true" /> Delete
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
