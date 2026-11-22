"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Wand2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { EditorActions } from "@/components/admin/editor-actions";
import { applyFieldErrors, FormFeedback, type Feedback } from "@/components/admin/form-feedback";
import { TranslationTabs } from "@/components/admin/translation-tabs";
import { Field, fieldAria, selectClassName } from "@/components/forms/field";
import { Input } from "@/components/ui/input";
import { MUNICIPALITIES } from "@/config/municipalities";
import { slugify } from "@/lib/slug";
import { deleteEvent, saveEvent } from "@/modules/events/admin-actions";
import {
  EVENT_STATUS_VALUES,
  EVENT_TRANSLATION_FIELDS,
  EVENT_TYPE_LABELS,
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
  const [feedback, setFeedback] = useState<Feedback>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const isNew = !initial.id;

  const {
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
      announce({ kind: "success", message: "Event saved." });
      router.refresh();
    },
    () => announce({ kind: "error", message: "Please correct the highlighted fields (check every language tab)." }),
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
            <p className="text-sm font-semibold sm:col-span-2">When & where — all times are Díli time (Asia/Dili, UTC+09:00)</p>
            <Field id="startAt" label="Starts" required error={err("startAt")}>
              <Input type="datetime-local" {...fieldAria("startAt", { error: err("startAt") })} {...register("startAt")} />
            </Field>
            <Field id="endAt" label="Ends" required error={err("endAt")}>
              <Input type="datetime-local" {...fieldAria("endAt", { error: err("endAt") })} {...register("endAt")} />
            </Field>
            <Field id="location" label="Venue" required className="sm:col-span-2" error={err("location")}>
              <Input placeholder="Auditóriu UNTL, Kampus Caicoli, Díli" {...fieldAria("location", { error: err("location") })} {...register("location")} />
            </Field>
            <Field id="municipality" label="Municipality" error={err("municipality")}>
              <select className={selectClassName} {...fieldAria("municipality", { error: err("municipality") })} {...register("municipality")}>
                <option value="">— none / online —</option>
                {MUNICIPALITIES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </Field>
            <label className="flex min-h-tap items-center gap-3 self-end text-sm">
              <input type="checkbox" className="size-5 accent-ojetil-red" {...register("isOnline")} /> Online event
            </label>
            {isOnline ? (
              <Field id="onlineUrl" label="Meeting link" required className="sm:col-span-2" hint="Sent to registered attendees; never shown publicly." error={err("onlineUrl")}>
                <Input type="url" placeholder="https://…" {...fieldAria("onlineUrl", { hint: true, error: err("onlineUrl") })} {...register("onlineUrl")} />
              </Field>
            ) : null}
          </div>
        </div>

        <div className="space-y-5 rounded-card border border-border-subtle bg-surface-card p-5 xl:self-start">
          <Field id="status" label="Status" required error={err("status")}>
            <select className={selectClassName} {...fieldAria("status", { error: err("status") })} {...register("status")}>
              {EVENT_STATUS_VALUES.map((s) => (
                <option key={s} value={s} disabled={s === "PUBLISHED" && !canPublish}>
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </Field>
          <Field id="type" label="Type" required error={err("type")}>
            <select className={selectClassName} {...fieldAria("type", { error: err("type") })} {...register("type")}>
              {EVENT_TYPE_VALUES.map((t) => (
                <option key={t} value={t}>
                  {EVENT_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </Field>
          <Field id="slug" label="URL slug" required hint="/edukasaun/acara/your-slug" error={err("slug")}>
            <div className="flex gap-2">
              <Input className="font-mono text-sm" {...fieldAria("slug", { hint: true, error: err("slug") })} {...register("slug")} />
              <button
                type="button"
                title="Generate from the Tetun title"
                onClick={() => setValue("slug", slugify(getValues("translations.TET.title") ?? ""), { shouldValidate: true, shouldDirty: true })}
                className="inline-flex size-tap shrink-0 items-center justify-center rounded-control border border-border-subtle hover:border-border-strong md:size-10"
              >
                <Wand2 aria-hidden="true" className="size-4" />
                <span className="sr-only">Generate slug from Tetun title</span>
              </button>
            </div>
          </Field>
          <Field id="capacity" label="Capacity (seats)" required hint={registered ? `${registered} currently registered.` : undefined} error={err("capacity")}>
            <Input type="number" inputMode="numeric" min={1} className="tabular-nums" {...fieldAria("capacity", { hint: Boolean(registered), error: err("capacity") })} {...register("capacity")} />
          </Field>
          <label className="flex min-h-tap items-center gap-3 text-sm">
            <input type="checkbox" className="size-5 accent-ojetil-red" {...register("registrationOpen")} /> Registration open
          </label>
          <Field id="registrationDeadline" label="Registration deadline" hint="Empty = until the event starts." error={err("registrationDeadline")}>
            <Input type="datetime-local" {...fieldAria("registrationDeadline", { hint: true, error: err("registrationDeadline") })} {...register("registrationDeadline")} />
          </Field>
          <Field id="coverImageUrl" label="Cover image URL" error={err("coverImageUrl")}>
            <Input placeholder="/uploads/… or https://…" {...fieldAria("coverImageUrl", { error: err("coverImageUrl") })} {...register("coverImageUrl")} />
          </Field>
        </div>
      </fieldset>
      {!readOnly ? (
        <EditorActions
          saving={isSubmitting}
          canDelete={!isNew && totalRegistrations === 0}
          onDelete={onDelete}
          saveLabel={isNew ? "Create event" : "Save changes"}
        />
      ) : null}
    </form>
  );
}
