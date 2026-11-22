"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { EditorActions } from "@/components/admin/editor-actions";
import { applyFieldErrors, FormFeedback, type Feedback } from "@/components/admin/form-feedback";
import { TranslationTabs } from "@/components/admin/translation-tabs";
import { Field, fieldAria, selectClassName } from "@/components/forms/field";
import { Input } from "@/components/ui/input";
import { MUNICIPALITIES } from "@/config/municipalities";
import { CONTENT_STATUSES } from "@/modules/content/admin-common";
import { deleteLeader, saveLeader } from "@/modules/content/institutional-actions";
import { LEADERSHIP_TRANSLATION_FIELDS, leadershipFormSchema, type LeadershipFormValues } from "@/modules/content/institutional-schema";

export function LeaderEditor({ initial, readOnly, canPublish }: { initial: LeadershipFormValues; readOnly: boolean; canPublish: boolean }) {
  const t = useTranslations("admin.leadership");
  const tc = useTranslations("admin.content");
  const tStatus = useTranslations("admin.status.content");
  const router = useRouter();
  const [feedback, setFeedback] = useState<Feedback>(null);
  const ref = useRef<HTMLDivElement>(null);
  const isNew = !initial.id;
  const { register, handleSubmit, watch, setError, formState: { errors, isSubmitting } } = useForm<LeadershipFormValues>({
    resolver: zodResolver(leadershipFormSchema),
    defaultValues: initial,
    reValidateMode: "onChange",
  });
  const announce = (f: Feedback) => {
    setFeedback(f);
    requestAnimationFrame(() => ref.current?.focus());
  };
  const onSubmit = handleSubmit(
    async (values) => {
      const r = await saveLeader(values);
      if (!r.ok) {
        applyFieldErrors(r.error.fieldErrors, setError as never);
        return announce({ kind: "error", message: r.error.message });
      }
      if (isNew) return router.push(`/admin/pengurus/${r.data.id}`);
      announce({ kind: "success", message: t("saved") });
      router.refresh();
    },
    () => announce({ kind: "error", message: tc("checkEveryTab") }),
  );
  const level = watch("level");
  const err = (k: keyof LeadershipFormValues) => (errors[k] as { message?: string } | undefined)?.message;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <FormFeedback ref={ref} feedback={feedback} />
      <fieldset disabled={readOnly} className="grid gap-6 xl:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <Field id="fullName" label={t("fullName")} required error={err("fullName")} className="rounded-card border border-border-subtle bg-surface-card p-5">
            <Input autoComplete="off" {...fieldAria("fullName", { error: err("fullName") })} {...register("fullName")} />
          </Field>
          <TranslationTabs fields={LEADERSHIP_TRANSLATION_FIELDS} register={register} watch={watch} errors={errors} disabled={readOnly} />
        </div>
        <div className="space-y-5 rounded-card border border-border-subtle bg-surface-card p-5 xl:self-start">
          <Field id="status" label={tc("status")} required error={err("status")}>
            <select className={selectClassName} {...fieldAria("status", { error: err("status") })} {...register("status")}>
              {CONTENT_STATUSES.map((s) => (
                <option key={s} value={s} disabled={s === "PUBLISHED" && !canPublish}>
                  {tStatus(s)}
                </option>
              ))}
            </select>
          </Field>
          <Field id="level" label={t("level")} required error={err("level")}>
            <select className={selectClassName} {...fieldAria("level", { error: err("level") })} {...register("level")}>
              <option value="NATIONAL">{t("levels.NATIONAL")}</option>
              <option value="MUNICIPAL">{t("levels.MUNICIPAL")}</option>
            </select>
          </Field>
          {level === "MUNICIPAL" ? (
            <Field id="municipality" label={t("municipality")} required error={err("municipality")}>
              <select className={selectClassName} {...fieldAria("municipality", { error: err("municipality") })} {...register("municipality")}>
                <option value="" />
                {MUNICIPALITIES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <Field id="termStart" label={t("termStart")} required error={err("termStart")}>
              <Input type="number" inputMode="numeric" {...fieldAria("termStart", { error: err("termStart") })} {...register("termStart")} />
            </Field>
            <Field id="termEnd" label={t("termEnd")} error={err("termEnd")}>
              <Input type="number" inputMode="numeric" placeholder={t("termEndPlaceholder")} {...fieldAria("termEnd", { error: err("termEnd") })} {...register("termEnd")} />
            </Field>
          </div>
          <Field id="displayOrder" label={tc("displayOrder")} required error={err("displayOrder")}>
            <Input type="number" inputMode="numeric" {...fieldAria("displayOrder", { error: err("displayOrder") })} {...register("displayOrder")} />
          </Field>
          <Field id="photoUrl" label={t("photoUrl")} error={err("photoUrl")}>
            <Input {...fieldAria("photoUrl", { error: err("photoUrl") })} {...register("photoUrl")} />
          </Field>
        </div>
      </fieldset>
      {!readOnly ? (
        <EditorActions
          saving={isSubmitting}
          canDelete={!isNew}
          onDelete={async () => {
            const r = await deleteLeader({ id: initial.id! });
            if (r.ok) router.push("/admin/pengurus");
            else announce({ kind: "error", message: r.error.message });
          }}
          saveLabel={isNew ? t("addLeader") : undefined}
        />
      ) : null}
    </form>
  );
}
