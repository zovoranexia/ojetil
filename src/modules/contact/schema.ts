import { z } from "zod";
import { PHONE_PATTERN } from "@/modules/events/registration-schema";

/**
 * Public contact form — one source of validation for the browser (instant
 * feedback) and the API route (authoritative). Messages are injected so both
 * sides speak the sender's language.
 */
export const CONTACT_TOPICS = ["GENERAL", "MEMBERSHIP", "MEDIA", "PARTNERSHIP", "OTHER"] as const;
export type ContactTopic = (typeof CONTACT_TOPICS)[number];

export const CONTACT_MESSAGE_MAX = 4000;

export type ContactErrorKey = "nameMin" | "nameMax" | "email" | "phone" | "topic" | "messageMin" | "messageMax" | "consent";

export function contactSchema(msg: (key: ContactErrorKey) => string) {
  return z.object({
    name: z.string().trim().min(2, msg("nameMin")).max(120, msg("nameMax")),
    email: z.string().trim().toLowerCase().max(200, msg("email")).pipe(z.email(msg("email"))),
    phone: z
      .string()
      .trim()
      .refine((v) => v === "" || PHONE_PATTERN.test(v), msg("phone"))
      .transform((v) => (v === "" ? undefined : v))
      .optional(),
    topic: z.enum(CONTACT_TOPICS, { error: msg("topic") }),
    message: z.string().trim().min(10, msg("messageMin")).max(CONTACT_MESSAGE_MAX, msg("messageMax")),
    consent: z.literal(true, { error: msg("consent") }),
  });
}

export type ContactInput = z.input<ReturnType<typeof contactSchema>>;
export type ContactData = z.output<ReturnType<typeof contactSchema>>;
