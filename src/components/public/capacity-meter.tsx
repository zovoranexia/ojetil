import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import type { Availability } from "@/modules/events/availability";
import { cn } from "@/lib/utils";

/** Seats indicator: accessible meter + text, with a status badge for full/closed/cancelled. */
export async function CapacityMeter({ availability, compact = false }: { availability: Availability; compact?: boolean }) {
  const t = await getTranslations("events");
  const { state, registered, capacity, seatsLeft, ratio } = availability;

  const badge =
    state === "cancelled" ? (
      <Badge tone="rejected">{t("cancelled")}</Badge>
    ) : state === "ended" ? (
      <Badge tone="neutral">{t("ended")}</Badge>
    ) : state === "full" ? (
      <Badge tone="rejected">{t("full")}</Badge>
    ) : state === "closed" ? (
      <Badge tone="neutral">{t("registrationClosedShort")}</Badge>
    ) : state === "almostFull" ? (
      <Badge tone="pending">{t("almostFull")}</Badge>
    ) : null;

  if (state === "cancelled") return badge;

  const barTone = state === "full" ? "bg-status-rejected" : state === "almostFull" ? "bg-status-pending" : "bg-ojetil-red";

  return (
    <div className={cn("space-y-1.5", compact ? "text-xs" : "text-sm")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="tabular-nums text-ink-secondary">{t("registered", { count: registered, capacity })}</span>
        {badge ?? (state !== "ended" ? <span className="font-semibold tabular-nums text-ink">{t("seatsLeft", { count: seatsLeft })}</span> : null)}
      </div>
      <meter
        min={0}
        max={capacity}
        low={Math.floor(capacity * 0.6)}
        high={Math.floor(capacity * 0.85)}
        optimum={0}
        value={registered}
        className="sr-only"
        aria-label={t("capacityLabel")}
      >
        {registered}/{capacity}
      </meter>
      <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
        <div className={cn("h-full rounded-full", barTone)} style={{ width: `${Math.round(ratio * 100)}%` }} />
      </div>
    </div>
  );
}
