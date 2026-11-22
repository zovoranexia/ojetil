import { z } from "zod";
import { MUNICIPALITY_VALUES } from "@/config/municipalities";

/**
 * Event registration schema, shared by the client form (instant inline errors)
 * and the server action (authoritative). Messages are injected so both sides
 * show the visitor's language.
 */
export type EventRegistrationErrorKey = "nameMin" | "nameMax" | "email" | "phone" | "textMax" | "consent";

export const PHONE_PATTERN = /^\+?[0-9][0-9 ()-]{6,19}$/;

export function createEventRegistrationSchema(msg: (key: EventRegistrationErrorKey) => string) {
  return z.object({
    eventSlug: z.string().min(1).max(160),
    fullName: z.string().trim().min(3, msg("nameMin")).max(120, msg("nameMax")),
    email: z.string().trim().toLowerCase().max(254, msg("email")).pipe(z.email(msg("email"))),
    phone: z
      .string()
      .trim()
      .max(24, msg("phone"))
      .refine((v) => v === "" || PHONE_PATTERN.test(v), msg("phone")),
    institution: z.string().trim().max(160, msg("textMax")),
    municipality: z.union([z.enum(MUNICIPALITY_VALUES), z.literal("")]),
    consent: z.boolean().refine((v) => v, msg("consent")),
    /** Honeypot: hidden from people, filled by naive bots. */
    website: z.string().max(0).optional(),
  });
}

export type EventRegistrationInput = z.input<ReturnType<typeof createEventRegistrationSchema>>;
export type EventRegistrationData = z.output<ReturnType<typeof createEventRegistrationSchema>>;
