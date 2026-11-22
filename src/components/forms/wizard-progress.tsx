import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/** Accessible step indicator: an ordered list with aria-current="step". */
export function WizardProgress({
  steps,
  current,
  progressLabel,
}: {
  steps: readonly string[];
  current: number;
  progressLabel: string;
}) {
  return (
    <nav aria-label={progressLabel}>
      <p className="mb-3 text-sm font-semibold tabular-nums text-gold-text">{progressLabel}</p>
      <ol className="grid grid-cols-3 gap-2">
        {steps.map((label, i) => {
          const n = i + 1;
          const done = n < current;
          const active = n === current;
          return (
            <li key={label} aria-current={active ? "step" : undefined} className="min-w-0">
              <div className={cn("h-1.5 rounded-full", done || active ? "bg-ojetil-red" : "bg-border-subtle")} />
              <div className="mt-2 flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums",
                    done ? "bg-ojetil-red text-white" : active ? "bg-ink text-paper" : "bg-surface-muted text-ink-secondary",
                  )}
                >
                  {done ? <Check className="size-3.5" /> : n}
                </span>
                <span className={cn("hidden truncate text-sm sm:block", active ? "font-semibold text-ink" : "text-ink-secondary")}>
                  {label}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
