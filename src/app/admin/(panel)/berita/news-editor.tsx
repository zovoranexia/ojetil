"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ExternalLink, Wand2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { EditorActions } from "@/components/admin/editor-actions";
import { applyFieldErrors, FormFeedback, type Feedback } from "@/components/admin/form-feedback";
import { TranslationTabs } from "@/components/admin/translation-tabs";
import { Field, fieldAria, selectClassName } from "@/components/forms/field";
import { Input } from "@/components/ui/input";
import { slugify } from "@/lib/slug";
import { CONTENT_STATUSES } from "@/modules/content/admin-common";
import { deleteNewsArticle, saveNewsArticle } from "@/modules/news/admin-actions";
import { NEWS_TRANSLATION_FIELDS, newsFormSchema, type NewsFormValues } from "@/modules/news/admin-schema";
import { NEWS_CATEGORY_LABELS, NEWS_CATEGORY_VALUES } from "@/modules/news/categories";

export function NewsEditor({ initial, readOnly, canPublish }: { initial: NewsFormValues; readOnly: boolean; canPublish: boolean }) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<Feedback>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const isNew = !initial.id;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<NewsFormValues>({ resolver: zodResolver(newsFormSchema), defaultValues: initial, mode: "onSubmit", reValidateMode: "onChange" });

  const announce = (f: Feedback) => {
    setFeedback(f);
    requestAnimationFrame(() => feedbackRef.current?.focus());
  };

  const onSubmit = handleSubmit(
    async (values) => {
      const r = await saveNewsArticle(values);
      if (!r.ok) {
        applyFieldErrors(r.error.fieldErrors, setError as never);
        return announce({ kind: "error", message: r.error.message });
      }
      if (isNew) {
        router.push(`/admin/berita/${r.data.id}?saved=1`);
        return;
      }
      announce({ kind: "success", message: "Article saved." });
      router.refresh();
    },
    () => announce({ kind: "error", message: "Please correct the highlighted fields (check every language tab)." }),
  );

  async function onDelete() {
    if (!initial.id) return;
    const r = await deleteNewsArticle({ id: initial.id });
    if (r.ok) router.push("/admin/berita");
    else announce({ kind: "error", message: r.error.message });
  }

  const status = watch("status");

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <FormFeedback ref={feedbackRef} feedback={feedback} />
      <fieldset disabled={readOnly} className="grid gap-6 xl:grid-cols-[1fr_20rem]">
        <TranslationTabs fields={NEWS_TRANSLATION_FIELDS} register={register} watch={watch} errors={errors} disabled={readOnly} />

        <div className="space-y-5 rounded-card border border-border-subtle bg-surface-card p-5 xl:self-start">
          <Field id="status" label="Status" required error={errors.status?.message} hint={!canPublish ? "Your role cannot publish." : undefined}>
            <select className={selectClassName} {...fieldAria("status", { error: errors.status?.message })} {...register("status")}>
              {CONTENT_STATUSES.map((s) => (
                <option key={s} value={s} disabled={s === "PUBLISHED" && !canPublish}>
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </Field>
          <Field id="category" label="Category" required error={errors.category?.message}>
            <select className={selectClassName} {...fieldAria("category", { error: errors.category?.message })} {...register("category")}>
              {NEWS_CATEGORY_VALUES.map((c) => (
                <option key={c} value={c}>
                  {NEWS_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </Field>
          <Field id="slug" label="URL slug" required hint="/notisia/your-slug" error={errors.slug?.message}>
            <div className="flex gap-2">
              <Input className="font-mono text-sm" {...fieldAria("slug", { hint: true, error: errors.slug?.message })} {...register("slug")} />
              <button
                type="button"
                title="Generate from the Tetun title"
                onClick={() => setValue("slug", slugify(getValues("translations.TET.title") ?? ""), { shouldValidate: true, shouldDirty: true })}
                className="inline-flex size-tap shrink-0 items-center justify-center rounded-control border border-border-subtle hover:border-border-strong md:size-10"
              >
                <Wand2 aria-hidden="true" className="size-4" />
                <span className="sr-only">Generate slug from Tetun title</span>
              </button>
            </div>
          </Field>
          <Field id="publishedAt" label="Publication date (Díli time)" hint="Leave empty to use the moment you publish." error={errors.publishedAt?.message}>
            <Input type="datetime-local" {...fieldAria("publishedAt", { hint: true, error: errors.publishedAt?.message })} {...register("publishedAt")} />
          </Field>
          <Field id="coverImageUrl" label="Cover image URL" hint="Optional. Hidden automatically in Low-Data Mode." error={errors.coverImageUrl?.message}>
            <Input placeholder="/uploads/… or https://…" {...fieldAria("coverImageUrl", { hint: true, error: errors.coverImageUrl?.message })} {...register("coverImageUrl")} />
          </Field>
          <label className="flex min-h-tap items-center gap-3 text-sm">
            <input type="checkbox" className="size-5 accent-ojetil-red" {...register("isFeatured")} />
            Feature on the home page
          </label>
          {!isNew && status === "PUBLISHED" ? (
            <a href={`/notisia/${initial.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-tap items-center gap-1.5 text-sm font-semibold text-ojetil-red hover:underline">
              View on site <ExternalLink aria-hidden="true" className="size-4" />
            </a>
          ) : null}
        </div>
      </fieldset>
      {!readOnly ? <EditorActions saving={isSubmitting} canDelete={!isNew} onDelete={onDelete} saveLabel={isNew ? "Create article" : "Save changes"} /> : null}
    </form>
  );
}
