"use client";

import { Check, Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Large monospace code with one-click copy. The result is announced to screen
 * readers; if the Clipboard API is unavailable (older Android WebViews, http),
 * the code text is selected so it can be copied manually.
 */
export function CopyCode({ code, label, className }: { code: string; label: string; className?: string }) {
  const t = useTranslations("common");
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  const codeId = `code-${code}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setStatus("copied");
      window.setTimeout(() => setStatus("idle"), 2500);
    } catch {
      const node = document.getElementById(codeId);
      if (node) window.getSelection()?.selectAllChildren(node);
      setStatus("failed");
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-sm font-medium text-ink-secondary">{label}</p>
      <div className="flex flex-col gap-2 rounded-card border-2 border-dashed border-ojetil-red/40 bg-surface-card p-3 sm:flex-row sm:items-center">
        <output id={codeId} className="tracking-code flex-1 select-all px-2 text-2xl font-semibold text-ink md:text-3xl">
          {code}
        </output>
        <button
          type="button"
          onClick={copy}
          className="inline-flex min-h-tap items-center justify-center gap-2 rounded-control bg-ink px-4 text-sm font-semibold text-paper hover:bg-ink/85"
        >
          {status === "copied" ? <Check aria-hidden="true" className="size-4" /> : <Copy aria-hidden="true" className="size-4" />}
          {status === "copied" ? t("copied") : t("copy")}
        </button>
      </div>
      <p aria-live="polite" className="min-h-5 text-sm text-ink-secondary">
        {status === "copied" ? t("copied") : status === "failed" ? t("copyFailed") : ""}
      </p>
    </div>
  );
}
