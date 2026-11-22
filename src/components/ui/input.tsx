import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, type = "text", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={cn(
        "flex min-h-tap w-full rounded-control border border-border-subtle bg-surface-card px-3 py-2 text-base text-ink md:min-h-10 md:text-[0.9375rem]",
        "placeholder:text-ink-secondary/70 hover:border-border-strong",
        "focus-visible:border-ojetil-red focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ojetil-red/25",
        "disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-70",
        "aria-invalid:border-status-rejected aria-invalid:focus-visible:outline-status-rejected/25",
        "file:mr-3 file:rounded-control file:border-0 file:bg-surface-muted file:px-3 file:py-1 file:text-sm file:font-semibold file:text-ink",
        className,
      )}
      {...props}
    />
  );
}
