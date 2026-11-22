import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * OJETIL button. Every size keeps a ≥44px tap target on mobile; `md:` sizes
 * tighten slightly for pointer devices. Radius is the 4px control radius.
 */
export const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-control font-sans font-semibold",
    "transition-colors duration-150 select-none",
    "disabled:pointer-events-none disabled:opacity-50",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ojetil-red",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        primary: "bg-ojetil-red text-white hover:bg-ojetil-red-hover active:bg-ojetil-red-hover",
        editorial: "bg-ink text-paper hover:bg-ink/85 active:bg-ink/85",
        outline:
          "border border-border-subtle bg-surface-card text-ink hover:border-border-strong hover:bg-paper",
        ghost: "text-ink hover:bg-surface-muted",
        link: "text-ojetil-red underline-offset-4 hover:underline hover:text-ojetil-red-hover",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
      },
      size: {
        default: "min-h-tap px-5 text-[0.9375rem] md:min-h-10",
        sm: "min-h-tap px-3.5 text-sm md:min-h-9",
        lg: "min-h-12 px-7 text-base",
        icon: "size-tap md:size-10",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Render the child element (e.g. a Next.js <Link>) with button styling. */
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild = false, type, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
      {...(asChild ? {} : { type: type ?? "button" })}
      {...props}
    />
  );
}
