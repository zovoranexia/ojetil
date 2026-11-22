import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Editorial page header: ochre eyebrow, serif title, lead paragraph. */
export function PageHeader({
  eyebrow,
  title,
  lead,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("border-b border-border-subtle bg-paper", className)}>
      <div className="mx-auto max-w-6xl px-4 pb-10 pt-10 md:px-8 md:pb-14 md:pt-16">
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <h1 className="mt-3 max-w-3xl text-4xl md:text-5xl">{title}</h1>
        {lead ? <p className="mt-4 max-w-2xl text-lg text-ink-secondary">{lead}</p> : null}
        {children}
      </div>
    </div>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-gold-text", className)}>
      <span aria-hidden="true" className="h-px w-6 bg-ojetil-red" />
      {children}
    </p>
  );
}

export function SectionHeading({
  id,
  title,
  lead,
  action,
}: {
  id: string;
  title: string;
  lead?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h2 id={id} className="text-3xl">
          {title}
        </h2>
        {lead ? <p className="mt-2 max-w-2xl text-ink-secondary">{lead}</p> : null}
      </div>
      {action}
    </div>
  );
}
