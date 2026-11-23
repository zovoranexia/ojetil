import { after } from "next/server";
import { getTranslations } from "next-intl/server";
import { isAppLocale } from "@/config/locales";
import { jsonError, jsonOk } from "@/lib/http";
import { hasPermission } from "@/config/rbac";
import { withApiAuth } from "@/lib/security/guards";
import { isSameOrigin } from "@/lib/security/origin";
import { submitMemberRegistration } from "@/modules/members/registration-service";
import { readMemberSubmission } from "@/modules/members/submission-request";
import { sendMemberDecision, sendMemberRegistrationReceived } from "@/modules/notifications/emails";

export const runtime = "nodejs";

/**
 * POST /api/admin/members/office?locale=<member's language> — Secretariat staff
 * register a member at the office (multipart/form-data, same fields, validation,
 * photo processing and PII encryption as the public form; phone optional).
 *
 * Recorded with channel OFFICE and the staff member who entered it. With
 * verifyNow=true (and a note) the same staff member verifies it immediately —
 * audited with selfVerified: true — so the card can be printed on the spot;
 * otherwise it waits in the verification queue as PENDING_VERIFICATION.
 */
export const POST = withApiAuth("members:register", async (request, user) => {
  const rawLocale = new URL(request.url).searchParams.get("locale");
  const locale = isAppLocale(rawLocale) ? rawLocale : "tet";
  const t = await getTranslations({ locale, namespace: "memberRegistration.errors" });

  if (!isSameOrigin(request)) return jsonError(403, "FORBIDDEN", t("generic"));

  const read = await readMemberSubmission(request, (k) => t(k), { honeypot: false, phoneOptional: true });
  if (!read.ok) return read.response;
  const { data, photo, form } = read;

  // Optional: verify on the spot (needs members:verify, which both office roles have).
  const verifyNow = form.get("verifyNow") === "true" && hasPermission(user.role, "members:verify");
  const verifyNote = String(form.get("verifyNote") ?? "").trim().slice(0, 1000);
  if (verifyNow && verifyNote.length < 5) {
    return jsonError(422, "VALIDATION", t("form"), { fieldErrors: { verifyNote: [t("verifyNote")] } });
  }

  try {
    const result = await submitMemberRegistration(data, photo, locale, { registeredBy: user, verifyNow: verifyNow ? { note: verifyNote } : undefined });
    // The member gets the tracking code (and, if verified now, the outcome) by email when they have one.
    after(() =>
      result.status === "VERIFIED"
        ? sendMemberDecision(result.id)
        : sendMemberRegistrationReceived({ email: data.email || null, fullName: data.fullName, trackingCode: result.trackingCode, category: data.category, locale }),
    );
    return jsonOk(result, 201);
  } catch (error) {
    console.error("[members] office registration failed", error);
    return jsonError(500, "INTERNAL", t("generic"));
  }
});
