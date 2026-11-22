import { z } from "zod";
import { MUNICIPALITY_VALUES } from "@/config/municipalities";
import { CONTENT_STATUSES, imageUrlField, slugField } from "./admin-common";
import { translationsSchema, type TranslationFieldSpec } from "./admin-schema";

/* Client-safe schemas for the timeline, leadership and profile editors. */

/** Required integer from a form input. An emptied field is an error, never silently 0 (which Number("") would give). */
const intField = (label: string, min: number, max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.coerce
      .number({ error: `${label}: enter a number.` })
      .int(`${label}: whole number.`)
      .min(min, `${label}: at least ${min}.`)
      .max(max, `${label}: at most ${max}.`),
  );

/* ── Timeline ── */
export const DATE_PRECISIONS = ["DECADE", "YEAR", "MONTH", "DAY"] as const;
export const TIMELINE_TRANSLATION_FIELDS: readonly TranslationFieldSpec[] = [
  { name: "title", label: "Title", required: true, max: 200 },
  { name: "summary", label: "Summary", required: true, max: 600, multiline: true, rows: 3 },
  { name: "body", label: "Full story", required: false, max: 10000, multiline: true, rows: 8, hint: "Markdown. Shown when the reader expands the milestone." },
  { name: "imageAlt", label: "Image description (alt text)", required: false, max: 200 },
];

export const timelineFormSchema = z
  .object({
    id: z.string().optional(),
    slug: slugField,
    year: intField("Year", 1900, 2100),
    month: z.string(),
    day: z.string(),
    datePrecision: z.enum(DATE_PRECISIONS),
    displayOrder: intField("Order", 0, 100000),
    isHighlighted: z.boolean(),
    status: z.enum(CONTENT_STATUSES),
    imageUrl: imageUrlField,
    translations: translationsSchema(TIMELINE_TRANSLATION_FIELDS),
  })
  .superRefine((v, ctx) => {
    const month = v.month ? Number(v.month) : null;
    const day = v.day ? Number(v.day) : null;
    if ((v.datePrecision === "MONTH" || v.datePrecision === "DAY") && !(month && month >= 1 && month <= 12)) {
      ctx.addIssue({ code: "custom", path: ["month"], message: "Choose the month for this precision." });
    }
    if (v.datePrecision === "DAY") {
      const y = Number(v.year);
      const valid = month && day && new Date(Date.UTC(y, month - 1, day)).getUTCDate() === day;
      if (!valid) ctx.addIssue({ code: "custom", path: ["day"], message: "Enter a valid day for this month." });
    }
  });
export type TimelineFormValues = z.input<typeof timelineFormSchema>;

/* ── Leadership ── */
export const LEADERSHIP_TRANSLATION_FIELDS: readonly TranslationFieldSpec[] = [
  { name: "title", label: "Position title", required: true, max: 120 },
  { name: "bio", label: "Short biography", required: false, max: 600, multiline: true, rows: 3 },
];

export const leadershipFormSchema = z
  .object({
    id: z.string().optional(),
    fullName: z.string().trim().min(3, "Enter the full name.").max(120),
    photoUrl: imageUrlField,
    level: z.enum(["NATIONAL", "MUNICIPAL"]),
    municipality: z.union([z.enum(MUNICIPALITY_VALUES), z.literal("")]),
    termStart: intField("Term start", 1975, 2100),
    termEnd: z.string(),
    displayOrder: intField("Order", 0, 100000),
    status: z.enum(CONTENT_STATUSES),
    translations: translationsSchema(LEADERSHIP_TRANSLATION_FIELDS),
  })
  .superRefine((v, ctx) => {
    if (v.level === "MUNICIPAL" && !v.municipality) ctx.addIssue({ code: "custom", path: ["municipality"], message: "Municipal coordinators need a municipality." });
    if (v.termEnd) {
      const end = Number(v.termEnd);
      if (!Number.isInteger(end) || end < Number(v.termStart) || end > 2100) {
        ctx.addIssue({ code: "custom", path: ["termEnd"], message: "Term end must be a year between the start year and 2100." });
      }
    }
  });
export type LeadershipFormValues = z.input<typeof leadershipFormSchema>;

/* ── Profile sections ── */
export const PROFILE_SECTION_KEYS = ["PROFILE", "VISION", "MISSION", "VALUES", "HISTORY_INTRO"] as const;
export const PROFILE_SECTION_LABELS: Record<(typeof PROFILE_SECTION_KEYS)[number], { label: string; where: string }> = {
  PROFILE: { label: "Institutional profile", where: "About page — introduction" },
  VISION: { label: "Vision", where: "About page" },
  MISSION: { label: "Mission", where: "About page — one point per “- ” line" },
  VALUES: { label: "Values & motto", where: "About page" },
  HISTORY_INTRO: { label: "History introduction", where: "History page header" },
};
export const PROFILE_TRANSLATION_FIELDS: readonly TranslationFieldSpec[] = [
  { name: "title", label: "Title", required: true, max: 200 },
  { name: "body", label: "Text", required: true, max: 10000, multiline: true, rows: 8, hint: "Markdown supported." },
];
export const profileFormSchema = z.object({
  key: z.enum(PROFILE_SECTION_KEYS),
  status: z.enum(CONTENT_STATUSES),
  translations: translationsSchema(PROFILE_TRANSLATION_FIELDS),
});
export type ProfileFormValues = z.input<typeof profileFormSchema>;
