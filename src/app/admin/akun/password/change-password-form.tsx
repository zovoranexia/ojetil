"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { applyFieldErrors, FormFeedback, type Feedback } from "@/components/admin/form-feedback";
import { Field, fieldAria } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { changeOwnPassword } from "@/modules/auth/password-actions";
import { changePasswordSchema, type ChangePasswordInput } from "@/modules/auth/password-schema";

export function ChangePasswordForm() {
  const t = useTranslations("admin.account");
  const tCommon = useTranslations("admin.common");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const ref = useRef<HTMLDivElement>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
    reValidateMode: "onChange",
  });

  const onSubmit = handleSubmit(async (values) => {
    const r = await changeOwnPassword(values);
    if (r.ok) {
      // Every session of this account has ended; sign in again with the new password.
      window.location.assign("/admin/login?changed=1");
      return;
    }
    applyFieldErrors(r.error.fieldErrors, setError as never);
    setFeedback({ kind: "error", message: r.error.message });
    requestAnimationFrame(() => ref.current?.focus());
  });

  const err = (k: keyof ChangePasswordInput) => errors[k]?.message;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <FormFeedback ref={ref} feedback={feedback} />
      <Field id="currentPassword" label={t("currentPassword")} required error={err("currentPassword")}>
        <Input type="password" autoComplete="current-password" {...fieldAria("currentPassword", { error: err("currentPassword") })} {...register("currentPassword")} />
      </Field>
      <Field id="newPassword" label={t("newPassword")} required hint={t("newPasswordHint")} error={err("newPassword")}>
        <Input type="password" autoComplete="new-password" {...fieldAria("newPassword", { hint: true, error: err("newPassword") })} {...register("newPassword")} />
      </Field>
      <Field id="confirmPassword" label={t("confirmPassword")} required error={err("confirmPassword")}>
        <Input type="password" autoComplete="new-password" {...fieldAria("confirmPassword", { error: err("confirmPassword") })} {...register("confirmPassword")} />
      </Field>
      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting} aria-busy={isSubmitting}>
        {isSubmitting ? <Loader2 aria-hidden="true" className="animate-spin" /> : <ShieldCheck aria-hidden="true" />}
        {isSubmitting ? tCommon("saving") : t("submit")}
      </Button>
    </form>
  );
}
