import { z } from "zod";
import { INTEREST_AREAS, MUNICIPALITY_VALUES } from "@/config/municipalities";
import { PHONE_PATTERN } from "@/modules/events/registration-schema";

/**
 * Member & veteran registration — one source of validation for the 3-step
 * wizard (per-step, instant feedback) and the API (authoritative, all steps).
 * Messages are injected so both sides speak the applicant's language.
 */
export const MEMBER_CATEGORIES = ["VETERAN_KLANDESTIN", "ANGGOTA_PEMUDA"] as const;
export const GENDERS = ["MALE", "FEMALE", "PREFER_NOT_TO_SAY"] as const;
export const CONSENT_VERSION = "2026-11-v1";

export const MAX_PHOTO_BYTES = 1_048_576;
export const PHOTO_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/** Clandestine-era membership window: from the 1975 invasion to the 1999 referendum. */
export const YEAR_JOINED_MIN = 1975;
export const YEAR_JOINED_MAX = 1999;
export const MIN_AGE = 13;

export type MemberErrorKey =
  | "category"
  | "nameMin"
  | "nameMax"
  | "aliasMax"
  | "dobInvalid"
  | "dobRange"
  | "gender"
  | "municipality"
  | "postRequired"
  | "addressMin"
  | "textMax"
  | "phone"
  | "email"
  | "nationalId"
  | "yearJoined"
  | "yearJoinedAge"
  | "cellRequired"
  | "institutionRequired"
  | "interests"
  | "motivationMin"
  | "consent";

type Msg = (key: MemberErrorKey) => string;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Parses YYYY-MM-DD strictly (rejects 2026-02-30). */
export function parseIsoDate(value: string): Date | null {
  if (!ISO_DATE.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d ? date : null;
}

function ageOn(dob: Date, today: Date): number {
  let age = today.getUTCFullYear() - dob.getUTCFullYear();
  const beforeBirthday =
    today.getUTCMonth() < dob.getUTCMonth() ||
    (today.getUTCMonth() === dob.getUTCMonth() && today.getUTCDate() < dob.getUTCDate());
  if (beforeBirthday) age--;
  return age;
}

export function birthYearOf(dateOfBirth: string | undefined): number | null {
  return dateOfBirth ? (parseIsoDate(dateOfBirth)?.getUTCFullYear() ?? null) : null;
}

const optionalText = (max: number, msg: Msg) =>
  z
    .string()
    .trim()
    .max(max, msg("textMax"))
    .transform((v) => (v === "" ? undefined : v))
    .optional();

export function memberStepSchemas(msg: Msg, today: Date = new Date()) {
  const step1 = z.object({
    category: z.enum(MEMBER_CATEGORIES, { error: msg("category") }),
    fullName: z.string().trim().min(3, msg("nameMin")).max(120, msg("nameMax")),
    clandestineAlias: z.string().trim().max(80, msg("aliasMax")).optional(),
    dateOfBirth: z
      .string()
      .refine((v) => parseIsoDate(v) !== null, msg("dobInvalid"))
      .refine((v) => {
        const dob = parseIsoDate(v);
        if (!dob) return true; // reported by the previous check
        const age = ageOn(dob, today);
        return age >= MIN_AGE && age <= 110;
      }, msg("dobRange")),
    gender: z.enum(GENDERS, { error: msg("gender") }),
  });

  const step2 = z.object({
    municipality: z.enum(MUNICIPALITY_VALUES, { error: msg("municipality") }),
    administrativePost: z.string().trim().min(2, msg("postRequired")).max(80, msg("textMax")),
    address: z.string().trim().min(5, msg("addressMin")).max(300, msg("textMax")),
    phone: z.string().trim().regex(PHONE_PATTERN, msg("phone")),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .max(254, msg("email"))
      .refine((v) => v === "" || z.email().safeParse(v).success, msg("email")),
    nationalId: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9][A-Za-z0-9 ./-]{4,29}$/, msg("nationalId")),
  });

  const consent = z.boolean().refine((v) => v, msg("consent"));

  /** Veteran step 3. `birthYear` (from step 1) bounds the year joined: nobody joined before age 8. */
  const step3Veteran = (birthYear: number | null) =>
    z.object({
      yearJoined: z.coerce
        .number({ error: msg("yearJoined") })
        .int(msg("yearJoined"))
        .min(YEAR_JOINED_MIN, msg("yearJoined"))
        .max(YEAR_JOINED_MAX, msg("yearJoined"))
        .refine((y) => birthYear === null || y >= birthYear + 8, msg("yearJoinedAge")),
      clandestineCell: z.string().trim().min(2, msg("cellRequired")).max(160, msg("textMax")),
      clandestineRegion: optionalText(120, msg),
      witnessReference: optionalText(160, msg),
      consent,
    });

  const step3Youth = z.object({
    institution: z.string().trim().min(2, msg("institutionRequired")).max(160, msg("textMax")),
    interests: z.array(z.enum(INTEREST_AREAS)).min(1, msg("interests")),
    motivation: z.string().trim().min(20, msg("motivationMin")).max(1000, msg("textMax")),
    consent,
  });

  return { step1, step2, step3Veteran, step3Youth };
}

