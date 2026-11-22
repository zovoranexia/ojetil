"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Eye, EyeOff, Loader2, LogIn } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { useMessageText } from "@/components/i18n/message-text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction } from "@/modules/auth/actions";
import { loginSchema, type LoginInput } from "@/modules/auth/schemas";

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const t = useTranslations("admin.auth");
  const resolve = useMessageText();
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [pending, startTransition] = useTransition();
  const [focusPassword, setFocusPassword] = useState(0);

  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    resetField,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", callbackUrl },
    // Validate on submit, then live while correcting: avoids error text appearing on blur and
    // shifting the submit button out from under a finger on mobile.
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      // On success the action redirects; we only get here on failure.
      const result = await loginAction(values);
      if (result.ok) return;
      for (const [field, messages] of Object.entries(result.error.fieldErrors ?? {})) {
        if (field === "email" || field === "password") setError(field, { message: messages[0] });
      }
      setFormError(result.error.message);
      resetField("password");
      setFocusPassword((n) => n + 1);
    });
  });

  // Inputs are disabled while pending; move focus only once they are enabled again.
  useEffect(() => {
    if (focusPassword && !pending) setFocus("password");
  }, [focusPassword, pending, setFocus]);

  const busy = pending;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5" aria-describedby={formError ? "login-error" : undefined}>
      {formError ? (
        <div
          id="login-error"
          role="alert"
          className="flex gap-3 rounded-control border border-status-rejected/25 bg-status-rejected-bg p-3 text-sm text-status-rejected"
        >
          <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <p>{resolve(formError)}</p>
        </div>
      ) : null}

      <input type="hidden" {...register("callbackUrl")} />

      <div className="space-y-1.5">
        <Label htmlFor="email" required>
          {t("email")}
        </Label>
        <Input
          id="email"
          type="email"
          autoComplete="username"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? "email-error" : undefined}
          disabled={busy}
          {...register("email")}
        />
        {errors.email ? (
          <p id="email-error" className="text-sm text-status-rejected">
            {resolve(errors.email.message ?? "")}
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password" required>
          {t("password")}
        </Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            className="pr-12"
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? "password-error" : undefined}
            disabled={busy}
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-0 right-0 flex w-tap items-center justify-center rounded-r-control text-ink-secondary hover:text-ink"
            aria-label={showPassword ? t("hidePassword") : t("showPassword")}
            aria-pressed={showPassword}
          >
            {showPassword ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
          </button>
        </div>
        {errors.password ? (
          <p id="password-error" className="text-sm text-status-rejected">
            {resolve(errors.password.message ?? "")}
          </p>
        ) : null}
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={busy} aria-busy={busy}>
        {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : <LogIn aria-hidden="true" />}
        {busy ? t("signingIn") : t("signIn")}
      </Button>
    </form>
  );
}
