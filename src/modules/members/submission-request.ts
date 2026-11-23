import "server-only";
import { INTEREST_AREAS } from "@/config/municipalities";
import { fieldErrorsFrom } from "@/lib/actions";
import { jsonError } from "@/lib/http";
import { PhotoValidationError, processProfilePhoto } from "./photo-storage";
import { parseMemberSubmission, type MemberErrorKey, type MemberSchemaOptions, type MemberSubmission } from "./registration-schema";

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

type Translate = (key: MemberErrorKey | "generic" | "form" | "photoSize" | "photoType") => string;

/**
 * Reads, size-checks and validates a member registration (multipart/form-data),
 * shared by the public form and the office form. Returns the validated data and
 * the processed photo, or a ready JSON error response.
 */
export async function readMemberSubmission(
  request: Request,
  t: Translate,
  options: MemberSchemaOptions & { honeypot: boolean },
): Promise<{ ok: true; data: MemberSubmission; photo: Buffer | null } | { ok: false; response: Response }> {
  const fail = (response: Response) => ({ ok: false as const, response });

  // Browsers always send Content-Length for FormData; refusing chunked bodies stops unbounded uploads.
  const declaredHeader = request.headers.get("content-length");
  if (!declaredHeader) return fail(jsonError(411, "VALIDATION", t("generic")));
  const declared = Number(declaredHeader);
  const tooLarge = () => fail(jsonError(413, "PAYLOAD_TOO_LARGE", t("photoSize"), { fieldErrors: { photo: [t("photoSize")] } }));
  if (!Number.isFinite(declared) || declared > MAX_BODY_BYTES) return tooLarge();

  let form: FormData;
  try {
    // Read with a hard byte ceiling (never trust the declared length alone), then parse.
    const body = await readBodyWithLimit(request, MAX_BODY_BYTES);
    if (!body) return tooLarge();
    form = await new Response(body, { headers: { "content-type": request.headers.get("content-type") ?? "" } }).formData();
  } catch {
    return fail(jsonError(400, "VALIDATION", t("generic")));
  }

  // Honeypot (public form only): real people never see or fill this field.
  if (options.honeypot && String(form.get("website") ?? "") !== "") return fail(jsonError(400, "VALIDATION", t("generic")));

  const input: Record<string, unknown> = {};
  for (const name of TEXT_FIELDS) input[name] = String(form.get(name) ?? "");
  input.interests = form.getAll("interests").map(String).filter((v) => (INTEREST_AREAS as readonly string[]).includes(v));
  input.consent = form.get("consent") === "true";

  const parsed = parseMemberSubmission(input, (k) => t(k), new Date(), { phoneOptional: options.phoneOptional });
  if (!parsed.success) return fail(jsonError(422, "VALIDATION", t("form"), { fieldErrors: fieldErrorsFrom(parsed.error) }));

  let photo: Buffer | null = null;
  const upload = form.get("photo");
  if (upload instanceof File && upload.size > 0) {
    try {
      photo = await processProfilePhoto(upload);
    } catch (error) {
      if (error instanceof PhotoValidationError) {
        return fail(jsonError(422, "VALIDATION", t(error.reason), { fieldErrors: { photo: [t(error.reason)] } }));
      }
      throw error;
    }
  }
  return { ok: true, data: parsed.data, photo };
}
