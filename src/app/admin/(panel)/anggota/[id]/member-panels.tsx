"use client";

import { Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { FormFeedback, type Feedback } from "@/components/admin/form-feedback";
import { textareaClassName } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { decideMemberRegistration, revealMemberPii } from "@/modules/members/admin-actions";
import type { Decision } from "@/modules/members/admin-schema";

/** Encrypted fields stay hidden until explicitly revealed; every reveal is audited. */
export function RevealPii({ id, hasPhoto }: { id: string; hasPhoto: boolean }) {
  const [pii, setPii] = useState<{ address: string; phone: string; nationalId: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!pii) {
    return (
      <div className="space-y-3">
        <p className="flex items-start gap-2 text-sm text-ink-secondary">
          <Lock aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          Address, phone, national ID{hasPhoto ? " and photo" : ""} are encrypted. Revealing them is recorded in the audit log with your name.
        </p>
        {error ? <p className="text-sm text-status-rejected">{error}</p> : null}
        <Button
          variant="editorial"
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const r = await revealMemberPii({ id });
              if (r.ok) setPii(r.data);
              else setError(r.error.message);
            })
          }
        >
          {pending ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Eye aria-hidden="true" />}
          Reveal personal data
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-5">
        {hasPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element -- authorised, uncached admin route
          <img src={`/api/admin/members/${id}/photo`} alt="Applicant photo" className="size-28 rounded-card border border-border-subtle object-cover" />
        ) : null}
        <dl className="grid flex-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-ink-secondary">Phone / WhatsApp</dt>
            <dd className="font-medium tabular-nums">{pii.phone}</dd>
          </div>
          <div>
            <dt className="text-ink-secondary">Bilhete de Identidade</dt>
            <dd className="tracking-code font-medium">{pii.nationalId}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-ink-secondary">Residential address</dt>
            <dd className="font-medium">{pii.address}</dd>
          </div>
        </dl>
      </div>
      <Button variant="outline" size="sm" onClick={() => setPii(null)}>
        <EyeOff aria-hidden="true" /> Hide
      </Button>
    </div>
  );
}

const DECISION_COPY: Record<Decision, { label: string; confirm: string; tone: "primary" | "destructive"; variant: "primary" | "outline" | "destructive" }> = {
  VERIFIED: { label: "Approve", confirm: "Approve and verify this application?", tone: "primary", variant: "primary" },
  NEEDS_REVISION: { label: "Request revision", confirm: "Ask the applicant for more information?", tone: "primary", variant: "outline" },
  REJECTED: { label: "Reject", confirm: "Reject this application?", tone: "destructive", variant: "destructive" },
};

export function DecisionPanel({ id, status }: { id: string; status: "PENDING_VERIFICATION" | "NEEDS_REVISION" | "VERIFIED" | "REJECTED" }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [pending, startTransition] = useTransition();
  const feedbackRef = useRef<HTMLDivElement>(null);

  function decide(decision: Decision) {
    setFeedback(null);
    setNoteError(null);
    startTransition(async () => {
      const r = await decideMemberRegistration({ id, decision, expectedStatus: status, note });
      if (r.ok) {
        setFeedback({ kind: "success", message: `Status updated for ${r.data.trackingCode}.` });
        setNote("");
        router.refresh();
      } else {
        setNoteError(r.error.fieldErrors?.note?.[0] ?? null);
        setFeedback({ kind: "error", message: r.error.message });
      }
      requestAnimationFrame(() => feedbackRef.current?.focus());
    });
  }

  const tooShort = note.trim().length < 5;

  return (
    <div className="space-y-4">
      <FormFeedback ref={feedbackRef} feedback={feedback} />
      <div className="space-y-1.5">
        <Label htmlFor="decision-note" required>
          Reason / note
        </Label>
        <textarea
          id="decision-note"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={1000}
          aria-invalid={noteError ? true : undefined}
          aria-describedby="decision-note-hint"
          className={textareaClassName}
        />
        <p id="decision-note-hint" className="text-xs text-ink-secondary">
          Required for every decision. For “Request revision” and “Reject” this note is shown to the applicant on the public status page — write it for them.
        </p>
        {noteError ? <p className="text-sm text-status-rejected">{noteError}</p> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(DECISION_COPY) as Decision[])
          .filter((d) => d !== status)
          .map((d) => (
            <ConfirmDialog
              key={d}
              title={DECISION_COPY[d].confirm}
              description={`Note: “${note.trim() || "—"}”. This is recorded in the verification history and audit log.`}
              confirmLabel={DECISION_COPY[d].label}
              tone={DECISION_COPY[d].tone}
              onConfirm={() => decide(d)}
              trigger={
                <Button variant={DECISION_COPY[d].variant} size="sm" disabled={pending || tooShort}>
                  {pending ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
                  {DECISION_COPY[d].label}
                </Button>
              }
            />
          ))}
      </div>
      {tooShort ? <p className="text-xs text-ink-secondary">Write a note (5+ characters) to enable the decision buttons.</p> : null}
    </div>
  );
}
