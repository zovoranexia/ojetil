"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";
import { forwardRef } from "react";

export type Feedback = { kind: "success" | "error"; message: string } | null;

/** Form-level message, focusable so it can be announced after submit. */
export const FormFeedback = forwardRef<HTMLDivElement, { feedback: Feedback }>(function FormFeedback({ feedback }, ref) {
  if (!feedback) return null;
  const ok = feedback.kind === "success";
  return (
    <div
      ref={ref}
      tabIndex={-1}
      role={ok ? "status" : "alert"}
      className={
        ok
          ? "flex gap-3 rounded-control border border-status-verified/25 bg-status-verified-bg p-3 text-sm text-status-verified outline-none"
          : "flex gap-3 rounded-control border border-status-rejected/25 bg-status-rejected-bg p-3 text-sm text-status-rejected outline-none"
      }
    >
      {ok ? <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0" /> : <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />}
      <p>{feedback.message}</p>
    </div>
  );
});

/** Apply server field errors ("translations.TET.title") onto React Hook Form. */
export function applyFieldErrors(
  fieldErrors: Record<string, string[]> | undefined,
  setError: (name: never, error: { message: string }) => void,
): void {
  for (const [field, messages] of Object.entries(fieldErrors ?? {})) {
    if (messages[0]) setError(field as never, { message: messages[0] });
  }
}
