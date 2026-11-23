import { Emblem } from "@/components/brand/emblem";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

export type HeroMilestone = { key: string; year: string; title: string };

/**
 * Home-page hero panel: the official emblem as the focal point, framed by a
 * gold halo on a dark tais-woven surface, with the motto underneath.
 *
 * Weight budget: everything except the emblem itself is CSS + inline SVG data
 * URIs (≈1 KB). Decorative layers carry `decorative-media`, so Low-Data Mode
 * drops them and keeps only the emblem and text. The slow halo rotation is
 * `motion-safe` only.
 */
export function HeroEmblem({ milestones, className }: { milestones: HeroMilestone[]; className?: string }) {
  return (
    <figure
      className={cn(
        "ink-chrome relative isolate flex flex-col items-center overflow-hidden rounded-card bg-brand-deep px-6 pb-7 pt-9 text-center text-paper md:max-lg:px-5 shadow-[0_24px_48px_-24px_rgb(24_24_27/0.55)] md:px-8 md:pb-8 md:pt-12",
        className,
      )}
    >
      {/* Woven tais lattice + warm glow behind the emblem. */}
      <div
        aria-hidden="true"
        className="decorative-media pointer-events-none absolute inset-0 -z-10 opacity-[0.16] [background-image:var(--ojetil-tais-weave)] [background-size:40px_40px] [mask-image:radial-gradient(ellipse_at_50%_35%,black_10%,transparent_75%)]"
      />
      <div
        aria-hidden="true"
        className="decorative-media pointer-events-none absolute left-1/2 top-[-10%] -z-10 aspect-square w-[130%] -translate-x-1/2 bg-[radial-gradient(circle,rgb(201_138_18/0.28)_0%,rgb(166_28_28/0.12)_38%,transparent_65%)]"
      />
      <span aria-hidden="true" className="tais-ribbon absolute inset-x-0 top-0" />

      {/* Emblem with halo rings. */}
      <div className="relative grid size-44 place-items-center sm:size-52 md:size-48 lg:size-60">
        <span
          aria-hidden="true"
          className="decorative-media absolute -inset-3 rounded-full border border-dashed border-gold-accent/45 motion-safe:animate-[spin_90s_linear_infinite]"
        />
        <span aria-hidden="true" className="absolute inset-0 rounded-full border-2 border-gold-accent" />
        <span aria-hidden="true" className="absolute inset-1.5 rounded-full border border-gold-accent/40" />
        <Emblem
          size={240}
          priority
          className="relative size-[calc(100%-1.25rem)] shadow-[0_0_0_3px_rgb(24_24_27),0_12px_32px_rgb(0_0_0/0.45)]"
        />
      </div>

      <figcaption className="mt-7 md:mt-8">
        <p className="font-serif text-3xl font-bold leading-tight text-gold-accent md:max-lg:text-[1.75rem] lg:text-4xl">{siteConfig.motto}</p>
        <p className="mt-3 flex items-center justify-center gap-3 whitespace-nowrap text-xs font-semibold uppercase tracking-[0.3em] text-paper/80 md:max-lg:tracking-[0.2em]">
          <span aria-hidden="true" className="h-px w-8 bg-gold-accent/60 md:max-lg:w-4" />
          {siteConfig.mottoSubline}
          <span aria-hidden="true" className="h-px w-8 bg-gold-accent/60 md:max-lg:w-4" />
        </p>
      </figcaption>

      {milestones.length > 0 && (
        <ol className="mt-8 grid w-full grid-cols-2 gap-x-5 gap-y-4 md:max-lg:gap-x-3 border-t border-paper/15 pt-6 text-left">
          {milestones.map((m) => (
            <li key={m.key} className="border-l-2 border-gold-accent/60 pl-3">
              <p className="font-serif text-lg font-semibold leading-none tabular-nums text-gold-accent">{m.year}</p>
              <p className="mt-1 line-clamp-3 text-sm leading-snug text-paper/80">{m.title}</p>
            </li>
          ))}
        </ol>
      )}
    </figure>
  );
}
