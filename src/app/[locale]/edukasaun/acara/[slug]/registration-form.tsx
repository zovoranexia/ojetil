"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { CopyCode } from "@/components/public/copy-code";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MUNICIPALITIES } from "@/config/municipalities";
import { cn } from "@/lib/utils";
import { registerForEventAction } from "@/modules/events/actions";
import { createEventRegistrationSchema, type EventRegistrationInput } from "@/modules/events/registration-schema";

type FieldName = "fullName" | "email" | "phone" | "institution" | "municipality" | "consent";

export function EventRegistrationForm({
  eventSlug,
  canRegister,
  closedMessage,
}: {
  eventSlug: string;
  canRegister: boolean;
  closedMessage: string;
}) {
  const t = useTranslations("eventRegistration");
  const te = useTranslations("eventRegistration.errors");
  const common = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const schema = useMemo(() => createEventRegistrationSchema((k) => te(k)), [te]);

  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [ticket, setTicket] = useState<{ code: string; isOnline: boolean } | null>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<EventRegistrationInput>({
    resolver: zodResolver(schema),
    // Validate on submit, then live while correcting: avoids error text appearing on blur and
    // shifting the submit button out from under a finger on mobile.
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: { eventSlug, fullName: "", email: "", phone: "", institution: "", municipality: "", consent: false, website: "" },
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      try {
        const result = await registerForEventAction(locale, values);
        if (result.ok) {
          setTicket({ code: result.data.ticketCode, isOnline: result.data.isOnline });
          router.refresh(); // update the seat counter
          requestAnimationFrame(() => successRef.current?.focus());
          return;
        }
        for (const [field, messages] of Object.entries(result.error.fieldErrors ?? {})) {
          setError(field as FieldName, { message: messages[0] });
        }
        setFormError(result.error.message);
      } catch {
        setFormError(te("generic"));
      }
      requestAnimationFrame(() => errorRef.current?.focus());
    });
  });

  if (ticket) {
    return (
      <div ref={successRef} tabIndex={-1} className="space-y-5 outline-none" role="status">
        <div className="flex items-start gap-3">
          <CheckCircle2 aria-hidden="true" className="size-7 shrink-0 text-status-verified" />
          <div>
            <h3 className="text-2xl">{t("success.title")}</h3>
            <p className="mt-1 text-ink-secondary">{t("success.body")}</p>
          </div>
        </div>
        <CopyCode code={ticket.code} label={t("success.ticket")} />
        {ticket.isOnline ? <p className="rounded-control bg-status-info-bg p-3 text-sm text-status-info">{t("success.onlineNote")}</p> : null}
      </div>
    );
  }

  if (!canRegister) {
    return <p className="rounded-control bg-surface-muted p-4 text-ink-secondary">{closedMessage}</p>;
  }

  const fieldError = (name: FieldName) =>
    errors[name]?.message ? (
      <p id={`${name}-error`} className="text-sm text-status-rejected">
        {errors[name]?.message}
      </p>
    ) : null;
  const a11y = (name: FieldName, hint?: string) => ({
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": [errors[name] ? `${name}-error` : null, hint].filter(Boolean).join(" ") || undefined,
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <p className="text-sm text-ink-secondary">{t("lead")}</p>
      {formError ? (
        <div
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className="flex gap-3 rounded-control border border-status-rejected/25 bg-status-rejected-bg p-3 text-sm text-status-rejected outline-none"
        >
          <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <p>{formError}</p>
        </div>
      ) : null}

      <input type="hidden" {...register("eventSlug")} />
      {/* Honeypot — invisible to people and assistive tech. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="website">Website</label>
        <input id="website" type="text" tabIndex={-1} autoComplete="off" {...register("website")} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="fullName" required>
          {t("fullName")}
        </Label>
        <Input id="fullName" autoComplete="name" disabled={pending} {...a11y("fullName")} {...register("fullName")} />
        {fieldError("fullName")}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email" required>
          {t("email")}
        </Label>
        <Input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          disabled={pending}
          {...a11y("email", "email-hint")}
          {...register("email")}
        />
        <p id="email-hint" className="text-xs text-ink-secondary">
          {t("emailHint")}
        </p>
        {fieldError("email")}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="phone">
            {t("phone")} <span className="font-normal">({common("optional")})</span>
          </Label>
          <Input id="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+670" disabled={pending} {...a11y("phone")} {...register("phone")} />
          {fieldError("phone")}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="municipality">
            {t("municipality")} <span className="font-normal">({common("optional")})</span>
          </Label>
          <select
            id="municipality"
            disabled={pending}
            className={cn(
              "flex min-h-tap w-full rounded-control border border-border-subtle bg-surface-card px-3 text-base text-ink md:min-h-10 md:text-[0.9375rem]",
              "hover:border-border-strong focus-visible:border-ojetil-red",
            )}
            {...a11y("municipality")}
            {...register("municipality")}
          >
            <option value="">{t("municipalityNone")}</option>
            {MUNICIPALITIES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          {fieldError("municipality")}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="institution">
          {t("institution")} <span className="font-normal">({common("optional")})</span>
        </Label>
        <Input id="institution" autoComplete="organization" disabled={pending} {...a11y("institution")} {...register("institution")} />
        {fieldError("institution")}
      </div>

      <div className="space-y-1.5">
        <div className="flex gap-3">
          <input
            id="consent"
            type="checkbox"
            disabled={pending}
            className="mt-0.5 size-6 shrink-0 accent-ojetil-red"
            {...a11y("consent")}
            {...register("consent")}
          />
          <label htmlFor="consent" className="text-sm text-ink">
            {t("consent")}
          </label>
        </div>
        {fieldError("consent")}
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={pending} aria-busy={pending}>
        {pending ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
        {pending ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
