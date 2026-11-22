"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, Loader2, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import type { Role } from "@prisma/client";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { applyFieldErrors, FormFeedback, type Feedback } from "@/components/admin/form-feedback";
import { SecretReveal } from "@/components/admin/secret-reveal";
import { Field, fieldAria, selectClassName } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ROLES, ROLE_LABELS } from "@/config/rbac";
import { changeStaffRole, createStaffUser, resetStaffPassword, setStaffActive } from "@/modules/users/actions";
import { createUserSchema, type CreateUserInput } from "@/modules/users/schema";

const ONE_TIME_NOTE = "Shown only once. Give it to the person through a secure channel; they should keep it private.";

export function CreateUserForm() {
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
      setFeedback({ kind: "success", message: `Account created for ${r.data.email}.` });
      setSecret({ email: r.data.email, password: r.data.temporaryPassword });
      reset();
      router.refresh();
    }
    requestAnimationFrame(() => ref.current?.focus());
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormFeedback ref={ref} feedback={feedback} />
      {secret ? <SecretReveal label={`Temporary password for ${secret.email}`} value={secret.password} note={ONE_TIME_NOTE} /> : null}
      <div className="grid gap-4 md:grid-cols-[1fr_1fr_14rem_auto] md:items-end">
        <Field id="new-name" label="Full name" required error={errors.name?.message}>
          <Input autoComplete="off" {...fieldAria("new-name", { error: errors.name?.message })} {...register("name")} />
        </Field>
        <Field id="new-email" label="Email" required error={errors.email?.message}>
          <Input type="email" autoComplete="off" {...fieldAria("new-email", { error: errors.email?.message })} {...register("email")} />
        </Field>
        <Field id="new-role" label="Role" required error={errors.role?.message}>
          <select className={selectClassName} {...fieldAria("new-role", { error: errors.role?.message })} {...register("role")}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r].label}
              </option>
            ))}
          </select>
        </Field>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 aria-hidden="true" className="animate-spin" /> : <UserPlus aria-hidden="true" />}
          Create
        </Button>
      </div>
    </form>
  );
}

export function UserRowControls({ id, name, role, isActive, isSelf }: { id: string; name: string; role: Role; isActive: boolean; isSelf: boolean }) {
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
      if (!r.ok) setError(r.error?.message ?? "Failed.");
      router.refresh();
    });

  if (isSelf) return <p className="text-xs text-ink-secondary">This is you — another Super Admin must change your account.</p>;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor={`role-${id}`}>
          Role for {name}
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
              {ROLE_LABELS[r].label}
            </option>
          ))}
        </select>
        <ConfirmDialog
          title={isActive ? `Deactivate ${name}?` : `Reactivate ${name}?`}
          description={isActive ? "They are signed out immediately and cannot sign in until reactivated. Their audit history is kept." : "They can sign in again with their current password."}
          confirmLabel={isActive ? "Deactivate" : "Reactivate"}
          tone={isActive ? "destructive" : "primary"}
          onConfirm={() => run(() => setStaffActive({ id, active: !isActive }))}
          trigger={
            <Button type="button" size="sm" variant={isActive ? "ghost" : "outline"} disabled={pending} className={isActive ? "text-status-rejected hover:bg-status-rejected-bg" : undefined}>
              {isActive ? "Deactivate" : "Reactivate"}
            </Button>
          }
        />
        <ConfirmDialog
          title={`Reset password for ${name}?`}
          description="A new temporary password is generated, the account is unlocked and all their sessions end."
          confirmLabel="Reset password"
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
              <KeyRound aria-hidden="true" /> Reset password
            </Button>
          }
        />
        {pending ? <Loader2 aria-label="Saving" className="size-4 animate-spin text-ink-secondary" /> : null}
      </div>
      {error ? (
        <p role="alert" className="text-xs text-status-rejected">
          {error}
        </p>
      ) : null}
      {secret ? <SecretReveal label="New temporary password" value={secret} note={ONE_TIME_NOTE} /> : null}
    </div>
  );
}
