import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-control px-2 py-0.5 text-xs font-semibold leading-5 whitespace-nowrap",
  {
    variants: {
      tone: {
        verified: "bg-status-verified-bg text-status-verified",
        pending: "bg-status-pending-bg text-status-pending",
        rejected: "bg-status-rejected-bg text-status-rejected",
        info: "bg-status-info-bg text-status-info",
        neutral: "bg-surface-muted text-ink-secondary",
        /** Ochre text on paper — the accessible gold for light surfaces. */
        heritage: "border border-gold-text/30 bg-paper text-gold-text",
        /** Gold on ink — for dark surfaces only. */
        heritageDark: "ink-chrome bg-ink text-gold-accent",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
