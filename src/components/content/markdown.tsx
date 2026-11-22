import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Minimal, dependency-free Markdown renderer for editorial content.
 * Supports: paragraphs, "## " / "### " headings, "- " and "1. " lists,
 * **bold**, *italic*, and line breaks. Everything is emitted as React text
 * nodes — raw HTML in the source is never interpreted, so it is XSS-safe.
 * Kept tiny on purpose: every kilobyte counts on Timorese mobile networks.
 */
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g;
  let last = 0;
  let i = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > last) nodes.push(text.slice(last, index));
    const token = match[0];
    if (token.startsWith("**")) nodes.push(<strong key={`${keyPrefix}-b${i++}`}>{token.slice(2, -2)}</strong>);
    else nodes.push(<em key={`${keyPrefix}-i${i++}`}>{token.slice(1, -1)}</em>);
    last = index + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function withBreaks(lines: string[], keyPrefix: string): ReactNode[] {
  return lines.flatMap((line, i) => [
    ...(i > 0 ? [<br key={`${keyPrefix}-br${i}`} />] : []),
    <Fragment key={`${keyPrefix}-l${i}`}>{renderInline(line, `${keyPrefix}-l${i}`)}</Fragment>,
  ]);
}

export function Markdown({ source, className }: { source: string; className?: string }) {
  const blocks = source.replace(/\r\n/g, "\n").trim().split(/\n{2,}/);

  return (
    <div className={cn("space-y-4 text-base leading-relaxed text-ink md:text-[1.0625rem]", className)}>
      {blocks.map((block, b) => {
        const lines = block.split("\n");
        const key = `blk${b}`;

        if (lines.every((l) => /^\s*[-*]\s+/.test(l))) {
          return (
            <ul key={key} className="list-disc space-y-1.5 pl-6 marker:text-ojetil-red">
              {lines.map((l, i) => (
                <li key={i}>{renderInline(l.replace(/^\s*[-*]\s+/, ""), `${key}-${i}`)}</li>
              ))}
            </ul>
          );
        }
        if (lines.every((l) => /^\s*\d+[.)]\s+/.test(l))) {
          return (
            <ol key={key} className="list-decimal space-y-1.5 pl-6 marker:font-semibold marker:text-ink-secondary">
              {lines.map((l, i) => (
                <li key={i}>{renderInline(l.replace(/^\s*\d+[.)]\s+/, ""), `${key}-${i}`)}</li>
              ))}
            </ol>
          );
        }
        const heading = /^(#{2,3})\s+(.*)$/.exec(lines[0] ?? "");
        if (heading && lines.length === 1) {
          const Tag = heading[1] === "##" ? "h2" : "h3";
          return (
            <Tag key={key} className={Tag === "h2" ? "pt-2 text-2xl" : "pt-1 text-xl"}>
              {renderInline(heading[2] ?? "", key)}
            </Tag>
          );
        }
        // A bold-only first line followed by a list (e.g. "**Agenda**\n- …") renders as label + list.
        if (lines.length > 1 && /^\*\*[^*]+\*\*$/.test(lines[0]!) && lines.slice(1).every((l) => /^\s*[-*]\s+/.test(l))) {
          return (
            <div key={key} className="space-y-2">
              <p className="font-semibold">{lines[0]!.slice(2, -2)}</p>
              <ul className="list-disc space-y-1.5 pl-6 marker:text-ojetil-red">
                {lines.slice(1).map((l, i) => (
                  <li key={i}>{renderInline(l.replace(/^\s*[-*]\s+/, ""), `${key}-${i}`)}</li>
                ))}
              </ul>
            </div>
          );
        }
        return <p key={key}>{withBreaks(lines, key)}</p>;
      })}
    </div>
  );
}
