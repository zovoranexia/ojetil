import { NextResponse } from "next/server";
import { withApiAuth } from "@/lib/security/guards";
import { handleDocumentSave } from "./save";

export const runtime = "nodejs";

/** POST /api/admin/documents — multipart: "data" (JSON form values) + "file" (PDF, required). */
export const POST = withApiAuth("content:write", async (request, user) => {
  const result = await handleDocumentSave(request, user, undefined);
  return NextResponse.json(result.body, { status: result.status });
});
