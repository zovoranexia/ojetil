"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Wand2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { EditorActions } from "@/components/admin/editor-actions";
import { applyFieldErrors, FormFeedback, type Feedback } from "@/components/admin/form-feedback";
import { TranslationTabs } from "@/components/admin/translation-tabs";
import { DateTime24Input } from "@/components/forms/date-time-24";
import { Field, fieldAria, selectClassName } from "@/components/forms/field";
import { Input } from "@/components/ui/input";
import { MUNICIPALITIES } from "@/config/municipalities";
import { slugify } from "@/lib/slug";
import { deleteEvent, saveEvent } from "@/modules/events/admin-actions";
import {
  EVENT_STATUS_VALUES,
  EVENT_TRANSLATION_FIELDS,
  EVENT_TYPE_VALUES,
  eventFormSchema,
  type EventFormValues,
} from "@/modules/events/admin-schema";

export function EventEditor({
  initial,
  readOnly,
  canPublish,
  registered,
  totalRegistrations,
}: {
  initial: EventFormValues;
  readOnly: boolean;
  canPublish: boolean;
  registered: number;
  totalRegistrations: number;
}) {
  const router = useRouter();
  const t = useTranslations("admin.events.editor");
  const tTypes = useTranslations("admin.events.types");
  const tStatus = useTranslations("admin.status.content");
  const tc = useTranslations("admin.common");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const isNew = !initial.id;

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<EventFormValues>({ resolver: zodResolver(eventFormSchema), defaultValues: initial, mode: "onSubmit", reValidateMode: "onChange" });

  const announce = (f: Feedback) => {
    setFeedback(f);
    requestAnimationFrame(() => feedbackRef.current?.focus());
  };

  const onSubmit = handleSubmit(
    async (values) => {
      const r = await saveEvent(values);
      if (!r.ok) {
        applyFieldErrors(r.error.fieldErrors, setError as never);
        return announce({ kind: "error", message: r.error.message });
      }
      if (isNew) return router.push(`/admin/acara/${r.data.id}`);
      announce({ kind: "success", message: t("saved") });
      router.refresh();
    },
    () => announce({ kind: "error", message: t("checkTabs") }),
  );

  async function onDelete() {
    if (!initial.id) return;
    const r = await deleteEvent({ id: initial.id });
    if (r.ok) router.push("/admin/acara");
    else announce({ kind: "error", message: r.error.message });
  }

  const isOnline = watch("isOnline");
  const err = (k: keyof EventFormValues) => (errors[k] as { message?: string } | undefined)?.message;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <FormFeedback ref={feedbackRef} feedback={feedback} />
      <fieldset disabled={readOnly} className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <TranslationTabs fields={EVENT_TRANSLATION_FIELDS} register={register} watch={watch} errors={errors} disabled={readOnly} />

          <div className="grid gap-5 rounded-card border border-border-subtle bg-surface-card p-5 sm:grid-cols-2">
            <p className="text-sm font-semibold sm:col-span-2">{t("whenWhere")}</p>
            <Field id="startAt" label={t("starts")} required error={err("startAt")}>
              <Controller control={control} name="startAt" render={({ field }) => (
                <DateTime24Input id="startAt" value={field.value ?? ""} onChange={field.onChange} invalid={Boolean(err("startAt"))} describedBy={undefined} dateLabel={tc("dateField")} timeLabel={tc("timeField")} calendarLabel={tc("openCalendar")} />
              )} />
            </Field>
            <Field id="endAt" label={t("ends")} required error={err("endAt")}>
              <Controller control={control} name="endAt" render={({ field }) => (
                <DateTime24Input id="endAt" value={field.value ?? ""} onChange={field.onChange} invalid={Boolean(err("endAt"))} describedBy={undefined} dateLabel={tc("dateField")} timeLabel={tc("timeField")} calendarLabel={tc("openCalendar")} />
              )} />
            </Field>
            <Field id="location" label={t("venue")} required className="sm:col-span-2" error={err("location")}>
              <Input placeholder="Auditóriu UNTL, Kampus Caicoli, Díli" {...fieldAria("location", { error: err("location") })} {...register("location")} />
            </Field>
            <Field id="municipality" label={t("municipality")} error={err("municipality")}>
              <select className={selectClassName} {...fieldAria("municipality", { error: err("municipality") })} {...register("municipality")}>
                <option value="">{t("municipalityNone")}</option>
                {MUNICIPALITIES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </Field>
            <label className="flex min-h-tap items-center gap-3 self-end text-sm">
              <input type="checkbox" className="size-5 accent-ojetil-red" {...register("isOnline")} /> {t("onlineEvent")}
            </label>
            {isOnline ? (
              <Field id="onlineUrl" label={t("meetingLink")} required className="sm:col-span-2" hint={t("meetingLinkHint")} error={err("onlineUrl")}>
                <Input type="url" placeholder="https://…" {...fieldAria("onlineUrl", { hint: true, error: err("onlineUrl") })} {...register("onlineUrl")} />
              </Field>
            ) : null}
          </div>
        </div>

        <div className="space-y-5 rounded-card border border-border-subtle bg-surface-card p-5 xl:self-start">
          <Field id="status" label={t("status")} required error={err("status")}>
            <select className={selectClassName} {...fieldAria("status", { error: err("status") })} {...register("status")}>
              {EVENT_STATUS_VALUES.map((s) => (
                <option key={s} value={s} disabled={s === "PUBLISHED" && !canPublish}>
                  {tStatus(s)}
                </option>
              ))}
            </select>
          </Field>
          <Field id="type" label={t("type")} required error={err("type")}>
            <select className={selectClassName} {...fieldAria("type", { error: err("type") })} {...register("type")}>
              {EVENT_TYPE_VALUES.map((type) => (
                <option key={type} value={type}>
                  {tTypes(type)}
                </option>
              ))}
            </select>
          </Field>
          <Field id="slug" label={t("slugLabel")} required hint={t("slugHint")} error={err("slug")}>
            <div className="flex gap-2">
              <Input className="font-mono text-sm" {...fieldAria("slug", { hint: true, error: err("slug") })} {...register("slug")} />
              <button
                type="button"
                title={t("generateSlugTitle")}
                onClick={() => setValue("slug", slugify(getValues("translations.TET.title") ?? ""), { shouldValidate: true, shouldDirty: true })}
                className="inline-flex size-tap shrink-0 items-center justify-center rounded-control border border-border-subtle hover:border-border-strong md:size-10"
              >
                <Wand2 aria-hidden="true" className="size-4" />
                <span className="sr-only">{t("generateSlugSr")}</span>
              </button>
            </div>
          </Field>
          <Field id="capacity" label={t("capacity")} required hint={registered ? t("capacityHint", { count: registered }) : undefined} error={err("capacity")}>
            <Input type="number" inputMode="numeric" min={1} className="tabular-nums" {...fieldAria("capacity", { hint: Boolean(registered), error: err("capacity") })} {...register("capacity")} />
          </Field>
          <label className="flex min-h-tap items-center gap-3 text-sm">
            <input type="checkbox" className="size-5 accent-ojetil-red" {...register("registrationOpen")} /> {t("registrationOpen")}
          </label>
          <Field id="registrationDeadline" label={t("deadline")} hint={t("deadlineHint")} error={err("registrationDeadline")}>
            <Controller control={control} name="registrationDeadline" render={({ field }) => (
                <DateTime24Input id="registrationDeadline" value={field.value ?? ""} onChange={field.onChange} invalid={Boolean(err("registrationDeadline"))} describedBy={`registrationDeadline-hint`} dateLabel={tc("dateField")} timeLabel={tc("timeField")} calendarLabel={tc("openCalendar")} />
              )} />
          </Field>
          <Field id="coverImageUrl" label={t("coverImage")} error={err("coverImageUrl")}>
            <Input placeholder={t("coverImagePlaceholder")} {...fieldAria("coverImageUrl", { error: err("coverImageUrl") })} {...register("coverImageUrl")} />
          </Field>
        </div>
      </fieldset>
      {!readOnly ? (
        <EditorActions
          saving={isSubmitting}
          canDelete={!isNew && totalRegistrations === 0}
          onDelete={onDelete}
          saveLabel={isNew ? t("create") : tc("saveChanges")}
        />
      ) : null}
    </form>
  );
}
