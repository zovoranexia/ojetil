import { z } from "zod";
import { ROLES } from "@/config/rbac";
import { msg } from "@/lib/i18n-message";

export const createUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, msg("admin.users.validation.nameRequired"))
    .max(120, msg("admin.validation.maxChars", { max: 120 })),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254, msg("admin.validation.maxChars", { max: 254 }))
    .pipe(z.email(msg("admin.validation.email"))),
  role: z.enum(ROLES, { error: msg("admin.users.validation.roleRequired") }),
});
export type CreateUserInput = z.input<typeof createUserSchema>;

export const changeRoleSchema = z.object({ id: z.string().min(1), role: z.enum(ROLES) });
export const setActiveSchema = z.object({ id: z.string().min(1), active: z.boolean() });
export const userIdSchema = z.object({ id: z.string().min(1) });
