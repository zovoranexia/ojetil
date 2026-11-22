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
import { CONTENT_STATUSES } from "@/modules/content/admin-common";
import { saveProfileSection } from "@/modules/content/institutional-actions";
import { PROFILE_TRANSLATION_FIELDS, profileFormSchema, type ProfileFormValues } from "@/modules/content/institutional-schema";

export function ProfileEditor({ initial, readOnly, canPublish }: { initial: ProfileFormValues; readOnly: boolean; canPublish: boolean }) {
  const t = useTranslations("admin.profile");
  const tc = useTranslations("admin.content");
  const tStatus = useTranslations("admin.status.content");
  const router = useRouter();
  const [feedback, setFeedback] = useState<Feedback>(null);
  const ref = useRef<HTMLDivElement>(null);
  const { register, handleSubmit, watch, setError, formState: { errors, isSubmitting } } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: initial,
    reValidateMode: "onChange",
  });
  const announce = (f: Feedback) => {
    setFeedback(f);
    requestAnimationFrame(() => ref.current?.focus());
  };
  const onSubmit = handleSubmit(
    async (values) => {
      const r = await saveProfileSection(values);
      if (!r.ok) {
        applyFieldErrors(r.error.fieldErrors, setError as never);
        return announce({ kind: "error", message: r.error.message });
      }
      announce({ kind: "success", message: t("saved") });
      router.refresh();
    },
    () => announce({ kind: "error", message: tc("checkEveryTab") }),
  );
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <FormFeedback ref={ref} feedback={feedback} />
      <fieldset disabled={readOnly} className="space-y-6">
        <Field id="status" label={tc("status")} required error={errors.status?.message} className="max-w-xs">
          <select className={selectClassName} {...fieldAria("status", { error: errors.status?.message })} {...register("status")}>
            {CONTENT_STATUSES.map((s) => (
              <option key={s} value={s} disabled={s === "PUBLISHED" && !canPublish}>
                {tStatus(s)}
              </option>
            ))}
          </select>
        </Field>
        <TranslationTabs fields={PROFILE_TRANSLATION_FIELDS} register={register} watch={watch} errors={errors} disabled={readOnly} />
      </fieldset>
      {!readOnly ? <EditorActions saving={isSubmitting} canDelete={false} /> : null}
    </form>
  );
}
