"use client";

import { Archive, ArchiveRestore, MailOpen, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRef, useState, useTransition } from "react";
import type { ContactMessageStatus } from "@prisma/client";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { FormFeedback, type Feedback } from "@/components/admin/form-feedback";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/actions";
import { removeContactMessage, updateContactMessageStatus } from "@/modules/contact/admin-actions";

export function MessageActions({ id, status }: { id: string; status: ContactMessageStatus }) {
  const t = useTranslations("admin.inbox");
  const tc = useTranslations("admin.common");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<Feedback>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);

  function run(action: () => Promise<ActionResult<{ id: string }>>, after: () => void) {
    startTransition(async () => {
      const r = await action();
      if (!r.ok) {
        setFeedback({ kind: "error", message: r.error.message });
        requestAnimationFrame(() => feedbackRef.current?.focus());
        return;
      }
      after();
    });
  }
  const setStatus = (next: ContactMessageStatus) => run(() => updateContactMessageStatus({ id, status: next }), () => router.refresh());

  return (
    <section className="space-y-2 rounded-card border border-border-subtle bg-surface-card p-5">
      <FormFeedback ref={feedbackRef} feedback={feedback} />
      {status === "ARCHIVED" ? (
        <Button type="button" variant="outline" className="w-full" disabled={pending} onClick={() => setStatus("READ")}>
          <ArchiveRestore aria-hidden="true" /> {t("unarchive")}
        </Button>
      ) : (
        <Button type="button" variant="outline" className="w-full" disabled={pending} onClick={() => setStatus("ARCHIVED")}>
          <Archive aria-hidden="true" /> {t("archive")}
        </Button>
      )}
      {status !== "NEW" ? (
        <Button type="button" variant="ghost" className="w-full" disabled={pending} onClick={() => run(() => updateContactMessageStatus({ id, status: "NEW" }), () => router.push("/admin/pesan"))}>
          <MailOpen aria-hidden="true" /> {t("markUnread")}
        </Button>
      ) : null}
      <ConfirmDialog
        title={t("deleteTitle")}
        description={t("deleteDescription")}
        confirmLabel={tc("delete")}
        tone="destructive"
        onConfirm={() => run(() => removeContactMessage({ id }), () => router.push("/admin/pesan"))}
        trigger={
          <Button type="button" variant="ghost" size="sm" disabled={pending} className="w-full text-status-rejected hover:bg-status-rejected-bg">
            <Trash2 aria-hidden="true" /> {tc("delete")}
          </Button>
        }
      />
    </section>
  );
}
