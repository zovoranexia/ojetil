import "server-only";
import { ActionError, fieldErrorsFrom, type ActionResult } from "@/lib/actions";
import type { SessionUser } from "@/lib/security/guards";
import { isSameOrigin } from "@/lib/security/origin";
import { documentFormSchema } from "@/modules/documents/schema";
import { saveDocument } from "@/modules/documents/service";
import { DocumentFileError } from "@/modules/documents/storage";

const STATUS: Record<string, number> = { VALIDATION: 400, NOT_FOUND: 404, CONFLICT: 409, FORBIDDEN: 403, UNAUTHORIZED: 401 };

/**
 * Shared multipart handler for creating/updating a document. Responds with the
 * same ActionResult shape as Server Actions so the editor treats both alike.
 */
export async function handleDocumentSave(request: Request, user: SessionUser, id: string | undefined): Promise<{ status: number; body: ActionResult<{ id: string }> }> {
  if (!isSameOrigin(request)) return { status: 403, body: { ok: false, error: { code: "FORBIDDEN", message: "Cross-origin request rejected." } } };

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return { status: 400, body: { ok: false, error: { code: "VALIDATION", message: "Upload could not be read. Is the file too large?" } } };
  }

  let data: unknown;
  try {
    data = JSON.parse(String(form.get("data") ?? ""));
  } catch {
    return { status: 400, body: { ok: false, error: { code: "VALIDATION", message: "Malformed request." } } };
  }
  const parsed = documentFormSchema.safeParse(data);
  if (!parsed.success) {
    return { status: 400, body: { ok: false, error: { code: "VALIDATION", message: "Please correct the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error) } } };
  }
  const rawFile = form.get("file");
  const file = rawFile instanceof File && rawFile.size > 0 ? rawFile : null;

  try {
    const saved = await saveDocument({ id, input: parsed.data, file, user });
    return { status: id ? 200 : 201, body: { ok: true, data: saved } };
  } catch (error) {
    if (error instanceof DocumentFileError) {
      return { status: 400, body: { ok: false, error: { code: "VALIDATION", message: error.message, fieldErrors: { file: [error.message] } } } };
    }
    if (error instanceof ActionError) {
      return { status: STATUS[error.code] ?? 400, body: { ok: false, error: { code: error.code, message: error.message, fieldErrors: error.fieldErrors } } };
    }
    throw error;
  }
}
