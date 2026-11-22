import { z } from "zod";
import { MUNICIPALITY_VALUES } from "@/config/municipalities";
import { fromDiliLocalInput } from "@/lib/dates";
import { msg } from "@/lib/i18n-message";
import { imageUrlField, slugField } from "@/modules/content/admin-common";
import { translationsSchema, type TranslationFieldSpec } from "@/modules/content/admin-schema";

export const EVENT_TYPE_VALUES = ["SEMINAR", "DEBATE", "WORKSHOP"] as const;
export const EVENT_STATUS_VALUES = ["DRAFT", "PUBLISHED", "CANCELLED"] as const;

export const EVENT_TRANSLATION_FIELDS: readonly TranslationFieldSpec[] = [
  { name: "title", label: msg("admin.events.fields.title"), required: true, max: 200 },
  { name: "summary", label: msg("admin.events.fields.summary"), required: true, max: 400, multiline: true, rows: 3 },
  { name: "description", label: msg("admin.events.fields.description"), required: true, max: 20000, multiline: true, rows: 10, hint: msg("admin.events.fields.descriptionHint") },
  { name: "locationDetails", label: msg("admin.events.fields.locationDetails"), required: false, max: 300, hint: msg("admin.events.fields.locationDetailsHint") },
];

const localDateTime = (message: string) =>
  z
    .string()
    .trim()
    .refine((v) => fromDiliLocalInput(v) !== null, message);

export const eventFormSchema = z
  .object({
    id: z.string().optional(),
    slug: slugField,
    type: z.enum(EVENT_TYPE_VALUES),
    status: z.enum(EVENT_STATUS_VALUES),
    startAt: localDateTime(msg("admin.events.validation.startInvalid")),
    endAt: localDateTime(msg("admin.events.validation.endInvalid")),
    location: z.string().trim().min(2, msg("admin.events.validation.venueMin")).max(200, msg("admin.validation.maxChars", { max: 200 })),
    municipality: z.union([z.enum(MUNICIPALITY_VALUES), z.literal("")]),
    isOnline: z.boolean(),
    onlineUrl: z
      .string()
      .trim()
      .max(500, msg("admin.validation.maxChars", { max: 500 }))
      .refine((v) => v === "" || /^https:\/\/[^\s]+$/.test(v), msg("admin.events.validation.httpsLink")),
    capacity: z.coerce
      .number({ error: msg("admin.events.validation.number") })
      .int(msg("admin.events.validation.wholeNumber"))
      .min(1, msg("admin.events.validation.minSeat"))
      .max(100_000, msg("admin.events.validation.maxSeats", { max: 100_000 })),
    registrationOpen: z.boolean(),
    registrationDeadline: z
      .string()
      .trim()
      .refine((v) => v === "" || fromDiliLocalInput(v) !== null, msg("admin.events.validation.deadlineInvalid")),
    coverImageUrl: imageUrlField,
    translations: translationsSchema(EVENT_TRANSLATION_FIELDS),
  })
  .superRefine((v, ctx) => {
    const start = fromDiliLocalInput(v.startAt);
    const end = fromDiliLocalInput(v.endAt);
    if (start && end && end <= start) ctx.addIssue({ code: "custom", path: ["endAt"], message: msg("admin.events.validation.endAfterStart") });
    if (v.isOnline && !v.onlineUrl) ctx.addIssue({ code: "custom", path: ["onlineUrl"], message: msg("admin.events.validation.meetingLinkRequired") });
    const deadline = v.registrationDeadline ? fromDiliLocalInput(v.registrationDeadline) : null;
    if (deadline && start && deadline > start) ctx.addIssue({ code: "custom", path: ["registrationDeadline"], message: msg("admin.events.validation.deadlineBeforeStart") });
  });

export type EventFormValues = z.input<typeof eventFormSchema>;

export const ATTENDEE_STATUS_VALUES = ["REGISTERED", "ATTENDED", "CANCELLED"] as const;
export const attendanceSchema = z.object({ registrationId: z.string().min(1), status: z.enum(ATTENDEE_STATUS_VALUES) });
