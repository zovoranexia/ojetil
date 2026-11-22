import { z } from "zod";
import { msg } from "@/lib/i18n-message";
import { PASSWORD_MAX_LENGTH, newPasswordSchema } from "@/lib/security/password-policy";

/** Client-safe schema for "change my password". */
export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, msg("admin.account.validation.currentRequired"))
      .max(PASSWORD_MAX_LENGTH, msg("admin.validation.maxChars", { max: PASSWORD_MAX_LENGTH })),
    newPassword: newPasswordSchema,
    confirmPassword: z.string(),
  })
  .superRefine((v, ctx) => {
    if (v.newPassword !== v.confirmPassword) {
      ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: msg("admin.account.validation.mismatch") });
    }
    if (v.newPassword && v.newPassword === v.currentPassword) {
      ctx.addIssue({ code: "custom", path: ["newPassword"], message: msg("admin.account.validation.sameAsCurrent") });
    }
  });

export type ChangePasswordInput = z.input<typeof changePasswordSchema>;
