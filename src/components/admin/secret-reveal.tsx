"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

/** One-time display of a generated secret (e.g. a temporary password) with copy. */
export function SecretReveal({ label, value, note }: { label: string; value: string; note: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div role="status" className="space-y-2 rounded-card border-2 border-dashed border-ojetil-red/40 bg-paper p-4">
      <p className="text-sm font-semibold">{label}</p>
      <div className="flex flex-wrap items-center gap-2">
        <output className="tracking-code select-all rounded-control bg-surface-card px-3 py-2 text-lg font-semibold">{value}</output>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              setCopied(true);
            } catch {
              setCopied(false);
            }
          }}
          className="inline-flex min-h-tap items-center gap-1.5 rounded-control bg-ink px-3 text-sm font-semibold text-paper md:min-h-9"
        >
          {copied ? <Check aria-hidden="true" className="size-4" /> : <Copy aria-hidden="true" className="size-4" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="text-xs text-ink-secondary">{note}</p>
    </div>
  );
}
