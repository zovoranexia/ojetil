import { after } from "next/server";
import { getTranslations } from "next-intl/server";
import { isAppLocale } from "@/config/locales";
import { jsonError, jsonOk } from "@/lib/http";
import { withApiAuth } from "@/lib/security/guards";
import { isSameOrigin } from "@/lib/security/origin";
import { submitMemberRegistration } from "@/modules/members/registration-service";
import { readMemberSubmission } from "@/modules/members/submission-request";
import { sendMemberRegistrationReceived } from "@/modules/notifications/emails";

export const runtime = "nodejs";

/**
 * POST /api/admin/members/office?locale=<member's language> — Secretariat staff
 * register a member at the office (multipart/form-data, same fields, validation,
 * photo processing and PII encryption as the public form; phone optional).
 *
 * The application enters the normal verification queue as PENDING_VERIFICATION,
 * recorded with channel OFFICE and the staff member who entered it. That person
 * can never decide on it (four-eyes rule, enforced in decideMemberRegistration).
 */
export const POST = withApiAuth("members:register", async (request, user) => {
  const rawLocale = new URL(request.url).searchParams.get("locale");
  const locale = isAppLocale(rawLocale) ? rawLocale : "tet";
  const t = await getTranslations({ locale, namespace: "memberRegistration.errors" });

  if (!isSameOrigin(request)) return jsonError(403, "FORBIDDEN", t("generic"));

  const read = await readMemberSubmission(request, (k) => t(k), { honeypot: false, phoneOptional: true });
  if (!read.ok) return read.response;
  const { data, photo } = read;

  try {
    const result = await submitMemberRegistration(data, photo, locale, { registeredBy: user });
    // The member gets the tracking code by email when they have one; no staff alert (staff entered it).
    after(() => sendMemberRegistrationReceived({ email: data.email || null, fullName: data.fullName, trackingCode: result.trackingCode, category: data.category, locale }));
    return jsonOk(result, 201);
  } catch (error) {
    console.error("[members] office registration failed", error);
    return jsonError(500, "INTERNAL", t("generic"));
  }
});
