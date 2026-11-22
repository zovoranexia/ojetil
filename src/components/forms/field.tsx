import { Lock } from "lucide-react";
import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Label + control + hint + inline error, wired for assistive tech:
 * pass `describedBy(id)` output to the control's aria-describedby.
 */
export function Field({
  id,
  label,
  required,
  optionalLabel,
  hint,
  error,
  encryptedLabel,
  className,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  optionalLabel?: string;
  hint?: string;
  error?: string;
  /** Shows a small "Encrypted" marker for PII fields. */
  encryptedLabel?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label htmlFor={id} required={required}>
          {label}
          {optionalLabel ? <span className="ml-1 font-normal">({optionalLabel})</span> : null}
        </Label>
        {encryptedLabel ? (
          <span className="inline-flex items-center gap-1 rounded-control bg-status-verified-bg px-1.5 py-0.5 text-[0.6875rem] font-semibold text-status-verified">
            <Lock aria-hidden="true" className="size-3" />
            {encryptedLabel}
          </span>
        ) : null}
      </div>
      {children}
      {hint ? (
        <p id={`${id}-hint`} className="text-xs text-ink-secondary">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-status-rejected">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** aria attributes for a control inside <Field>. */
export function fieldAria(id: string, opts: { hint?: boolean; error?: string }) {
  const describedBy = [opts.hint ? `${id}-hint` : null, opts.error ? `${id}-error` : null].filter(Boolean).join(" ");
  return {
    id,
    "aria-invalid": opts.error ? (true as const) : undefined,
    "aria-describedby": describedBy || undefined,
  };
}

export const selectClassName = cn(
  "flex min-h-tap w-full rounded-control border border-border-subtle bg-surface-card px-3 text-base text-ink md:min-h-10 md:text-[0.9375rem]",
  "hover:border-border-strong focus-visible:border-ojetil-red aria-invalid:border-status-rejected",
);

export const textareaClassName = cn(
  "flex min-h-28 w-full rounded-control border border-border-subtle bg-surface-card px-3 py-2 text-base text-ink md:text-[0.9375rem]",
  "placeholder:text-ink-secondary/70 hover:border-border-strong focus-visible:border-ojetil-red aria-invalid:border-status-rejected",
);
