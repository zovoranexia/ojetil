import { z } from "zod";
import { MUNICIPALITY_VALUES } from "@/config/municipalities";
import { fromDiliLocalInput } from "@/lib/dates";
import { imageUrlField, slugField } from "@/modules/content/admin-common";
import { translationsSchema, type TranslationFieldSpec } from "@/modules/content/admin-schema";

export const EVENT_TYPE_VALUES = ["SEMINAR", "DEBATE", "WORKSHOP"] as const;
export const EVENT_STATUS_VALUES = ["DRAFT", "PUBLISHED", "CANCELLED"] as const;
export const EVENT_TYPE_LABELS = { SEMINAR: "Seminar", DEBATE: "Public debate", WORKSHOP: "Workshop" } as const;

export const EVENT_TRANSLATION_FIELDS: readonly TranslationFieldSpec[] = [
  { name: "title", label: "Title", required: true, max: 200 },
  { name: "summary", label: "Summary", required: true, max: 400, multiline: true, rows: 3 },
  { name: "description", label: "Description", required: true, max: 20000, multiline: true, rows: 10, hint: "Markdown supported (agenda lists, **bold**)." },
  { name: "locationDetails", label: "Directions / location details", required: false, max: 300, hint: "e.g. “2nd floor, next to the library”." },
];

const localDateTime = (label: string) =>
  z
    .string()
    .trim()
    .refine((v) => fromDiliLocalInput(v) !== null, `${label}: choose a valid date and time.`);

export const eventFormSchema = z
  .object({
    id: z.string().optional(),
    slug: slugField,
    type: z.enum(EVENT_TYPE_VALUES),
    status: z.enum(EVENT_STATUS_VALUES),
    startAt: localDateTime("Start"),
    endAt: localDateTime("End"),
    location: z.string().trim().min(2, "Enter the venue or “Online”.").max(200),
    municipality: z.union([z.enum(MUNICIPALITY_VALUES), z.literal("")]),
    isOnline: z.boolean(),
    onlineUrl: z
      .string()
      .trim()
      .max(500)
      .refine((v) => v === "" || /^https:\/\/[^\s]+$/.test(v), "Use an https:// link."),
    capacity: z.coerce.number({ error: "Enter a number." }).int("Enter a whole number.").min(1, "At least 1 seat.").max(100_000),
    registrationOpen: z.boolean(),
    registrationDeadline: z
      .string()
      .trim()
      .refine((v) => v === "" || fromDiliLocalInput(v) !== null, "Choose a valid date and time, or leave empty."),
    coverImageUrl: imageUrlField,
    translations: translationsSchema(EVENT_TRANSLATION_FIELDS),
  })
  .superRefine((v, ctx) => {
    const start = fromDiliLocalInput(v.startAt);
    const end = fromDiliLocalInput(v.endAt);
    if (start && end && end <= start) ctx.addIssue({ code: "custom", path: ["endAt"], message: "The event must end after it starts." });
    if (v.isOnline && !v.onlineUrl) ctx.addIssue({ code: "custom", path: ["onlineUrl"], message: "Online events need a meeting link." });
    const deadline = v.registrationDeadline ? fromDiliLocalInput(v.registrationDeadline) : null;
    if (deadline && start && deadline > start) ctx.addIssue({ code: "custom", path: ["registrationDeadline"], message: "The deadline must be before the start." });
  });

export type EventFormValues = z.input<typeof eventFormSchema>;

export const ATTENDEE_STATUS_VALUES = ["REGISTERED", "ATTENDED", "CANCELLED"] as const;
export const attendanceSchema = z.object({ registrationId: z.string().min(1), status: z.enum(ATTENDEE_STATUS_VALUES) });
