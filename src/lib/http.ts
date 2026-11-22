import "server-only";
import { NextResponse } from "next/server";
import type { ActionErrorCode, ActionResult } from "@/lib/actions";

/** JSON helpers for public API route handlers: same ActionResult shape as Server Actions, never cached. */
const NO_STORE = { "Cache-Control": "no-store" };

export function jsonOk<T>(data: T, status = 200): NextResponse<ActionResult<T>> {
  return NextResponse.json({ ok: true, data }, { status, headers: NO_STORE });
}

export function jsonError(
  status: number,
  code: ActionErrorCode | "RATE_LIMITED" | "PAYLOAD_TOO_LARGE",
  message: string,
  extra: { fieldErrors?: Record<string, string[]>; retryAfterSeconds?: number } = {},
) {
  const headers: Record<string, string> = { ...NO_STORE };
  if (extra.retryAfterSeconds) headers["Retry-After"] = String(extra.retryAfterSeconds);
  return NextResponse.json(
    { ok: false, error: { code, message, ...(extra.fieldErrors ? { fieldErrors: extra.fieldErrors } : {}) } },
    { status, headers },
  );
}
