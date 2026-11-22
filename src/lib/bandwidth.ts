import "server-only";
import { cookies } from "next/headers";
import { BANDWIDTH_COOKIE, type BandwidthMode } from "@/config/bandwidth";

/**
 * Read on the server so Low-Data pages are rendered without image markup at all
 * (nothing to download), and the correct font stacks apply on first paint.
 */
export async function getBandwidthMode(): Promise<BandwidthMode> {
  return (await cookies()).get(BANDWIDTH_COOKIE)?.value === "low" ? "low" : "normal";
}

export async function isLowData(): Promise<boolean> {
  return (await getBandwidthMode()) === "low";
}
