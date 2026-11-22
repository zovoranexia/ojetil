import { getTranslations } from "next-intl/server";
import { isAppLocale } from "@/config/locales";
import { fieldErrorsFrom } from "@/lib/actions";
import { jsonError, jsonOk } from "@/lib/http";
import { contextFromHeaders } from "@/lib/request-context";
import { isSameOrigin } from "@/lib/security/origin";
import { rateLimit } from "@/lib/security/rate-limit";
import { contactSchema, type ContactErrorKey } from "@/modules/contact/schema";
import { createContactMessage } from "@/modules/contact/service";

export const runtime = "nodejs";

/** JSON body ceiling: a 4 000-character message plus the other fields, with room for multi-byte text. */
const MAX_BODY_BYTES = 32_000;
/** Faster than this between page load and submit is a bot, not a person typing. */
const MIN_FILL_MS = 3_000;

/**
 * POST /api/contact — public contact form (JSON).
 * 201 → { ok: true } · 422 → localised field errors · 429 → rate limited · 403 → cross-site request
 */
export async function POST(request: Request) {
  const rawLocale = new URL(request.url).searchParams.get("locale");
  const locale = isAppLocale(rawLocale) ? rawLocale : "tet";
  const t = await getTranslations({ locale, namespace: "contact.errors" });

  if (!isSameOrigin(request)) return jsonError(403, "FORBIDDEN", t("generic"));

  const { ipAddress } = contextFromHeaders(request.headers);
  const limit = rateLimit("contact-form", ipAddress ?? "unknown", 5, 60 * 60_000);
  if (!limit.ok) return jsonError(429, "RATE_LIMITED", t("rateLimited"), { retryAfterSeconds: limit.retryAfterSeconds });

  const text = await request.text().catch(() => null);
  if (text === null || text.length > MAX_BODY_BYTES) return jsonError(413, "PAYLOAD_TOO_LARGE", t("generic"));
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(text) as Record<string, unknown>;
    if (!body || typeof body !== "object") throw new Error();
  } catch {
    return jsonError(400, "VALIDATION", t("generic"));
  }

  // Bot traps: a hidden field real people never fill, and an implausibly fast submit.
  // Answer as if accepted so bots learn nothing; nothing is stored.
  const startedAt = Number(body.startedAt);
  if (String(body.website ?? "") !== "" || !Number.isFinite(startedAt) || Date.now() - startedAt < MIN_FILL_MS) {
    return jsonOk({ received: true }, 201);
  }

  const parsed = contactSchema((k: ContactErrorKey) => t(k)).safeParse(body);
  if (!parsed.success) return jsonError(422, "VALIDATION", t("form"), { fieldErrors: fieldErrorsFrom(parsed.error) });

  try {
    await createContactMessage(parsed.data, locale);
    return jsonOk({ received: true }, 201);
  } catch (error) {
    console.error("[contact] could not store message", error);
    return jsonError(500, "INTERNAL", t("generic"));
  }
}
