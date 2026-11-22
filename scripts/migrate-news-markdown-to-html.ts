/**
 * One-off data migration for the rich-text news editor: converts legacy
 * Markdown article bodies to sanitised HTML.
 *
 *   npm run news:md-to-html -- --dry-run   # report only
 *   npm run news:md-to-html                # convert
 *
 * Idempotent: rows that already contain HTML are skipped, so it is safe to run
 * on every deploy. Until it runs, the public site renders legacy Markdown
 * bodies safely on the fly, so the order "migrate deploy → this script" is not
 * time-critical. The run is written to the append-only audit log.
 */
import "dotenv/config";
import { parseArgs } from "node:util";
import { looksLikeHtml, markdownToHtml } from "../src/lib/content/markdown-to-html";
import { sanitizeArticleHtml } from "../src/lib/content/sanitize";
import { db } from "../src/lib/db";
import { recordAudit } from "../src/modules/audit/service";

async function main(): Promise<void> {
  const { "dry-run": dryRun } = parseArgs({ options: { "dry-run": { type: "boolean", default: false } }, strict: true }).values;

  const rows = await db.newsArticleTranslation.findMany({ select: { id: true, articleId: true, locale: true, body: true } });
  const legacy = rows.filter((r) => !looksLikeHtml(r.body));
  console.log(`News translations: ${rows.length} total, ${legacy.length} still in Markdown.`);
  if (dryRun || legacy.length === 0) {
    if (dryRun) for (const r of legacy) console.log(`  would convert ${r.articleId} [${r.locale}]`);
    return;
  }

  let converted = 0;
  for (const r of legacy) {
    const html = sanitizeArticleHtml(markdownToHtml(r.body));
    await db.newsArticleTranslation.update({ where: { id: r.id }, data: { body: html } });
    converted++;
  }
  await recordAudit({
    action: "CONTENT_UPDATED",
    actor: null,
    target: { type: "NewsArticleTranslation", id: "*" },
    metadata: { migration: "news-markdown-to-html", converted, articles: [...new Set(legacy.map((r) => r.articleId))].length },
    context: { ipAddress: null, userAgent: "scripts/migrate-news-markdown-to-html" },
  });
  console.log(`✔ Converted ${converted} translation(s) to HTML.`);
}

main()
  .catch((error: unknown) => {
    console.error("✖ Migration failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
