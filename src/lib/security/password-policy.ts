import { z } from "zod";
import { msg } from "@/lib/i18n-message";

/** Client-safe password rules (no native deps), shared by forms and the hashing module. */
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

export const newPasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, msg("admin.account.validation.minLength", { min: PASSWORD_MIN_LENGTH }))
  .max(PASSWORD_MAX_LENGTH, msg("admin.validation.maxChars", { max: PASSWORD_MAX_LENGTH }))
  .refine((v) => /[a-z]/.test(v) && /[A-Z]/.test(v), msg("admin.account.validation.mixedCase"))
  .refine((v) => /\d/.test(v) || /[^A-Za-z0-9]/.test(v), msg("admin.account.validation.numberOrSymbol"));
