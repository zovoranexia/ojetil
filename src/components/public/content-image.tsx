import Image from "next/image";
import { ImageOff } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { isLowData } from "@/lib/bandwidth";
import { cn } from "@/lib/utils";

/**
 * Editorial image with Low-Data awareness. In Low-Data Mode (or when there is
 * no image) the <img> is not rendered at all — so nothing is downloaded — and
 * a lightweight styled placeholder keeps the layout stable.
 */
export async function ContentImage({
  src,
  alt,
  sizes,
  className,
  priority = false,
  fallbackLabel,
}: {
  src: string | null | undefined;
  alt: string;
  sizes: string;
  className?: string;
  priority?: boolean;
  /** Shown in the placeholder when there is no image (instead of the Low-Data notice). */
  fallbackLabel?: string;
}) {
  const lowData = await isLowData();

  if (!src || lowData) {
    const t = await getTranslations("common");
    return (
      <div
        className={cn(
          "flex items-center justify-center overflow-hidden bg-surface-muted text-ink-secondary",
          "bg-[repeating-linear-gradient(135deg,transparent_0_12px,rgb(228_221_210/0.7)_12px_13px)]",
          className,
        )}
        role={src ? "img" : undefined}
        aria-label={src ? alt : undefined}
        aria-hidden={src ? undefined : true}
      >
        {src ? (
          <span className="flex items-center gap-2 px-3 text-center text-xs">
            <ImageOff aria-hidden="true" className="size-4 shrink-0" />
            {t("imagePlaceholder")}
          </span>
        ) : fallbackLabel ? (
          <span className="px-4 text-center font-serif text-lg font-semibold text-ink-secondary/80">{fallbackLabel}</span>
        ) : null}
      </div>
    );
  }

  // External images (an https:// URL pasted by an editor) cannot go through the
  // Next.js optimizer: no remote hosts are allowlisted, so it answers 400 and the
  // browser shows an empty box with the alt text. Load them as-is instead; our
  // own /uploads images (already resized WebP) and static assets stay optimized.
  const external = /^https?:\/\//i.test(src);

  return (
    <div className={cn("relative overflow-hidden bg-surface-muted", className)}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        unoptimized={external}
        referrerPolicy={external ? "no-referrer" : undefined}
        className="object-cover"
      />
    </div>
  );
}
