import { cn } from "@/lib/utils";

/**
 * 4px rhythmic Tais geometric strip (red · ink · gold). Purely decorative, so it
 * is hidden from assistive technology. Rendered from a CSS data-URI tile so it
 * costs zero extra requests, which matters in Low-Bandwidth Mode.
 */
export function TaisRibbon({ className }: { className?: string }) {
  return <div aria-hidden="true" role="presentation" className={cn("tais-ribbon", className)} />;
}
