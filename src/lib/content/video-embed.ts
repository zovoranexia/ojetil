/**
 * Video embeds are limited to YouTube (privacy-enhanced youtube-nocookie.com)
 * and Vimeo. Any pasted watch/share URL is normalised to the canonical embed
 * URL; anything else is rejected. Client-safe (used by the editor and the
 * server-side sanitiser alike).
 */
const YT_ID = /^[A-Za-z0-9_-]{11}$/;
const VIMEO_ID = /^\d{6,12}$/;

export function toVideoEmbedUrl(input: string): string | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.replace(/^www\.|^m\./, "");

  let ytId: string | null = null;
  if (host === "youtu.be") ytId = url.pathname.slice(1).split("/")[0] ?? null;
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname === "/watch") ytId = url.searchParams.get("v");
    else {
      const m = /^\/(?:embed|shorts|live|v)\/([^/?#]+)/.exec(url.pathname);
      ytId = m?.[1] ?? null;
    }
  }
  if (ytId && YT_ID.test(ytId)) return `https://www.youtube-nocookie.com/embed/${ytId}`;

  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const m = /^\/(?:video\/)?(\d+)(?:\/([0-9a-f]+))?/.exec(url.pathname);
    if (m && VIMEO_ID.test(m[1]!)) {
      // Unlisted videos carry a privacy hash ("vimeo.com/123/abc" or "?h=abc").
      const hash = m[2] ?? url.searchParams.get("h");
      return `https://player.vimeo.com/video/${m[1]}${hash && /^[0-9a-f]{6,20}$/.test(hash) ? `?h=${hash}` : ""}`;
    }
  }
  return null;
}

/** True only for an already-canonical embed URL produced by `toVideoEmbedUrl`. */
export function isAllowedEmbedSrc(src: string): boolean {
  return toVideoEmbedUrl(src) === src;
}
