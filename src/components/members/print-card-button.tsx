"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Opens the browser's print dialog ("Save as PDF" on phones and computers). */
export function PrintCardButton({ label }: { label: string }) {
  return (
    <Button type="button" onClick={() => window.print()} className="print:hidden">
      <Printer aria-hidden="true" /> {label}
    </Button>
  );
}
