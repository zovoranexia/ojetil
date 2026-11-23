"use client";

import { CalendarDays } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Date + time input that always shows DD/MM/YYYY and a 24-hour HH:MM clock,
 * whatever the browser's locale (the native datetime-local shows mm/dd and
 * AM/PM on US-configured machines). The value keeps the existing wire format
 * "YYYY-MM-DDTHH:mm" (Díli wall-clock), or "" when both parts are empty.
 *
 * While the user is typing an incomplete or impossible value, `onChange`
 * receives the raw text, which the server rejects with a field error.
 *
 * `dateOnly`: no time field; the value is "YYYY-MM-DD" (or "").
 */
const pad = (n: number) => String(n).padStart(2, "0");

function split(value: string): { date: string; time: string } {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/.exec(value);
  return m ? { date: `${m[3]}/${m[2]}/${m[1]}`, time: m[4] ? `${m[4]}:${m[5]}` : "" } : { date: "", time: "" };
}

/** "16/06/2026" + "22:00" → "2026-06-16T22:00", or null if either part is invalid. */
function join(date: string, time: string): string | null {
  const d = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(date);
  const t = /^(\d{2}):(\d{2})$/.exec(time);
  if (!d || !t) return null;
  const [day, month, year, hour, minute] = [Number(d[1]), Number(d[2]), Number(d[3]), Number(t[1]), Number(t[2])];
  if (hour > 23 || minute > 59 || month < 1 || month > 12 || day < 1) return null;
  if (day > new Date(Date.UTC(year, month, 0)).getUTCDate()) return null;
  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}`;
}

/** Inserts the separators while typing digits: "1606" → "16/06", "2200" → "22:00". */
function maskDate(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean).join("/");
}
function maskTime(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;
}

export function DateTime24Input({
  id,
  value,
  onChange,
  disabled,
  invalid,
  describedBy,
  dateLabel,
  timeLabel,
  calendarLabel,
  dateOnly = false,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  /** Accessible names, e.g. "Date (DD/MM/YYYY)" / "Time (24-hour)". */
  dateLabel: string;
  timeLabel: string;
  calendarLabel: string;
  dateOnly?: boolean;
}) {
  const [parts, setParts] = useState(() => split(value));
  const lastEmitted = useRef(value);
  const picker = useRef<HTMLInputElement>(null);

  // Follow external changes (e.g. "Publish immediately" clearing the value).
  useEffect(() => {
    if (value !== lastEmitted.current) {
      lastEmitted.current = value;
      setParts(split(value));
    }
  }, [value]);

  function update(next: { date: string; time: string }) {
    setParts(next);
    const out = dateOnly
      ? !next.date
        ? ""
        : (join(next.date, "00:00")?.slice(0, 10) ?? next.date)
      : !next.date && !next.time
        ? ""
        : (join(next.date, next.time) ?? `${next.date} ${next.time}`.trim());
    lastEmitted.current = out;
    onChange(out);
  }

  const box = cn(
    "flex min-h-tap rounded-control border bg-surface-card px-3 text-base tabular-nums text-ink md:min-h-10 md:text-[0.9375rem]",
    "placeholder:text-ink-secondary/60 hover:border-border-strong focus-visible:border-ojetil-red",
    invalid ? "border-status-rejected" : "border-border-subtle",
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="DD/MM/AAAA"
          aria-label={dateLabel}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          disabled={disabled}
          value={parts.date}
          onChange={(e) => update({ ...parts, date: maskDate(e.target.value) })}
          className={cn(box, "w-[8.5rem] pr-10")}
        />
        <button
          type="button"
          title={calendarLabel}
          aria-label={calendarLabel}
          disabled={disabled}
          onClick={() => {
            const el = picker.current;
            if (!el) return;
            const iso = join(parts.date, "00:00");
            el.value = iso ? iso.slice(0, 10) : "";
            try {
              el.showPicker();
            } catch {
              el.click();
            }
          }}
          className="absolute inset-y-0 right-0 inline-flex w-9 items-center justify-center text-ink-secondary hover:text-ink disabled:opacity-50"
        >
          <CalendarDays aria-hidden="true" className="size-4" />
        </button>
        {/* Native calendar only for picking; its own (locale-dependent) display is never shown. */}
        <input
          ref={picker}
          type="date"
          tabIndex={-1}
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-0 h-0 w-0 opacity-0"
          onChange={(e) => {
            const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(e.target.value);
            if (m) update({ date: `${m[3]}/${m[2]}/${m[1]}`, time: parts.time || "08:00" });
          }}
        />
      </div>
      {dateOnly ? null : (
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="HH:MM"
        aria-label={timeLabel}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        disabled={disabled}
        value={parts.time}
        onChange={(e) => update({ ...parts, time: maskTime(e.target.value) })}
        className={cn(box, "w-[5rem]")}
      />
      )}
    </div>
  );
}
