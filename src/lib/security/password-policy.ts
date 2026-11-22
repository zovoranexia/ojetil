import { z } from "zod";

/** Client-safe password rules (no native deps), shared by forms and the hashing module. */
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

export const newPasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters.`)
  .max(PASSWORD_MAX_LENGTH, `Use at most ${PASSWORD_MAX_LENGTH} characters.`)
  .refine((v) => /[a-z]/.test(v) && /[A-Z]/.test(v), "Mix upper- and lower-case letters.")
  .refine((v) => /\d/.test(v) || /[^A-Za-z0-9]/.test(v), "Include a number or a symbol.");
