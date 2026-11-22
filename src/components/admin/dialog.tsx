"use client";

import * as D from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Accessible modal (focus trapped, Escape closes) for backoffice panels such as the media picker. */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  closeLabel,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  closeLabel: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "md" | "lg" | "xl";
}) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-ink/50" />
        <D.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-card border border-border-subtle bg-surface-card shadow-xl",
            size === "md" && "max-w-lg",
            size === "lg" && "max-w-3xl",
            size === "xl" && "max-w-5xl",
          )}
          aria-describedby={description ? undefined : undefined}
        >
          <div className="flex items-start justify-between gap-4 border-b border-border-subtle px-5 py-4">
            <div className="min-w-0">
              <D.Title className="font-serif text-xl font-semibold">{title}</D.Title>
              {description ? <D.Description className="mt-1 text-sm text-ink-secondary">{description}</D.Description> : <D.Description className="sr-only">{title}</D.Description>}
            </div>
            <D.Close className="inline-flex size-9 shrink-0 items-center justify-center rounded-control text-ink-secondary hover:bg-surface-muted hover:text-ink" aria-label={closeLabel}>
              <X aria-hidden="true" className="size-5" />
            </D.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer ? <div className="flex flex-wrap justify-end gap-2 border-t border-border-subtle px-5 py-3">{footer}</div> : null}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
