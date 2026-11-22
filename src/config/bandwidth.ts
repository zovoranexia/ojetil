/** Low-Data Mode preference. Cookie lets the server render without images; localStorage mirrors it. */
export const BANDWIDTH_COOKIE = "ojetil-bw";
export const BANDWIDTH_STORAGE_KEY = "ojetil-bw";
export type BandwidthMode = "low" | "normal";
export const BANDWIDTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
