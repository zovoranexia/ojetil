"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { selectClassName } from "@/components/forms/field";
import { useMessageText } from "@/components/i18n/message-text";
import { updateAttendance } from "@/modules/events/admin-actions";
import { ATTENDEE_STATUS_VALUES } from "@/modules/events/admin-schema";

/** Inline status changer (Registered → Attended / Cancelled) for one attendee. */
export function AttendanceControl({ registrationId, status, name }: { registrationId: string; status: (typeof ATTENDEE_STATUS_VALUES)[number]; name: string }) {
  const router = useRouter();
  const t = useTranslations("admin.events.attendees");
  const tStatus = useTranslations("admin.status.attendee");
  const tc = useTranslations("admin.common");
  const resolve = useMessageText();
  const [value, setValue] = useState(status);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <label className="sr-only" htmlFor={`att-${registrationId}`}>
        {t("attendanceFor", { name })}
      </label>
      <select
        id={`att-${registrationId}`}
        value={value}
        disabled={pending}
        className={`${selectClassName} w-36`}
        onChange={(e) => {
          const next = e.target.value as typeof value;
          const previous = value;
          setValue(next);
          setError(null);
          startTransition(async () => {
            const r = await updateAttendance({ registrationId, status: next });
            if (!r.ok) {
              setValue(previous);
              setError(r.error.message);
            } else router.refresh();
          });
        }}
      >
        {ATTENDEE_STATUS_VALUES.map((s) => (
          <option key={s} value={s}>
            {tStatus(s)}
          </option>
        ))}
      </select>
      {pending ? <Loader2 aria-label={tc("saving")} className="size-4 animate-spin text-ink-secondary" /> : null}
      {error ? (
        <span role="alert" className="text-xs text-status-rejected">
          {resolve(error)}
        </span>
      ) : null}
    </div>
  );
}
