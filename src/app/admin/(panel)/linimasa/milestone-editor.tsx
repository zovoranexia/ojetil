"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { EditorActions } from "@/components/admin/editor-actions";
import { applyFieldErrors, FormFeedback, type Feedback } from "@/components/admin/form-feedback";
import { TranslationTabs } from "@/components/admin/translation-tabs";
import { Field, fieldAria, selectClassName } from "@/components/forms/field";
import { Input } from "@/components/ui/input";
import { CONTENT_STATUSES } from "@/modules/content/admin-common";
import { deleteMilestone, saveMilestone } from "@/modules/content/institutional-actions";
import { DATE_PRECISIONS, TIMELINE_TRANSLATION_FIELDS, timelineFormSchema, type TimelineFormValues } from "@/modules/content/institutional-schema";

const PRECISION_LABEL = { DECADE: "Decade (“1980s”)", YEAR: "Year", MONTH: "Month & year", DAY: "Exact date" } as const;
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function MilestoneEditor({ initial, readOnly, canPublish }: { initial: TimelineFormValues; readOnly: boolean; canPublish: boolean }) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<Feedback>(null);
  const ref = useRef<HTMLDivElement>(null);
  const isNew = !initial.id;
  const { register, handleSubmit, watch, setError, formState: { errors, isSubmitting } } = useForm<TimelineFormValues>({
    resolver: zodResolver(timelineFormSchema),
    defaultValues: initial,
    reValidateMode: "onChange",
  });
  const announce = (f: Feedback) => {
    setFeedback(f);
    requestAnimationFrame(() => ref.current?.focus());
  };
  const onSubmit = handleSubmit(
    async (values) => {
      const r = await saveMilestone(values);
      if (!r.ok) {
        applyFieldErrors(r.error.fieldErrors, setError as never);
        return announce({ kind: "error", message: r.error.message });
      }
      if (isNew) return router.push(`/admin/linimasa/${r.data.id}`);
      announce({ kind: "success", message: "Milestone saved." });
      router.refresh();
    },
    () => announce({ kind: "error", message: "Please correct the highlighted fields (check every language tab)." }),
  );
  const precision = watch("datePrecision");
  const err = (k: keyof TimelineFormValues) => (errors[k] as { message?: string } | undefined)?.message;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <FormFeedback ref={ref} feedback={feedback} />
      <fieldset disabled={readOnly} className="grid gap-6 xl:grid-cols-[1fr_20rem]">
        <TranslationTabs fields={TIMELINE_TRANSLATION_FIELDS} register={register} watch={watch} errors={errors} disabled={readOnly} />
        <div className="space-y-5 rounded-card border border-border-subtle bg-surface-card p-5 xl:self-start">
          <Field id="status" label="Status" required error={err("status")}>
            <select className={selectClassName} {...fieldAria("status", { error: err("status") })} {...register("status")}>
              {CONTENT_STATUSES.map((s) => (
                <option key={s} value={s} disabled={s === "PUBLISHED" && !canPublish}>
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </Field>
          <Field id="datePrecision" label="Date precision" required hint="Only claim the precision the sources support." error={err("datePrecision")}>
            <select className={selectClassName} {...fieldAria("datePrecision", { hint: true, error: err("datePrecision") })} {...register("datePrecision")}>
              {DATE_PRECISIONS.map((p) => (
                <option key={p} value={p}>
                  {PRECISION_LABEL[p]}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field id="year" label="Year" required error={err("year")} className={precision === "DAY" || precision === "MONTH" ? "" : "col-span-3"}>
              <Input type="number" inputMode="numeric" className="tabular-nums" {...fieldAria("year", { error: err("year") })} {...register("year")} />
            </Field>
            {precision === "MONTH" || precision === "DAY" ? (
              <Field id="month" label="Month" required error={err("month")} className={precision === "MONTH" ? "col-span-2" : ""}>
                <select className={selectClassName} {...fieldAria("month", { error: err("month") })} {...register("month")}>
                  <option value="" />
                  {MONTHS.map((m, i) => (
                    <option key={m} value={String(i + 1)}>
                      {m.slice(0, 3)}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}
            {precision === "DAY" ? (
              <Field id="day" label="Day" required error={err("day")}>
                <Input type="number" inputMode="numeric" min={1} max={31} {...fieldAria("day", { error: err("day") })} {...register("day")} />
              </Field>
            ) : null}
          </div>
          <Field id="slug" label="Anchor slug" required hint="/istoria#your-slug" error={err("slug")}>
            <Input className="font-mono text-sm" {...fieldAria("slug", { hint: true, error: err("slug") })} {...register("slug")} />
          </Field>
          <Field id="displayOrder" label="Display order" required hint="Lower numbers appear first." error={err("displayOrder")}>
            <Input type="number" inputMode="numeric" {...fieldAria("displayOrder", { hint: true, error: err("displayOrder") })} {...register("displayOrder")} />
          </Field>
          <label className="flex min-h-tap items-center gap-3 text-sm">
            <input type="checkbox" className="size-5 accent-ojetil-red" {...register("isHighlighted")} /> Highlight (home page teaser)
          </label>
          <Field id="imageUrl" label="Image URL" error={err("imageUrl")}>
            <Input {...fieldAria("imageUrl", { error: err("imageUrl") })} {...register("imageUrl")} />
          </Field>
        </div>
      </fieldset>
      {!readOnly ? (
        <EditorActions
          saving={isSubmitting}
          canDelete={!isNew}
          onDelete={async () => {
            const r = await deleteMilestone({ id: initial.id! });
            if (r.ok) router.push("/admin/linimasa");
            else announce({ kind: "error", message: r.error.message });
          }}
          saveLabel={isNew ? "Create milestone" : "Save changes"}
        />
      ) : null}
    </form>
  );
}
