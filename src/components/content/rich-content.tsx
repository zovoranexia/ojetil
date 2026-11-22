import { getTranslations } from "next-intl/server";
import { renderArticleHtml } from "@/lib/content/sanitize";
import { isLowData } from "@/lib/bandwidth";
import { cn } from "@/lib/utils";

/**
 * Renders a news article body. The stored HTML was sanitised on save; it is
 * sanitised again here with the same strict allowlist (defence in depth), and
 * in Low-Data Mode images are removed and video embeds become plain links.
 * Legacy Markdown bodies are converted on the fly.
 */
export async function RichContent({ body, className }: { body: string; className?: string }) {
  const [lowData, t] = await Promise.all([isLowData(), getTranslations("news")]);
  const html = renderArticleHtml(body, { lowData, videoLinkLabel: t("watchVideo") });
  // Safe: sanitised by renderArticleHtml (strict allowlist).
  return <div className={cn("rich-content", className)} dangerouslySetInnerHTML={{ __html: html }} />;
}
