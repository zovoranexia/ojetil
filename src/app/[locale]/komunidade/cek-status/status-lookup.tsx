"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, CheckCircle2, Clock, CreditCard, FileWarning, Loader2, Search, XCircle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Field, fieldAria } from "@/components/forms/field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isAppLocale } from "@/config/locales";
import { formatDate } from "@/lib/format";
import { statusLookupSchema } from "@/modules/members/registration-schema";

type Status = "PENDING_VERIFICATION" | "NEEDS_REVISION" | "VERIFIED" | "REJECTED";
interface LookupResult {
  trackingCode: string;
  status: Status;
  category: "VETERAN_KLANDESTIN" | "ANGGOTA_PEMUDA";
  submittedAt: string;
  updatedAt: string;
  verifiedAt: string | null;
  message: string | null;
  cardToken: string | null;
}
type ApiResult = { ok: true; data: LookupResult } | { ok: false; error: { message: string; fieldErrors?: Record<string, string[]> } };
interface FormValues {
  code: string;
  dateOfBirth: string;
}

const STATUS_UI: Record<Status, { tone: "pending" | "info" | "verified" | "rejected"; icon: typeof Clock; panel: string }> = {
  PENDING_VERIFICATION: { tone: "pending", icon: Clock, panel: "bg-status-pending-bg text-status-pending" },
  NEEDS_REVISION: { tone: "info", icon: FileWarning, panel: "bg-status-info-bg text-status-info" },
  VERIFIED: { tone: "verified", icon: CheckCircle2, panel: "bg-status-verified-bg text-status-verified" },
  REJECTED: { tone: "rejected", icon: XCircle, panel: "bg-status-rejected-bg text-status-rejected" },
};

export function StatusLookup({ initialCode, contactEmail }: { initialCode: string; contactEmail: string }) {
  const t = useTranslations("statusLookup");
  const te = useTranslations("statusLookup.errors");
  const rawLocale = useLocale();
  const locale = isAppLocale(rawLocale) ? rawLocale : "tet";
  const schema = useMemo(() => statusLookupSchema((k) => te(k)), [te]);

  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [result, setResult] = useState<LookupResult | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema, undefined, { raw: true }),
    defaultValues: { code: initialCode, dateOfBirth: "" },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const onSubmit = handleSubmit(async (values) => {
    setPending(true);
    setFormError(null);
    setResult(null);
    let json: ApiResult;
    try {
      const response = await fetch(`/api/members/status?locale=${encodeURIComponent(locale)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      json = (await response.json()) as ApiResult;
    } catch {
      setPending(false);
      setFormError(te("network"));
      requestAnimationFrame(() => alertRef.current?.focus());
      return;
    }
    setPending(false);
    if (json.ok) {
      setResult(json.data);
      requestAnimationFrame(() => resultRef.current?.focus());
      return;
    }
    for (const [field, messages] of Object.entries(json.error.fieldErrors ?? {})) {
      if (field === "code" || field === "dateOfBirth") setError(field, { message: messages[0] });
    }
    setFormError(json.error.message);
    requestAnimationFrame(() => alertRef.current?.focus());
  });

  if (result) {
    const ui = STATUS_UI[result.status];
    const Icon = ui.icon;
    return (
      <div ref={resultRef} tabIndex={-1} role="status" className="space-y-6 rounded-card border border-border-subtle bg-surface-card p-5 outline-none md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="tracking-code text-2xl font-semibold">{result.trackingCode}</p>
          <Badge tone={ui.tone}>{t(`statuses.${result.status}.label`)}</Badge>
        </div>
        <div className={`flex gap-3 rounded-card p-4 ${ui.panel}`}>
          <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-semibold">{t(`statuses.${result.status}.label`)}</p>
            <p className="mt-1 text-sm">{t(`statuses.${result.status}.body`)}</p>
          </div>
        </div>
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-ink-secondary">{t("result.category")}</dt>
            <dd className="mt-0.5 font-medium">{t(`categories.${result.category}`)}</dd>
          </div>
          <div>
            <dt className="text-ink-secondary">{t("result.submitted")}</dt>
            <dd className="mt-0.5 font-medium tabular-nums">{formatDate(new Date(result.submittedAt), locale)}</dd>
          </div>
          <div>
            <dt className="text-ink-secondary">{t("result.updated")}</dt>
            <dd className="mt-0.5 font-medium tabular-nums">{formatDate(new Date(result.updatedAt), locale)}</dd>
          </div>
          {result.verifiedAt ? (
            <div>
              <dt className="text-ink-secondary">{t("result.verifiedOn")}</dt>
              <dd className="mt-0.5 font-medium tabular-nums">{formatDate(new Date(result.verifiedAt), locale)}</dd>
            </div>
          ) : null}
        </dl>
        {result.message ? (
          <div className="rounded-card border border-border-subtle bg-paper p-4">
            <p className="text-sm font-semibold text-ink-secondary">{t("result.message")}</p>
            <p className="mt-2 whitespace-pre-line">{result.message}</p>
          </div>
        ) : null}
        {result.cardToken ? (
          <div className="flex flex-col gap-3 rounded-card border border-ink bg-ink p-4 text-paper sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-gold-accent">{t("result.cardTitle")}</p>
              <p className="mt-1 text-sm text-paper/80">{t("result.cardBody")}</p>
            </div>
            <Button asChild variant="primary" className="shrink-0">
              <a href={`${locale === "tet" ? "" : `/${locale}`}/komunidade/kartaun/${result.cardToken}`} rel="noreferrer">
                <CreditCard aria-hidden="true" /> {t("result.cardOpen")}
              </a>
            </Button>
          </div>
        ) : null}
        <p className="text-sm text-ink-secondary">{t("result.contact", { email: contactEmail })}</p>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setResult(null);
            reset({ code: "", dateOfBirth: "" });
          }}
        >
          {t("result.another")}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5 rounded-card border border-border-subtle bg-surface-card p-5 md:p-8">
      {formError ? (
        <div
          ref={alertRef}
          tabIndex={-1}
          role="alert"
          className="flex gap-3 rounded-control border border-status-rejected/25 bg-status-rejected-bg p-3 text-sm text-status-rejected outline-none"
        >
          <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <p>{formError}</p>
        </div>
      ) : null}
      <Field id="code" label={t("code")} required hint={t("codeHint")} error={errors.code?.message}>
        <Input
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="OJT-2026-0042"
          className="tracking-code text-lg uppercase"
          {...fieldAria("code", { hint: true, error: errors.code?.message })}
          {...register("code")}
        />
      </Field>
      <Field id="dateOfBirth" label={t("dateOfBirth")} required error={errors.dateOfBirth?.message}>
        <Input
          type="date"
          autoComplete="bday"
          min="1900-01-01"
          max={new Date().toISOString().slice(0, 10)}
          {...fieldAria("dateOfBirth", { error: errors.dateOfBirth?.message })}
          {...register("dateOfBirth")}
        />
      </Field>
      <Button type="submit" size="lg" className="w-full" disabled={pending} aria-busy={pending}>
        {pending ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Search aria-hidden="true" />}
        {pending ? t("submitting") : t("submit")}
      </Button>
      <p className="text-xs text-ink-secondary">{t("privacyNote")}</p>
    </form>
  );
}
