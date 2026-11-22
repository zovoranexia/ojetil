/**
 * Converts the small Markdown dialect used by the legacy news editor (see
 * `src/components/content/markdown.tsx`) into HTML for the rich-text editor:
 * paragraphs, "## " / "### " headings, "- " and "1. " lists, **bold**,
 * *italic* and line breaks. All text is HTML-escaped, so raw HTML in the
 * source never survives — the output is still sanitised before storage.
 *
 * Pure and dependency-free: used by the seed, the one-off data migration
 * (`npm run news:md-to-html`) and the public renderer for not-yet-migrated rows.
 */
function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function inline(text: string): string {
  const escaped = escapeHtml(text);
  return escaped.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/\*([^*\s][^*]*)\*/g, "<em>$1</em>");
}

const BULLET = /^\s*[-*]\s+/;
const ORDERED = /^\s*\d+[.)]\s+/;

export function markdownToHtml(source: string): string {
  const blocks = source.replace(/\r\n/g, "\n").trim().split(/\n{2,}/).filter((b) => b.trim() !== "");
  const out: string[] = [];

  for (const block of blocks) {
    const lines = block.split("\n");
    if (lines.every((l) => BULLET.test(l))) {
      out.push(`<ul>${lines.map((l) => `<li><p>${inline(l.replace(BULLET, ""))}</p></li>`).join("")}</ul>`);
      continue;
    }
    if (lines.every((l) => ORDERED.test(l))) {
      out.push(`<ol>${lines.map((l) => `<li><p>${inline(l.replace(ORDERED, ""))}</p></li>`).join("")}</ol>`);
      continue;
    }
    const heading = /^(#{2,3})\s+(.*)$/.exec(lines[0] ?? "");
    if (heading && lines.length === 1) {
      const tag = heading[1] === "##" ? "h2" : "h3";
      out.push(`<${tag}>${inline(heading[2] ?? "")}</${tag}>`);
      continue;
    }
    // "**Label**" followed by a bullet list.
    if (lines.length > 1 && /^\*\*[^*]+\*\*$/.test(lines[0]!) && lines.slice(1).every((l) => BULLET.test(l))) {
      out.push(`<p>${inline(lines[0]!)}</p>`);
      out.push(`<ul>${lines.slice(1).map((l) => `<li><p>${inline(l.replace(BULLET, ""))}</p></li>`).join("")}</ul>`);
      continue;
    }
    out.push(`<p>${lines.map(inline).join("<br>")}</p>`);
  }
  return out.join("");
}

/** Heuristic: rich-text editor output always starts with a block element. */
export function looksLikeHtml(body: string): boolean {
  return /^\s*<(p|h[1-6]|ul|ol|blockquote|hr|div|figure|img)[\s>/]/i.test(body);
}
