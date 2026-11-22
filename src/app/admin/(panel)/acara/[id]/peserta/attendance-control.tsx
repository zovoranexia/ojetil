"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { selectClassName } from "@/components/forms/field";
import { updateAttendance } from "@/modules/events/admin-actions";
import { ATTENDEE_STATUS_VALUES } from "@/modules/events/admin-schema";

/** Inline status changer (Registered → Attended / Cancelled) for one attendee. */
export function AttendanceControl({ registrationId, status, name }: { registrationId: string; status: (typeof ATTENDEE_STATUS_VALUES)[number]; name: string }) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <label className="sr-only" htmlFor={`att-${registrationId}`}>
        Attendance for {name}
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
            {s.charAt(0) + s.slice(1).toLowerCase()}
          </option>
        ))}
      </select>
      {pending ? <Loader2 aria-label="Saving" className="size-4 animate-spin text-ink-secondary" /> : null}
      {error ? (
        <span role="alert" className="text-xs text-status-rejected">
          {error}
        </span>
      ) : null}
    </div>
  );
}
