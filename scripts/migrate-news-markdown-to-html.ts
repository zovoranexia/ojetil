/**
 * One-off data migration for the rich-text editors: converts legacy Markdown
 * to sanitised HTML in every rich-text field — news bodies, profile sections,
 * timeline narratives and event descriptions.
 *
 *   npm run news:md-to-html -- --dry-run   # report only
 *   npm run news:md-to-html                # convert
 *
 * (Named after its first use; it now covers all rich-text content.)
 * Idempotent: values that already contain HTML are skipped, so it is safe to
 * run on every deploy. Until it runs, the public site renders legacy Markdown
 * safely on the fly. Each converted table is written to the audit log.
 */
import "dotenv/config";
import { parseArgs } from "node:util";
import { looksLikeHtml, markdownToHtml } from "../src/lib/content/markdown-to-html";
import { sanitizeArticleHtml } from "../src/lib/content/sanitize";
import { db } from "../src/lib/db";
import { recordAudit } from "../src/modules/audit/service";

type Row = { id: string; value: string | null };

interface Target {
  label: string;
  load: () => Promise<Row[]>;
  save: (id: string, html: string) => Promise<unknown>;
}

const TARGETS: Target[] = [
  {
    label: "NewsArticleTranslation.body",
    load: async () => (await db.newsArticleTranslation.findMany({ select: { id: true, body: true } })).map((r) => ({ id: r.id, value: r.body })),
    save: (id, html) => db.newsArticleTranslation.update({ where: { id }, data: { body: html } }),
  },
  {
    label: "ProfileSectionTranslation.body",
    load: async () => (await db.profileSectionTranslation.findMany({ select: { id: true, body: true } })).map((r) => ({ id: r.id, value: r.body })),
    save: (id, html) => db.profileSectionTranslation.update({ where: { id }, data: { body: html } }),
  },
  {
    label: "TimelineMilestoneTranslation.body",
    load: async () => (await db.timelineMilestoneTranslation.findMany({ select: { id: true, body: true } })).map((r) => ({ id: r.id, value: r.body })),
    save: (id, html) => db.timelineMilestoneTranslation.update({ where: { id }, data: { body: html } }),
  },
  {
    label: "EventTranslation.description",
    load: async () => (await db.eventTranslation.findMany({ select: { id: true, description: true } })).map((r) => ({ id: r.id, value: r.description })),
    save: (id, html) => db.eventTranslation.update({ where: { id }, data: { description: html } }),
  },
];

async function main(): Promise<void> {
  const { "dry-run": dryRun } = parseArgs({ options: { "dry-run": { type: "boolean", default: false } }, strict: true }).values;

  for (const target of TARGETS) {
    const rows = await target.load();
    const legacy = rows.filter((r) => r.value && r.value.trim() && !looksLikeHtml(r.value));
    console.log(`${target.label}: ${rows.length} total, ${legacy.length} still in Markdown.`);
    if (dryRun || legacy.length === 0) continue;

    for (const r of legacy) await target.save(r.id, sanitizeArticleHtml(markdownToHtml(r.value!)));
    await recordAudit({
      action: "CONTENT_UPDATED",
      actor: null,
      target: { type: target.label.split(".")[0]!, id: "*" },
      metadata: { migration: "markdown-to-html", field: target.label, converted: legacy.length },
      context: { ipAddress: null, userAgent: "scripts/migrate-news-markdown-to-html" },
    });
    console.log(`  ✔ converted ${legacy.length}`);
  }
}

main()
  .catch((error: unknown) => {
    console.error("✖ Migration failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
