import { z } from "zod";
import { PASSWORD_MAX_LENGTH, newPasswordSchema } from "@/lib/security/password-policy";

/** Client-safe schema for "change my password". */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password.").max(PASSWORD_MAX_LENGTH),
    newPassword: newPasswordSchema,
    confirmPassword: z.string(),
  })
  .superRefine((v, ctx) => {
    if (v.newPassword !== v.confirmPassword) {
      ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: "The two new passwords do not match." });
    }
    if (v.newPassword && v.newPassword === v.currentPassword) {
      ctx.addIssue({ code: "custom", path: ["newPassword"], message: "Choose a password different from the current one." });
    }
  });

export type ChangePasswordInput = z.input<typeof changePasswordSchema>;
