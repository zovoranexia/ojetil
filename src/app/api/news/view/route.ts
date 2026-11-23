import { contextFromHeaders } from "@/lib/request-context";
import { SLUG_PATTERN } from "@/lib/slug";
import { isSameOrigin } from "@/lib/security/origin";
import { rateLimit } from "@/lib/security/rate-limit";
import { recordArticleView } from "@/modules/news/views";

export const runtime = "nodejs";

const noContent = () => new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
/** Crawlers and link-preview fetchers are not readers. */
const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|discord|curl|wget|python|headless/i;

/**
 * POST /api/news/view — body: the article slug (text/plain, sent with
 * navigator.sendBeacon once per browser session). Always answers 204 so the
 * page never waits on it. Repeat reads of the same article from one address
 * within 30 minutes count once; the address itself is never stored.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return noContent();
  if (BOT.test(request.headers.get("user-agent") ?? "")) return noContent();

  const slug = (await request.text().catch(() => "")).trim().slice(0, 120);
  if (!SLUG_PATTERN.test(slug)) return noContent();

  const { ipAddress } = contextFromHeaders(request.headers);
  if (!rateLimit("news-view", `${ipAddress ?? "unknown"}|${slug}`, 1, 30 * 60_000).ok) return noContent();

  await recordArticleView(slug).catch((error: unknown) => console.error("[news] view not recorded", error instanceof Error ? error.message : error));
  return noContent();
}
