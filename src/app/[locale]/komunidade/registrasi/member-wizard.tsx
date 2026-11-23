"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Loader2, Lock, Shield, Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, type FieldPath, type Resolver } from "react-hook-form";
import { Field, fieldAria, selectClassName, textareaClassName } from "@/components/forms/field";
import { PhotoField } from "@/components/forms/photo-field";
import { WizardProgress } from "@/components/forms/wizard-progress";
import { CopyCode } from "@/components/public/copy-code";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { INTEREST_AREAS, MUNICIPALITIES } from "@/config/municipalities";
import { CHECK_STATUS_PATH } from "@/config/navigation";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import {
  GENDERS,
  STEP_FIELDS,
  YEAR_JOINED_MAX,
  YEAR_JOINED_MIN,
  birthYearOf,
  memberStepSchemas,
  type MemberFormValues,
} from "@/modules/members/registration-schema";

type Step = 1 | 2 | 3;
type ApiResult =
  | { ok: true; data: { id?: string; trackingCode: string; status: string } }
  | { ok: false; error: { code: string; message: string; fieldErrors?: Record<string, string[]> } };

const DEFAULTS: MemberFormValues = {
  category: "",
  fullName: "",
  clandestineAlias: "",
  dateOfBirth: "",
  gender: "",
  municipality: "",
  administrativePost: "",
  address: "",
  phone: "",
  email: "",
  nationalId: "",
  yearJoined: "",
  clandestineCell: "",
  clandestineRegion: "",
  witnessReference: "",
  institution: "",
  interests: [],
  motivation: "",
  consent: false,
  website: "",
};

function stepOfField(field: string): Step {
  if ((STEP_FIELDS[1] as readonly string[]).includes(field)) return 1;
  if ((STEP_FIELDS[2] as readonly string[]).includes(field)) return 2;
  return 3;
}

/**
 * `public`: self-service form on the website.
 * `office`: the same form used by Secretariat staff in the backoffice for a member
 * at the desk — posts to the staff endpoint, phone optional, consent confirmed by
 * staff, webcam photo, and hands the created record to `onOfficeCreated`.
 */
