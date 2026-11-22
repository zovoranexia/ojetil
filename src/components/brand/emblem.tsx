import Image from "next/image";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/config/site";

/**
 * Official OJETIL emblem. The emblem is identity, not decoration, so it stays
 * visible in Low-Bandwidth Mode (it is small and served as optimised AVIF/WebP).
 */
export function Emblem({ size = 48, className, priority = false }: { size?: number; className?: string; priority?: boolean }) {
  return (
    <Image
      src="/brand/ojetil-emblem.jpg"
      alt={siteConfig.emblemAlt}
      width={size}
      height={size}
      priority={priority}
      sizes={`${size}px`}
      className={cn("rounded-full bg-white object-contain", className)}
    />
  );
}
