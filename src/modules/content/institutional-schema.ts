import { z } from "zod";
import { MUNICIPALITY_VALUES } from "@/config/municipalities";
import { msg } from "@/lib/i18n-message";
import { CONTENT_STATUSES, imageUrlField, slugField } from "./admin-common";
import { translationsSchema, type TranslationFieldSpec } from "./admin-schema";

/* Client-safe schemas for the timeline, leadership and profile editors. */

/** Required integer from a form input. An emptied field is an error, never silently 0 (which Number("") would give). */
const intField = (min: number, max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.coerce
      .number({ error: msg("admin.content.validation.number") })
      .int(msg("admin.content.validation.wholeNumber"))
      .min(min, msg("admin.content.validation.numberMin", { min }))
      .max(max, msg("admin.content.validation.numberMax", { max })),
  );

/* ── Timeline ── */
export const DATE_PRECISIONS = ["DECADE", "YEAR", "MONTH", "DAY"] as const;
export const TIMELINE_TRANSLATION_FIELDS: readonly TranslationFieldSpec[] = [
  { name: "title", label: msg("admin.timeline.fields.title"), required: true, max: 200 },
  { name: "summary", label: msg("admin.timeline.fields.summary"), required: true, max: 600, multiline: true, rows: 3 },
  { name: "body", label: msg("admin.timeline.fields.body"), required: false, max: 100_000, rich: true },
  { name: "imageAlt", label: msg("admin.timeline.fields.imageAlt"), required: false, max: 200 },
];

export const timelineFormSchema = z
  .object({
    id: z.string().optional(),
    slug: slugField,
    year: intField(1900, 2100),
    month: z.string(),
    day: z.string(),
    datePrecision: z.enum(DATE_PRECISIONS),
    displayOrder: intField(0, 100000),
    isHighlighted: z.boolean(),
    status: z.enum(CONTENT_STATUSES),
    imageUrl: imageUrlField,
    translations: translationsSchema(TIMELINE_TRANSLATION_FIELDS),
  })
  .superRefine((v, ctx) => {
    const month = v.month ? Number(v.month) : null;
    const day = v.day ? Number(v.day) : null;
    if ((v.datePrecision === "MONTH" || v.datePrecision === "DAY") && !(month && month >= 1 && month <= 12)) {
      ctx.addIssue({ code: "custom", path: ["month"], message: msg("admin.timeline.validation.monthRequired") });
    }
    if (v.datePrecision === "DAY") {
      const y = Number(v.year);
      const valid = month && day && new Date(Date.UTC(y, month - 1, day)).getUTCDate() === day;
      if (!valid) ctx.addIssue({ code: "custom", path: ["day"], message: msg("admin.timeline.validation.dayInvalid") });
    }
  });
export type TimelineFormValues = z.input<typeof timelineFormSchema>;

/* ── Leadership ── */
export const LEADERSHIP_TRANSLATION_FIELDS: readonly TranslationFieldSpec[] = [
  { name: "title", label: msg("admin.leadership.fields.title"), required: true, max: 120 },
  { name: "bio", label: msg("admin.leadership.fields.bio"), required: false, max: 600, multiline: true, rows: 3 },
];

export const leadershipFormSchema = z
  .object({
    id: z.string().optional(),
    fullName: z.string().trim().min(3, msg("admin.leadership.validation.fullNameRequired")).max(120, msg("admin.validation.maxChars", { max: 120 })),
    photoUrl: imageUrlField,
    level: z.enum(["NATIONAL", "MUNICIPAL"]),
    municipality: z.union([z.enum(MUNICIPALITY_VALUES), z.literal("")]),
    termStart: intField(1975, 2100),
    termEnd: z.string(),
    displayOrder: intField(0, 100000),
    status: z.enum(CONTENT_STATUSES),
    translations: translationsSchema(LEADERSHIP_TRANSLATION_FIELDS),
  })
  .superRefine((v, ctx) => {
    if (v.level === "MUNICIPAL" && !v.municipality) ctx.addIssue({ code: "custom", path: ["municipality"], message: msg("admin.leadership.validation.municipalityRequired") });
    if (v.termEnd) {
      const end = Number(v.termEnd);
      if (!Number.isInteger(end) || end < Number(v.termStart) || end > 2100) {
        ctx.addIssue({ code: "custom", path: ["termEnd"], message: msg("admin.leadership.validation.termEndRange") });
      }
    }
  });
export type LeadershipFormValues = z.input<typeof leadershipFormSchema>;

/* ── Profile sections ── */
export const PROFILE_SECTION_KEYS = ["PROFILE", "VISION", "MISSION", "VALUES", "HISTORY_INTRO"] as const;
/* Section names and placement hints live in messages: admin.profile.sections.<KEY>.{label,where}. */
export const PROFILE_TRANSLATION_FIELDS: readonly TranslationFieldSpec[] = [
  { name: "title", label: msg("admin.profile.fields.title"), required: true, max: 200 },
  { name: "body", label: msg("admin.profile.fields.body"), required: true, max: 100_000, rich: true },
];
export const profileFormSchema = z.object({
  key: z.enum(PROFILE_SECTION_KEYS),
  status: z.enum(CONTENT_STATUSES),
  translations: translationsSchema(PROFILE_TRANSLATION_FIELDS),
});
export type ProfileFormValues = z.input<typeof profileFormSchema>;
