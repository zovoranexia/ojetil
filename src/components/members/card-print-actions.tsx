"use client";

import { CreditCard, FileText, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * CR80 / ID-1 output: each side on its own 54 × 85.6 mm page with no margin —
 * "Save as PDF" gives a 2-page card-size PDF that card printers (Evolis, Zebra…)
 * and print shops accept as is. A4: both sides on one sheet, to cut out.
 */
const CR80_STYLE = `
@media print {
  @page { size: 54mm 85.6mm; margin: 0; }
  html, body { margin: 0 !important; padding: 0 !important; }
  .member-card { position: static !important; display: block !important; }
  .member-card article {
    width: 54mm !important; height: 85.6mm !important; margin: 0 !important;
    border: 0 !important; border-radius: 0 !important; box-shadow: none !important;
    break-after: page; page-break-after: always;
  }
  .member-card article:last-child { break-after: auto; page-break-after: auto; }
}`;

export function CardPrintActions({
  labels,
  onPrint,
}: {
  labels: { cr80: string; a4: string; hint: string; failed: string };
  /** Called before the print dialog opens (e.g. to write the audit entry); return false to cancel. */
  onPrint?: (format: "CR80" | "A4") => Promise<boolean>;
}) {
  const [busy, setBusy] = useState<"CR80" | "A4" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function print(format: "CR80" | "A4") {
    setBusy(format);
    setError(null);
    const allowed = onPrint ? await onPrint(format).catch(() => false) : true;
    setBusy(null);
    if (!allowed) return setError(labels.failed);
    let style: HTMLStyleElement | null = null;
    if (format === "CR80") {
      style = document.createElement("style");
      style.textContent = CR80_STYLE;
      document.head.appendChild(style);
    }
    const cleanup = () => {
      style?.remove();
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    window.print();
  }

  return (
    <div className="space-y-2 print:hidden">
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => void print("CR80")} disabled={busy !== null}>
          {busy === "CR80" ? <Loader2 aria-hidden="true" className="animate-spin" /> : <CreditCard aria-hidden="true" />} {labels.cr80}
        </Button>
        <Button type="button" variant="outline" onClick={() => void print("A4")} disabled={busy !== null}>
          {busy === "A4" ? <Loader2 aria-hidden="true" className="animate-spin" /> : <FileText aria-hidden="true" />} {labels.a4}
        </Button>
      </div>
      <p className="text-xs text-ink-secondary">{labels.hint}</p>
      {error ? (
        <p role="alert" className="text-sm text-status-rejected">
          {error}
        </p>
      ) : null}
    </div>
  );
}
