import { getTranslations } from "next-intl/server";
import { isAppLocale } from "@/config/locales";
import { fieldErrorsFrom } from "@/lib/actions";
import { jsonError, jsonOk } from "@/lib/http";
import { contextFromHeaders } from "@/lib/request-context";
import { isSameOrigin } from "@/lib/security/origin";
import { isRateLimited, rateLimit } from "@/lib/security/rate-limit";
import { normalizeTrackingCode } from "@/lib/codes";
import { statusLookupSchema } from "@/modules/members/registration-schema";
import { lookupRegistrationStatus } from "@/modules/members/registration-service";

export const runtime = "nodejs";

/** Failed lookups allowed per tracking code per hour. */
const MAX_FAILED_PER_CODE = 8;

/**
 * POST /api/members/status — { code, dateOfBirth } → verification status (no PII).
 * POST, not GET: the date of birth must never appear in URLs, logs or browser history.
 */
export async function POST(request: Request) {
  const rawLocale = new URL(request.url).searchParams.get("locale");
  const locale = isAppLocale(rawLocale) ? rawLocale : "tet";
  const t = await getTranslations({ locale, namespace: "statusLookup.errors" });

  if (!isSameOrigin(request)) return jsonError(403, "FORBIDDEN", t("generic"));

  const { ipAddress } = contextFromHeaders(request.headers);
  const limit = rateLimit("member-status", ipAddress ?? "unknown", 10, 5 * 60_000);
  if (!limit.ok) return jsonError(429, "RATE_LIMITED", t("rateLimited"), { retryAfterSeconds: limit.retryAfterSeconds });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "VALIDATION", t("generic"));
  }

  const parsed = statusLookupSchema((k) => t(k)).safeParse(body);
  if (!parsed.success) return jsonError(422, "VALIDATION", t("form"), { fieldErrors: fieldErrorsFrom(parsed.error) });

  /*
   * Per-code limit on FAILED attempts: tracking codes are sequential, so the
   * date of birth is the only secret. Counting failures per code (not per IP)
   * stops a distributed brute force of the birth date, however many IPs are used.
   */
  const codeKey = normalizeTrackingCode(parsed.data.code) ?? parsed.data.code;
  const codeLimit = isRateLimited("member-status-code", codeKey, MAX_FAILED_PER_CODE);
  if (!codeLimit.ok) return jsonError(429, "RATE_LIMITED", t("rateLimited"), { retryAfterSeconds: codeLimit.retryAfterSeconds });

  const result = await lookupRegistrationStatus(parsed.data.code, parsed.data.dateOfBirth);
  // One generic answer for "no such code" and "wrong date of birth".
  if (!result) {
    rateLimit("member-status-code", codeKey, MAX_FAILED_PER_CODE, 60 * 60_000);
    return jsonError(404, "NOT_FOUND", t("notFound"));
  }

  return jsonOk({
    ...result,
    submittedAt: result.submittedAt.toISOString(),
    updatedAt: result.updatedAt.toISOString(),
    verifiedAt: result.verifiedAt?.toISOString() ?? null,
  });
}
