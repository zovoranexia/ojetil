import { after } from "next/server";
import { getTranslations } from "next-intl/server";
import { isAppLocale } from "@/config/locales";
import { INTEREST_AREAS } from "@/config/municipalities";
import { fieldErrorsFrom } from "@/lib/actions";
import { jsonError, jsonOk } from "@/lib/http";
import { contextFromHeaders } from "@/lib/request-context";
import { isSameOrigin } from "@/lib/security/origin";
import { rateLimit } from "@/lib/security/rate-limit";
import { PhotoValidationError, processProfilePhoto } from "@/modules/members/photo-storage";
import { parseMemberSubmission } from "@/modules/members/registration-schema";
import { submitMemberRegistration } from "@/modules/members/registration-service";
import { sendAdminNewMember, sendMemberRegistrationReceived } from "@/modules/notifications/emails";

export const runtime = "nodejs";

/** Multipart body ceiling: 1 MB photo + form fields + multipart overhead. */
const MAX_BODY_BYTES = 1_400_000;
const TEXT_FIELDS = [
  "category",
  "fullName",
  "clandestineAlias",
  "dateOfBirth",
  "gender",
  "municipality",
  "administrativePost",
  "address",
  "phone",
  "email",
  "nationalId",
  "yearJoined",
  "clandestineCell",
  "clandestineRegion",
  "witnessReference",
  "institution",
  "motivation",
] as const;

/** Buffers the request body, aborting as soon as it exceeds `limit` bytes. Null when too large. */
async function readBodyWithLimit(request: Request, limit: number): Promise<Uint8Array<ArrayBuffer> | null> {
  if (!request.body) return new Uint8Array(new ArrayBuffer(0));
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const out = new Uint8Array(new ArrayBuffer(total));
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}

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

  // Browsers always send Content-Length for FormData; refusing chunked bodies stops unbounded uploads.
  const declaredHeader = request.headers.get("content-length");
  if (!declaredHeader) return jsonError(411, "VALIDATION", t("generic"));
  const declared = Number(declaredHeader);
  const tooLarge = () => jsonError(413, "PAYLOAD_TOO_LARGE", t("photoSize"), { fieldErrors: { photo: [t("photoSize")] } });
  if (!Number.isFinite(declared) || declared > MAX_BODY_BYTES) return tooLarge();

  let form: FormData;
  try {
    // Read with a hard byte ceiling (never trust the declared length alone), then parse.
    const body = await readBodyWithLimit(request, MAX_BODY_BYTES);
    if (!body) return tooLarge();
    form = await new Response(body, { headers: { "content-type": request.headers.get("content-type") ?? "" } }).formData();
  } catch {
    return jsonError(400, "VALIDATION", t("generic"));
  }

  // Honeypot: real people never see or fill this field.
  if (String(form.get("website") ?? "") !== "") return jsonError(400, "VALIDATION", t("generic"));

  const input: Record<string, unknown> = {};
  for (const name of TEXT_FIELDS) input[name] = String(form.get(name) ?? "");
  input.interests = form.getAll("interests").map(String).filter((v) => (INTEREST_AREAS as readonly string[]).includes(v));
  input.consent = form.get("consent") === "true";

  const parsed = parseMemberSubmission(input, (k) => t(k));
  if (!parsed.success) {
    return jsonError(422, "VALIDATION", t("form"), { fieldErrors: fieldErrorsFrom(parsed.error) });
  }

  let photo: Buffer | null = null;
  const upload = form.get("photo");
  if (upload instanceof File && upload.size > 0) {
    try {
      photo = await processProfilePhoto(upload);
    } catch (error) {
      if (error instanceof PhotoValidationError) {
        return jsonError(422, "VALIDATION", t(error.reason), { fieldErrors: { photo: [t(error.reason)] } });
      }
      throw error;
    }
  }

  try {
    const result = await submitMemberRegistration(parsed.data, photo, locale);
    // Emails go out after the response: a slow or failing mail server never delays or breaks the registration.
    after(() =>
      Promise.all([
        sendMemberRegistrationReceived({ email: parsed.data.email || null, fullName: parsed.data.fullName, trackingCode: result.trackingCode, category: parsed.data.category, locale }),
        sendAdminNewMember({ trackingCode: result.trackingCode, category: parsed.data.category, municipality: parsed.data.municipality }),
      ]),
    );
    return jsonOk(result, 201);
  } catch (error) {
    console.error("[members] registration failed", error);
    return jsonError(500, "INTERNAL", t("generic"));
  }
}
