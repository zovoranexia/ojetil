import { z } from "zod";
import { ROLES } from "@/config/rbac";

export const createUserSchema = z.object({
  name: z.string().trim().min(3, "Enter the full name.").max(120),
  email: z.string().trim().toLowerCase().max(254).pipe(z.email("Enter a valid email address.")),
  role: z.enum(ROLES, { error: "Choose a role." }),
});
export type CreateUserInput = z.input<typeof createUserSchema>;

export const changeRoleSchema = z.object({ id: z.string().min(1), role: z.enum(ROLES) });
export const setActiveSchema = z.object({ id: z.string().min(1), active: z.boolean() });
export const userIdSchema = z.object({ id: z.string().min(1) });
