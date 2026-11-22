import { NextResponse } from "next/server";
import { msg } from "@/lib/i18n-message";
import { withApiAuth } from "@/lib/security/guards";
import { isSameOrigin } from "@/lib/security/origin";
import { createMediaFromUpload } from "@/modules/media/service";
import { MediaFileError } from "@/modules/media/storage";

export const runtime = "nodejs";

/**
 * POST /api/admin/media (multipart: "file", optional "credit") — adds one file
 * to the Media library. Returns the new MediaAssetDTO. Error `message`s are
 * msg()-encoded keys; the UI decodes them.
 */
export const POST = withApiAuth("content:write", async (request, user) => {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "FORBIDDEN", message: msg("admin.errors.forbidden") }, { status: 403 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "VALIDATION", message: msg("admin.media.errors.unreadable") }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "VALIDATION", message: msg("admin.media.errors.noFile") }, { status: 400 });

  try {
    const asset = await createMediaFromUpload(file, user, { credit: String(form.get("credit") ?? "") });
    return NextResponse.json(asset, { status: 201 });
  } catch (error) {
    if (error instanceof MediaFileError) return NextResponse.json({ error: "VALIDATION", message: error.message }, { status: 400 });
    throw error;
  }
});
