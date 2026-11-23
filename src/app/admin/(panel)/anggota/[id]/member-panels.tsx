"use client";

import { Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRef, useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { FormFeedback, type Feedback } from "@/components/admin/form-feedback";
import { useMessageText } from "@/components/i18n/message-text";
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
  const t = useTranslations("admin.members.pii");
  const resolve = useMessageText();

  if (!pii) {
    return (
      <div className="space-y-3">
        <p className="flex items-start gap-2 text-sm text-ink-secondary">
          <Lock aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {hasPhoto ? t("introWithPhoto") : t("intro")}
        </p>
        {error ? <p className="text-sm text-status-rejected">{resolve(error)}</p> : null}
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
          {t("reveal")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-5">
        {hasPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element -- authorised, uncached admin route
          <img src={`/api/admin/members/${id}/photo`} alt={t("photoAlt")} className="size-28 rounded-card border border-border-subtle object-cover" />
        ) : null}
        <dl className="grid flex-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-ink-secondary">{t("phone")}</dt>
            <dd className="font-medium tabular-nums">{pii.phone || "—"}</dd>
          </div>
          <div>
            <dt className="text-ink-secondary">{t("nationalId")}</dt>
            <dd className="tracking-code font-medium">{pii.nationalId}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-ink-secondary">{t("address")}</dt>
            <dd className="font-medium">{pii.address}</dd>
          </div>
        </dl>
      </div>
      <Button variant="outline" size="sm" onClick={() => setPii(null)}>
        <EyeOff aria-hidden="true" /> {t("hide")}
      </Button>
    </div>
  );
}

/** `label` / `confirm` are message keys under `admin.members.decision`. */
const DECISION_COPY = {
  VERIFIED: { label: "approve", confirm: "approveConfirm", tone: "primary", variant: "primary" },
  NEEDS_REVISION: { label: "revise", confirm: "reviseConfirm", tone: "primary", variant: "outline" },
  REJECTED: { label: "reject", confirm: "rejectConfirm", tone: "destructive", variant: "destructive" },
} as const satisfies Record<Decision, { label: string; confirm: string; tone: "primary" | "destructive"; variant: "primary" | "outline" | "destructive" }>;

export function DecisionPanel({ id, status }: { id: string; status: "PENDING_VERIFICATION" | "NEEDS_REVISION" | "VERIFIED" | "REJECTED" }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [pending, startTransition] = useTransition();
  const feedbackRef = useRef<HTMLDivElement>(null);
  const t = useTranslations("admin.members.decision");
  const resolve = useMessageText();

  function decide(decision: Decision) {
    setFeedback(null);
    setNoteError(null);
    startTransition(async () => {
      const r = await decideMemberRegistration({ id, decision, expectedStatus: status, note });
      if (r.ok) {
        setFeedback({ kind: "success", message: t("success", { code: r.data.trackingCode }) });
        setNote("");
        router.refresh();
      } else {
        const noteIssue = r.error.fieldErrors?.note?.[0];
        setNoteError(noteIssue ? resolve(noteIssue) : null);
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
          {t("noteLabel")}
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
          {t("noteHint")}
        </p>
        {noteError ? <p className="text-sm text-status-rejected">{noteError}</p> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(DECISION_COPY) as Decision[])
          .filter((d) => d !== status)
          .map((d) => (
            <ConfirmDialog
              key={d}
              title={t(DECISION_COPY[d].confirm)}
              description={t("confirmDescription", { note: note.trim() || "—" })}
              confirmLabel={t(DECISION_COPY[d].label)}
              tone={DECISION_COPY[d].tone}
              onConfirm={() => decide(d)}
              trigger={
                <Button variant={DECISION_COPY[d].variant} size="sm" disabled={pending || tooShort}>
                  {pending ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
                  {t(DECISION_COPY[d].label)}
                </Button>
              }
            />
          ))}
      </div>
      {tooShort ? <p className="text-xs text-ink-secondary">{t("tooShort")}</p> : null}
    </div>
  );
}
