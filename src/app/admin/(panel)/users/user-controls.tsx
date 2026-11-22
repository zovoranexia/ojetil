"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, Loader2, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import type { Role } from "@prisma/client";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { applyFieldErrors, FormFeedback, type Feedback } from "@/components/admin/form-feedback";
import { SecretReveal } from "@/components/admin/secret-reveal";
import { useMessageText } from "@/components/i18n/message-text";
import { Field, fieldAria, selectClassName } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROLES } from "@/config/rbac";
import { changeStaffRole, createStaffUser, resetStaffPassword, setStaffActive } from "@/modules/users/actions";
import { createUserSchema, type CreateUserInput } from "@/modules/users/schema";

export function CreateUserForm() {
  const t = useTranslations("admin.users");
  const tRoles = useTranslations("admin.roles");
  const router = useRouter();
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [secret, setSecret] = useState<{ email: string; password: string } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { name: "", email: "", role: "VIEWER" },
    reValidateMode: "onChange",
  });

  const onSubmit = handleSubmit(async (values) => {
    setSecret(null);
    const r = await createStaffUser(values);
    if (!r.ok) {
      applyFieldErrors(r.error.fieldErrors, setError as never);
      setFeedback({ kind: "error", message: r.error.message });
    } else {
      setFeedback({ kind: "success", message: t("created", { email: r.data.email }) });
      setSecret({ email: r.data.email, password: r.data.temporaryPassword });
      reset();
      router.refresh();
    }
    requestAnimationFrame(() => ref.current?.focus());
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormFeedback ref={ref} feedback={feedback} />
      {secret ? <SecretReveal label={t("temporaryPasswordFor", { email: secret.email })} value={secret.password} note={t("oneTimeNote")} /> : null}
      {/* Top-aligned: an error under one field must not push the other controls down. */}
      <div className="grid gap-4 md:grid-cols-[1fr_1fr_14rem_auto] md:items-start">
        <Field id="new-name" label={t("fields.name")} required error={errors.name?.message}>
          <Input autoComplete="off" {...fieldAria("new-name", { error: errors.name?.message })} {...register("name")} />
        </Field>
        <Field id="new-email" label={t("fields.email")} required error={errors.email?.message}>
          <Input type="email" autoComplete="off" {...fieldAria("new-email", { error: errors.email?.message })} {...register("email")} />
        </Field>
        <Field id="new-role" label={t("fields.role")} required error={errors.role?.message}>
          <select className={selectClassName} {...fieldAria("new-role", { error: errors.role?.message })} {...register("role")}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {tRoles(`${r}.label`)}
              </option>
            ))}
          </select>
        </Field>
        <div className="space-y-1.5">
          {/* Invisible label-height spacer so the button lines up with the inputs, not the labels. */}
          <div aria-hidden="true" className="invisible hidden md:flex">
            <Label>{t("create")}</Label>
          </div>
          <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto">
            {isSubmitting ? <Loader2 aria-hidden="true" className="animate-spin" /> : <UserPlus aria-hidden="true" />}
            {t("create")}
          </Button>
        </div>
      </div>
    </form>
  );
}

export function UserRowControls({ id, name, role, isActive, isSelf }: { id: string; name: string; role: Role; isActive: boolean; isSelf: boolean }) {
  const t = useTranslations("admin.users");
  const tRoles = useTranslations("admin.roles");
  const tCommon = useTranslations("admin.common");
  const tErrors = useTranslations("admin.errors");
  const resolve = useMessageText();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  // Controlled: shows the role being applied, and snaps back if the server refuses the change.
  const [selectedRole, setSelectedRole] = useState<Role>(role);
  useEffect(() => setSelectedRole(role), [role]);

  const run = (fn: () => Promise<{ ok: boolean; error?: { message: string } }>) =>
    startTransition(async () => {
      setError(null);
      const r = await fn();
      if (!r.ok) setError(r.error?.message ?? tErrors("internal"));
      router.refresh();
    });

  if (isSelf) return <p className="text-xs text-ink-secondary">{t("self")}</p>;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor={`role-${id}`}>
          {t("roleFor", { name })}
        </label>
        <select
          id={`role-${id}`}
          value={selectedRole}
          disabled={pending}
          className={`${selectClassName} w-44`}
          onChange={(e) => {
            const next = e.target.value as Role;
            setSelectedRole(next);
            startTransition(async () => {
              setError(null);
              const r = await changeStaffRole({ id, role: next });
              if (!r.ok) {
                setSelectedRole(role);
                setError(r.error.message);
              }
              router.refresh();
            });
          }}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {tRoles(`${r}.label`)}
            </option>
          ))}
        </select>
        <ConfirmDialog
          title={isActive ? t("deactivateTitle", { name }) : t("reactivateTitle", { name })}
          description={isActive ? t("deactivateDescription") : t("reactivateDescription")}
          confirmLabel={isActive ? t("deactivate") : t("reactivate")}
          tone={isActive ? "destructive" : "primary"}
          onConfirm={() => run(() => setStaffActive({ id, active: !isActive }))}
          trigger={
            <Button type="button" size="sm" variant={isActive ? "ghost" : "outline"} disabled={pending} className={isActive ? "text-status-rejected hover:bg-status-rejected-bg" : undefined}>
              {isActive ? t("deactivate") : t("reactivate")}
            </Button>
          }
        />
        <ConfirmDialog
          title={t("resetTitle", { name })}
          description={t("resetDescription")}
          confirmLabel={t("resetPassword")}
          onConfirm={() =>
            startTransition(async () => {
              setError(null);
              const r = await resetStaffPassword({ id });
              if (r.ok) setSecret(r.data.temporaryPassword);
              else setError(r.error.message);
              router.refresh();
            })
          }
          trigger={
            <Button type="button" size="sm" variant="ghost" disabled={pending}>
              <KeyRound aria-hidden="true" /> {t("resetPassword")}
            </Button>
          }
        />
        {pending ? <Loader2 aria-label={tCommon("saving")} className="size-4 animate-spin text-ink-secondary" /> : null}
      </div>
      {error ? (
        <p role="alert" className="text-xs text-status-rejected">
          {resolve(error)}
        </p>
      ) : null}
      {secret ? <SecretReveal label={t("newTemporaryPassword")} value={secret} note={t("oneTimeNote")} /> : null}
    </div>
  );
}
