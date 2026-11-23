import { after } from "next/server";
import { getTranslations } from "next-intl/server";
import { isAppLocale } from "@/config/locales";
import { jsonError, jsonOk } from "@/lib/http";
import { contextFromHeaders } from "@/lib/request-context";
import { isSameOrigin } from "@/lib/security/origin";
import { rateLimit } from "@/lib/security/rate-limit";
import { submitMemberRegistration } from "@/modules/members/registration-service";
import { readMemberSubmission } from "@/modules/members/submission-request";
import { sendAdminNewMember, sendMemberRegistrationReceived } from "@/modules/notifications/emails";

export const runtime = "nodejs";

/**
 * POST /api/members — public member & veteran registration (multipart/form-data).
 * 201 → { ok: true, data: { trackingCode, status } }
 * 422 → localised field errors · 429 → rate limited · 403 → cross-site request
 */
export async function POST(request: Request) {
  const rawLocale = new URL(request.url).searchParams.get("locale");
  const locale = isAppLocale(rawLocale) ? rawLocale : "tet";
  const t = await getTranslations({ locale, namespace: "memberRegistration.errors" });

  if (!isSameOrigin(request)) return jsonError(403, "FORBIDDEN", t("generic"));

  const { ipAddress } = contextFromHeaders(request.headers);
  const limit = rateLimit("member-register", ipAddress ?? "unknown", 5, 10 * 60_000);
  if (!limit.ok) return jsonError(429, "RATE_LIMITED", t("rateLimited"), { retryAfterSeconds: limit.retryAfterSeconds });

  const read = await readMemberSubmission(request, (k) => t(k), { honeypot: true });
  if (!read.ok) return read.response;
  const { data, photo } = read;

  try {
    const result = await submitMemberRegistration(data, photo, locale);
    // Emails go out after the response: a slow or failing mail server never delays or breaks the registration.
    after(() =>
      Promise.all([
        sendMemberRegistrationReceived({ email: data.email || null, fullName: data.fullName, trackingCode: result.trackingCode, category: data.category, locale }),
        sendAdminNewMember({ trackingCode: result.trackingCode, category: data.category, municipality: data.municipality }),
      ]),
    );
    return jsonOk({ trackingCode: result.trackingCode, status: result.status }, 201);
  } catch (error) {
    console.error("[members] registration failed", error);
    return jsonError(500, "INTERNAL", t("generic"));
  }
}
