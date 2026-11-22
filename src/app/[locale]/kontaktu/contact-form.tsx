"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, CheckCircle2, Loader2, Send } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Field, fieldAria, selectClassName, textareaClassName } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isAppLocale } from "@/config/locales";
import { CONTACT_MESSAGE_MAX, CONTACT_TOPICS, contactSchema, type ContactInput } from "@/modules/contact/schema";

type ApiResult = { ok: true } | { ok: false; error: { message: string; fieldErrors?: Record<string, string[]> } };
type FormValues = Omit<ContactInput, "consent"> & { consent: boolean };

export function ContactForm() {
  const t = useTranslations("contact.form");
  const te = useTranslations("contact.errors");
  const rawLocale = useLocale();
  const locale = isAppLocale(rawLocale) ? rawLocale : "tet";
  const schema = useMemo(() => contactSchema((k) => te(k)), [te]);

  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const alertRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef<HTMLDivElement>(null);
  const startedAt = useRef(0);
  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  const {
    register,
    handleSubmit,
    setError,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema as never, undefined, { raw: true }) as never,
    defaultValues: { name: "", email: "", phone: "", topic: "GENERAL", message: "", consent: false },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });
  const messageLength = watch("message")?.length ?? 0;

  const fail = (message: string) => {
    setFormError(message);
    requestAnimationFrame(() => alertRef.current?.focus());
  };

  const onSubmit = handleSubmit(async (values) => {
    setPending(true);
    setFormError(null);
    const website = (document.getElementById("contact-website") as HTMLInputElement | null)?.value ?? "";
    let json: ApiResult;
    try {
      const response = await fetch(`/api/contact?locale=${encodeURIComponent(locale)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, website, startedAt: startedAt.current }),
      });
      json = (await response.json()) as ApiResult;
    } catch {
      setPending(false);
      return fail(te("network"));
    }
    setPending(false);
    if (!json.ok) {
      for (const [field, messages] of Object.entries(json.error.fieldErrors ?? {})) {
        if (messages[0]) setError(field as keyof FormValues, { message: messages[0] });
      }
      return fail(json.error.message);
    }
    reset();
    setSent(true);
    requestAnimationFrame(() => doneRef.current?.focus());
  });

  if (sent) {
    return (
      <div ref={doneRef} tabIndex={-1} role="status" className="rounded-card border border-status-verified/30 bg-status-verified-bg p-6 text-status-verified outline-none md:p-8">
        <CheckCircle2 aria-hidden="true" className="size-8" />
        <h2 className="mt-3 font-serif text-2xl font-semibold text-ink">{t("sentTitle")}</h2>
        <p className="mt-2 text-ink">{t("sentBody")}</p>
        <Button type="button" variant="outline" className="mt-5" onClick={() => setSent(false)}>
          {t("sendAnother")}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5 rounded-card border border-border-subtle bg-surface-card p-5 md:p-8">
      {formError ? (
        <div ref={alertRef} tabIndex={-1} role="alert" className="flex gap-3 rounded-control bg-status-rejected-bg p-3 text-sm text-status-rejected outline-none">
          <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {formError}
        </div>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="contact-name" label={t("name")} required error={errors.name?.message}>
          <Input autoComplete="name" {...fieldAria("contact-name", { error: errors.name?.message })} {...register("name")} />
        </Field>
        <Field id="contact-email" label={t("email")} required error={errors.email?.message}>
          <Input type="email" autoComplete="email" inputMode="email" {...fieldAria("contact-email", { error: errors.email?.message })} {...register("email")} />
        </Field>
        <Field id="contact-phone" label={t("phone")} optionalLabel={t("optional")} error={errors.phone?.message}>
          <Input type="tel" autoComplete="tel" inputMode="tel" placeholder="+670 7xxx xxxx" {...fieldAria("contact-phone", { error: errors.phone?.message })} {...register("phone")} />
        </Field>
        <Field id="contact-topic" label={t("topic")} required error={errors.topic?.message}>
          <select className={selectClassName} {...fieldAria("contact-topic", { error: errors.topic?.message })} {...register("topic")}>
            {CONTACT_TOPICS.map((topic) => (
              <option key={topic} value={topic}>
                {t(`topics.${topic}`)}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field id="contact-message" label={t("message")} required hint={t("messageHint", { count: messageLength, max: CONTACT_MESSAGE_MAX })} error={errors.message?.message}>
        <textarea rows={7} maxLength={CONTACT_MESSAGE_MAX} className={textareaClassName} {...fieldAria("contact-message", { hint: true, error: errors.message?.message })} {...register("message")} />
      </Field>

      {/* Honeypot: hidden from people and assistive tech; bots fill it. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="contact-website">Website</label>
        <input id="contact-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="contact-consent" className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 size-5 shrink-0 accent-ojetil-red"
            {...fieldAria("contact-consent", { error: errors.consent?.message })}
            {...register("consent")}
          />
          <span>{t("consent")}</span>
        </label>
        {errors.consent?.message ? (
          <p id="contact-consent-error" className="text-sm text-status-rejected">
            {errors.consent.message}
          </p>
        ) : null}
      </div>

      <Button type="submit" variant="editorial" disabled={pending} aria-busy={pending} className="w-full sm:w-auto">
        {pending ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Send aria-hidden="true" />}
        {pending ? t("sending") : t("send")}
      </Button>
    </form>
  );
}
