import * as React from "react";
import { cn } from "@/lib/utils";

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export function Label({ className, required, children, ...props }: LabelProps) {
  return (
    <label className={cn("text-sm font-medium text-ink-secondary", className)} {...props}>
      {children}
      {required ? (
        <span aria-hidden="true" className="ml-0.5 text-ojetil-red">
          *
        </span>
      ) : null}
    </label>
  );
}