export function MemberWizard({
  mode = "public",
  onOfficeCreated,
}: {
  mode?: "public" | "office";
  onOfficeCreated?: (created: { id: string; trackingCode: string }) => void;
} = {}) {
  const office = mode === "office";
  const t = useTranslations("memberRegistration");
  const tf = useTranslations("memberRegistration.fields");
  const te = useTranslations("memberRegistration.errors");
  const ts = useTranslations("statusLookup.statuses");
  const locale = useLocale();

  const [step, setStep] = useState<Step>(1);
  const stepRef = useRef<Step>(1);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [result, setResult] = useState<{ trackingCode: string } | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);

  const schemas = useMemo(() => memberStepSchemas((k) => te(k), new Date(), { phoneOptional: office }), [te, office]);

  /** Validates only the current step; `raw` keeps every step's values for the final submit. */
  const resolver: Resolver<MemberFormValues> = useMemo(
    () => async (values, context, options) => {
      const s = stepRef.current;
      const schema =
        s === 1
          ? schemas.step1
          : s === 2
            ? schemas.step2
            : values.category === "VETERAN_KLANDESTIN"
              ? schemas.step3Veteran(birthYearOf(values.dateOfBirth))
              : schemas.step3Youth;
      // Each step schema covers a subset of the form; `raw` returns the untouched values of every step.
      const stepResolver = zodResolver(schema as never, undefined, { raw: true }) as unknown as Resolver<MemberFormValues>;
      return stepResolver(values, context, options);
    },
    [schemas],
  );

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    setError,
    getValues,
    formState: { errors, isDirty },
  } = useForm<MemberFormValues>({ resolver, defaultValues: DEFAULTS, mode: "onSubmit", reValidateMode: "onChange" });

  const category = watch("category");
  const isVeteran = category === "VETERAN_KLANDESTIN";
  const motivationLength = watch("motivation")?.length ?? 0;

  /*
   * "Continue" validates with trigger(), which (unlike a submit) does not switch
   * React Hook Form into re-validate-on-change. After a failed Continue we
   * re-check each field as it is edited, so error messages clear as soon as the
   * applicant fixes them. Reset on every step change, so a fresh step stays quiet.
   */
  const attempted = useRef(false);
  useEffect(() => {
    const subscription = watch((_values, { name }) => {
      if (attempted.current && name) void trigger(name as FieldPath<MemberFormValues>);
    });
    return () => subscription.unsubscribe();
  }, [watch, trigger]);

  // Warn before leaving with unsaved answers (no PII is kept in browser storage).
  useEffect(() => {
    if (!isDirty || result || submitting) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty, result, submitting]);

  function goTo(next: Step) {
    attempted.current = false;
    stepRef.current = next;
    setStep(next);
    setFormError(null);
    requestAnimationFrame(() => {
      headingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      headingRef.current?.focus({ preventScroll: true });
    });
  }

  async function next() {
    attempted.current = true;
    if (await trigger()) goTo((step + 1) as Step);
  }

  const submit = handleSubmit(async () => {
    setSubmitting(true);
    setFormError(null);
    const values = getValues();
    const body = new FormData();
    for (const [key, value] of Object.entries(values)) {
      if (key === "interests") (value as string[]).forEach((v) => body.append("interests", v));
      else body.append(key, String(value));
    }
    if (photo) body.append("photo", photo);

    let json: ApiResult;
    try {
      const endpoint = office ? "/api/admin/members/office" : "/api/members";
      const response = await fetch(`${endpoint}?locale=${encodeURIComponent(locale)}`, { method: "POST", body });
      json = (await response.json()) as ApiResult;
    } catch {
      setSubmitting(false);
      setFormError(te("network"));
      requestAnimationFrame(() => alertRef.current?.focus());
      return;
    }
    setSubmitting(false);

    if (json.ok) {
      if (office && json.data.id) {
        onOfficeCreated?.({ id: json.data.id, trackingCode: json.data.trackingCode });
        return;
      }
      setResult({ trackingCode: json.data.trackingCode });
      requestAnimationFrame(() => {
        headingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        headingRef.current?.focus({ preventScroll: true });
      });
      return;
    }

    // Map server field errors back onto the wizard and jump to the earliest affected step.
    const fieldErrors = json.error.fieldErrors ?? {};
    let earliest: Step | null = null;
    for (const [field, messages] of Object.entries(fieldErrors)) {
      if (field === "photo") {
        setPhotoError(messages[0]);
        earliest = 1;
        continue;
      }
      const s = stepOfField(field);
      earliest = earliest === null ? s : (Math.min(earliest, s) as Step);
      setError(field as FieldPath<MemberFormValues>, { message: messages[0] });
    }
    // goTo() clears the form error, so change step first and set the message afterwards.
    if (earliest && earliest !== step) goTo(earliest);
    setFormError(json.error.message);
    requestAnimationFrame(() => alertRef.current?.focus());
  });

  const err = (name: FieldPath<MemberFormValues>) => {
    const e = name.split(".").reduce<unknown>((acc, k) => (acc as Record<string, unknown> | undefined)?.[k], errors) as
      | { message?: string }
      | undefined;
    return e?.message;
  };

  /* ── Confirmation ─────────────────────────────────────────────────── */
  if (result) {
    return (
      <section aria-labelledby="wizard-heading" className="rounded-card border border-border-subtle bg-surface-card p-5 md:p-8">
        <div className="flex items-start gap-3">
          <CheckCircle2 aria-hidden="true" className="mt-1 size-8 shrink-0 text-status-verified" />
          <div>
            <h2 id="wizard-heading" ref={headingRef} tabIndex={-1} className="text-3xl outline-none">
              {t("success.title")}
            </h2>
            <p className="mt-2 text-ink-secondary">{t("success.body")}</p>
          </div>
        </div>
        <CopyCode code={result.trackingCode} label={t("success.codeLabel")} className="mt-6" />
        <p className="text-sm font-medium text-ink">{t("success.save")}</p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <span className="text-sm text-ink-secondary">{t("success.statusLabel")}:</span>
          <Badge tone="pending">{ts("PENDING_VERIFICATION.label")}</Badge>
        </div>
        <h3 className="mt-8 text-xl">{t("success.nextTitle")}</h3>
        <ol className="mt-3 space-y-3">
          {(["next1", "next2", "next3"] as const).map((k, i) => (
            <li key={k} className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-bold text-paper">{i + 1}</span>
              <span className="text-ink-secondary">{t(`success.${k}`)}</span>
            </li>
          ))}
        </ol>
        <Button asChild className="mt-8">
          <Link href={{ pathname: CHECK_STATUS_PATH, query: { code: result.trackingCode } }}>{t("success.checkStatus")}</Link>
        </Button>
      </section>
    );
  }

  const stepTitles = [t("steps.one"), t("steps.two"), t("steps.three")] as const;

  /* ── Wizard ───────────────────────────────────────────────────────── */
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (step < 3) void next();
        else void submit(e);
      }}
      className="rounded-card border border-border-subtle bg-surface-card"
    >
      <div className="border-b border-border-subtle p-5 md:p-8">
        <WizardProgress steps={stepTitles} current={step} progressLabel={t("progress", { current: step, total: 3 })} />
      </div>

      <div className="space-y-6 p-5 md:p-8">
        <h2 id="wizard-heading" ref={headingRef} tabIndex={-1} className="scroll-mt-4 text-2xl outline-none">
          {stepTitles[step - 1]}
        </h2>

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

        {/* Honeypot — invisible to people and assistive tech. */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label htmlFor="website">Website</label>
          <input id="website" type="text" tabIndex={-1} autoComplete="off" {...register("website")} />
        </div>

        {/* ── Step 1 ── */}
        <div hidden={step !== 1} className="space-y-6">
          <fieldset aria-describedby={err("category") ? "category-error" : undefined}>
            <legend className="text-sm font-medium text-ink-secondary">
              {t("track.legend")}
              <span aria-hidden="true" className="ml-0.5 text-ojetil-red">
                *
              </span>
            </legend>
            <div className="mt-2 grid gap-3 md:grid-cols-2">
              {(
                [
                  { value: "VETERAN_KLANDESTIN", icon: Shield, copy: "veteran" },
                  { value: "ANGGOTA_PEMUDA", icon: Users, copy: "youth" },
                ] as const
              ).map(({ value, icon: Icon, copy }) => (
                <label
                  key={value}
                  className={cn(
                    "relative flex cursor-pointer gap-4 rounded-card border-2 p-4 transition-colors",
                    "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ojetil-red",
                    category === value ? "border-ojetil-red bg-paper" : "border-border-subtle hover:border-border-strong",
                  )}
                >
                  <input
                    type="radio"
                    value={value}
                    className="sr-only"
                    aria-labelledby={`track-${copy}-title`}
                    aria-describedby={`track-${copy}-desc`}
                    {...register("category")}
                  />
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex size-11 shrink-0 items-center justify-center rounded-full",
                      value === "VETERAN_KLANDESTIN" ? "bg-ink text-gold-accent" : "bg-ojetil-red text-white",
                    )}
                  >
                    <Icon className="size-5" />
                  </span>
                  <span>
                    <span id={`track-${copy}-title`} className="block font-serif text-lg font-semibold">
                      {t(`track.${copy}.title`)}
                    </span>
                    <span id={`track-${copy}-desc`} className="mt-1 block text-sm text-ink-secondary">
                      {t(`track.${copy}.description`)}
                    </span>
                  </span>
                  {category === value ? (
                    <CheckCircle2 aria-hidden="true" className="absolute right-3 top-3 size-5 text-ojetil-red" />
                  ) : null}
                </label>
              ))}
            </div>
            {err("category") ? (
              <p id="category-error" className="mt-2 text-sm text-status-rejected">
                {err("category")}
              </p>
            ) : null}
          </fieldset>

          <Field id="fullName" label={tf("fullName")} required error={err("fullName")}>
            <Input autoComplete="name" {...fieldAria("fullName", { error: err("fullName") })} {...register("fullName")} />
          </Field>

          {isVeteran ? (
            <Field
              id="clandestineAlias"
              label={tf("clandestineAlias")}
              optionalLabel={tf("optional")}
              hint={tf("clandestineAliasHint")}
              error={err("clandestineAlias")}
            >
              <Input
                autoComplete="off"
                {...fieldAria("clandestineAlias", { hint: true, error: err("clandestineAlias") })}
                {...register("clandestineAlias")}
              />
            </Field>
          ) : null}

          <div className="grid gap-6 sm:grid-cols-2">
            <Field id="dateOfBirth" label={tf("dateOfBirth")} required error={err("dateOfBirth")}>
              <Input
                type="date"
                autoComplete="bday"
                max={new Date().toISOString().slice(0, 10)}
                min="1900-01-01"
                {...fieldAria("dateOfBirth", { error: err("dateOfBirth") })}
                {...register("dateOfBirth")}
              />
            </Field>
            <Field id="gender" label={tf("gender")} required error={err("gender")}>
              <select className={selectClassName} {...fieldAria("gender", { error: err("gender") })} {...register("gender")}>
                <option value="" />
                {GENDERS.map((g) => (
                  <option key={g} value={g}>
                    {tf(`genders.${g}`)}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <PhotoField
            value={photo}
            onChange={(f) => {
              setPhoto(f);
              setPhotoError(undefined);
            }}
            error={photoError}
            onError={setPhotoError}
            camera={
              office
                ? { open: tf("photoCamera"), capture: tf("photoCapture"), cancel: tf("photoCameraCancel"), unavailable: te("photoCameraUnavailable") }
                : undefined
            }
            labels={{
              label: tf("photo"),
              hint: tf("photoHint"),
              choose: tf("photoChoose"),
              change: tf("photoChange"),
              remove: tf("photoRemove"),
              processing: tf("photoProcessing"),
              preview: tf("photoPreview"),
              optional: tf("optional"),
              errorSize: te("photoSize"),
              errorType: te("photoType"),
            }}
          />
        </div>

        {/* ── Step 2 ── */}
        <div hidden={step !== 2} className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <Field id="municipality" label={tf("municipality")} required error={err("municipality")}>
              <select className={selectClassName} {...fieldAria("municipality", { error: err("municipality") })} {...register("municipality")}>
                <option value="">{tf("municipalityPlaceholder")}</option>
                {MUNICIPALITIES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              id="administrativePost"
              label={tf("administrativePost")}
              required
              hint={tf("administrativePostHint")}
              error={err("administrativePost")}
            >
              <Input
                autoComplete="address-level2"
                {...fieldAria("administrativePost", { hint: true, error: err("administrativePost") })}
                {...register("administrativePost")}
              />
            </Field>
          </div>

          <Field id="address" label={tf("address")} required encryptedLabel={tf("encrypted")} error={err("address")}>
            <textarea
              rows={2}
              autoComplete="street-address"
              className={cn(textareaClassName, "min-h-20")}
              {...fieldAria("address", { error: err("address") })}
              {...register("address")}
            />
          </Field>

          <div className="grid gap-6 sm:grid-cols-2">
            <Field
              id="phone"
              label={tf("phone")}
              required={!office}
              optionalLabel={office ? tf("optional") : undefined}
              hint={office ? t("office.phoneHint") : undefined}
              encryptedLabel={tf("encrypted")}
              error={err("phone")}
            >
              <Input type="tel" inputMode="tel" autoComplete="tel" placeholder="+670" {...fieldAria("phone", { error: err("phone") })} {...register("phone")} />
            </Field>
            <Field id="email" label={tf("email")} optionalLabel={tf("optional")} error={err("email")}>
              <Input
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                {...fieldAria("email", { error: err("email") })}
                {...register("email")}
              />
            </Field>
          </div>

          <Field
            id="nationalId"
            label={tf("nationalId")}
            required
            encryptedLabel={tf("encrypted")}
            hint={tf("nationalIdHint")}
            error={err("nationalId")}
          >
            <Input
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              className="tracking-code"
              {...fieldAria("nationalId", { hint: true, error: err("nationalId") })}
              {...register("nationalId")}
            />
          </Field>
        </div>

        {/* ── Step 3 ── */}
        <div hidden={step !== 3} className="space-y-6">
          {isVeteran ? (
            <>
              <div className="grid gap-6 sm:grid-cols-[12rem_1fr]">
                <Field id="yearJoined" label={tf("yearJoined")} required error={err("yearJoined")}>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={YEAR_JOINED_MIN}
                    max={YEAR_JOINED_MAX}
                    className="tabular-nums"
                    {...fieldAria("yearJoined", { error: err("yearJoined") })}
                    {...register("yearJoined")}
                  />
                </Field>
                <Field id="clandestineRegion" label={tf("clandestineRegion")} optionalLabel={tf("optional")} error={err("clandestineRegion")}>
                  <Input {...fieldAria("clandestineRegion", { error: err("clandestineRegion") })} {...register("clandestineRegion")} />
                </Field>
              </div>
              <Field id="clandestineCell" label={tf("clandestineCell")} required hint={tf("clandestineCellHint")} error={err("clandestineCell")}>
                <Input {...fieldAria("clandestineCell", { hint: true, error: err("clandestineCell") })} {...register("clandestineCell")} />
              </Field>
              <Field
                id="witnessReference"
                label={tf("witnessReference")}
                optionalLabel={tf("optional")}
                hint={tf("witnessReferenceHint")}
                error={err("witnessReference")}
              >
                <Input {...fieldAria("witnessReference", { hint: true, error: err("witnessReference") })} {...register("witnessReference")} />
              </Field>
            </>
          ) : (
            <>
              <Field id="institution" label={tf("institution")} required error={err("institution")}>
                <Input autoComplete="organization" {...fieldAria("institution", { error: err("institution") })} {...register("institution")} />
              </Field>
              <fieldset aria-describedby={err("interests") ? "interests-error" : undefined}>
                <legend className="text-sm font-medium text-ink-secondary">
                  {tf("interests")}
                  <span aria-hidden="true" className="ml-0.5 text-ojetil-red">
                    *
                  </span>
                </legend>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {INTEREST_AREAS.map((area) => (
                    <label
                      key={area}
                      className="flex min-h-tap cursor-pointer items-center gap-3 rounded-control border border-border-subtle px-3 hover:border-border-strong has-[:checked]:border-ojetil-red has-[:checked]:bg-paper"
                    >
                      <input type="checkbox" value={area} className="size-5 accent-ojetil-red" {...register("interests")} />
                      <span>{tf(`interestAreas.${area}`)}</span>
                    </label>
                  ))}
                </div>
                {err("interests") ? (
                  <p id="interests-error" className="mt-2 text-sm text-status-rejected">
                    {err("interests")}
                  </p>
                ) : null}
              </fieldset>
              <Field id="motivation" label={tf("motivation")} required error={err("motivation")}>
                <textarea
                  rows={4}
                  maxLength={1000}
                  className={textareaClassName}
                  {...fieldAria("motivation", { hint: true, error: err("motivation") })}
                  {...register("motivation")}
                />
                <p id="motivation-hint" className="text-right text-xs tabular-nums text-ink-secondary">
                  {tf("motivationCount", { count: motivationLength })}
                </p>
              </Field>
            </>
          )}

          <div className="rounded-card border border-border-subtle bg-paper p-4">
            <div className="flex gap-3">
              <input
                type="checkbox"
                className="mt-0.5 size-6 shrink-0 accent-ojetil-red"
                {...fieldAria("consent", { error: err("consent") })}
                {...register("consent")}
              />
              <label htmlFor="consent" className="text-sm text-ink">
                {office ? t("office.consent") : tf("consent")}
                <span aria-hidden="true" className="ml-0.5 text-ojetil-red">
                  *
                </span>
              </label>
            </div>
            {err("consent") ? (
              <p id="consent-error" className="mt-2 text-sm text-status-rejected">
                {err("consent")}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-border-subtle p-5 sm:flex-row sm:justify-between md:px-8">
        {step > 1 ? (
          <Button type="button" variant="outline" onClick={() => goTo((step - 1) as Step)} disabled={submitting}>
            <ArrowLeft aria-hidden="true" />
            {t("actions.back")}
          </Button>
        ) : (
          <span aria-hidden="true" className="hidden sm:block" />
        )}
        {step < 3 ? (
          <Button type="submit">
            {t("actions.next")}
            <ArrowRight aria-hidden="true" />
          </Button>
        ) : (
          <Button type="submit" disabled={submitting} aria-busy={submitting}>
            {submitting ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Lock aria-hidden="true" />}
            {submitting ? t("actions.submitting") : office ? t("office.submit") : t("actions.submit")}
          </Button>
        )}
      </div>
    </form>
  );
}