/** Authoritative server schema: all three steps, discriminated by track. */
export function memberSubmissionSchema(msg: Msg, birthYear: number | null, today: Date = new Date()) {
  const s = memberStepSchemas(msg, today);
  const common = s.step1.omit({ category: true }).extend(s.step2.shape);
  return z.discriminatedUnion(
    "category",
    [
      common.extend(s.step3Veteran(birthYear).shape).extend({ category: z.literal("VETERAN_KLANDESTIN") }),
      common.extend(s.step3Youth.shape).extend({ category: z.literal("ANGGOTA_PEMUDA") }),
    ],
    { error: msg("category") },
  );
}

export type MemberSubmission = z.output<ReturnType<typeof memberSubmissionSchema>>;

/** Validates a complete submission (all steps) from untrusted input. */
export function parseMemberSubmission(input: Record<string, unknown>, msg: Msg, today: Date = new Date()) {
  const birthYear = birthYearOf(typeof input.dateOfBirth === "string" ? input.dateOfBirth : undefined);
  return memberSubmissionSchema(msg, birthYear, today).safeParse(input);
}

/** Wizard form values (strings as typed into inputs). */
export interface MemberFormValues {
  category: (typeof MEMBER_CATEGORIES)[number] | "";
  fullName: string;
  clandestineAlias: string;
  dateOfBirth: string;
  gender: (typeof GENDERS)[number] | "";
  municipality: string;
  administrativePost: string;
  address: string;
  phone: string;
  email: string;
  nationalId: string;
  yearJoined: string;
  clandestineCell: string;
  clandestineRegion: string;
  witnessReference: string;
  institution: string;
  interests: Array<(typeof INTEREST_AREAS)[number]>;
  motivation: string;
  consent: boolean;
  website: string;
}

export const STEP_FIELDS = {
  1: ["category", "fullName", "clandestineAlias", "dateOfBirth", "gender"],
  2: ["municipality", "administrativePost", "address", "phone", "email", "nationalId"],
  3: ["yearJoined", "clandestineCell", "clandestineRegion", "witnessReference", "institution", "interests", "motivation", "consent"],
} as const satisfies Record<1 | 2 | 3, ReadonlyArray<keyof MemberFormValues>>;

/* ── Status lookup ─────────────────────────────────────────────────────── */
export type StatusLookupErrorKey = "code" | "dobInvalid";

export function statusLookupSchema(msg: (k: StatusLookupErrorKey) => string) {
  return z.object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^OJT-?\d{4}-?\d{1,6}$/, msg("code")),
    dateOfBirth: z.string().refine((v) => parseIsoDate(v) !== null, msg("dobInvalid")),
  });
}
