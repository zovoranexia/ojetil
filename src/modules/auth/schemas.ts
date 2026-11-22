import { z } from "zod";
import { msg } from "@/lib/i18n-message";
import { PASSWORD_MAX_LENGTH } from "@/lib/security/password-policy";

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, msg("admin.auth.validation.emailRequired"))
    .max(254, msg("admin.validation.maxChars", { max: 254 }))
    .pipe(z.email(msg("admin.validation.email"))),
  password: z
    .string()
    .min(1, msg("admin.auth.validation.passwordRequired"))
    .max(PASSWORD_MAX_LENGTH, msg("admin.validation.maxChars", { max: PASSWORD_MAX_LENGTH })),
  callbackUrl: z.string().max(512).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;

/** Only same-origin admin paths are accepted as post-login destinations (no open redirects). */
export function safeAdminCallback(raw: string | null | undefined): string {
  const fallback = "/admin";
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || /[\\\s]/.test(raw)) return fallback;
  try {
    const base = "http://ojetil.invalid";
    const url = new URL(raw, base);
    if (url.origin !== base) return fallback;
    const inAdmin = url.pathname === "/admin" || url.pathname.startsWith("/admin/");
    if (!inAdmin || url.pathname.startsWith("/admin/login")) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
