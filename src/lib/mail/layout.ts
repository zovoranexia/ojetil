import "server-only";
import { siteConfig } from "@/config/site";

/**
 * One branded layout for every email: table-based HTML (works in Gmail,
 * Outlook and phone mail apps), inline styles only, plus a plain-text twin.
 * All dynamic values are escaped here.
 */
export interface EmailContent {
  lang: string;
  preheader: string;
  heading: string;
  paragraphs: string[];
  /** Label / value rows, e.g. tracking code or event date. */
  details?: Array<[string, string]>;
  /** A quoted message (e.g. the Secretariat's note). */
  quote?: { label: string; text: string };
  button?: { label: string; href: string };
  footer: string;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const RED = "#a61c1c";
const INK = "#18181b";
const MUTED = "#52525b";
const PAPER = "#f8f5ef";
const GOLD = "#c98a12";

export function renderEmail(c: EmailContent): { html: string; text: string } {
  const details = c.details?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border:1px solid #e4e1da;border-radius:8px">${c.details
        .map(
          ([k, v], i) =>
            `<tr><td style="padding:10px 14px;font-size:13px;color:${MUTED};${i ? "border-top:1px solid #e4e1da;" : ""}width:40%">${esc(k)}</td><td style="padding:10px 14px;font-size:15px;color:${INK};font-weight:600;${i ? "border-top:1px solid #e4e1da;" : ""}">${esc(v)}</td></tr>`,
        )
        .join("")}</table>`
    : "";
  const quote = c.quote
    ? `<p style="margin:20px 0 4px;font-size:13px;color:${MUTED}">${esc(c.quote.label)}</p><blockquote style="margin:0;padding:12px 16px;border-left:3px solid ${GOLD};background:${PAPER};font-size:15px;color:${INK};white-space:pre-wrap">${esc(c.quote.text)}</blockquote>`
    : "";
  const button = c.button
    ? `<p style="margin:28px 0 8px"><a href="${esc(c.button.href)}" style="display:inline-block;background:${RED};color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:6px">${esc(c.button.label)}</a></p>`
    : "";

  const html = `<!doctype html>
<html lang="${esc(c.lang)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(c.heading)}</title></head>
<body style="margin:0;padding:0;background:${PAPER};font-family:Arial,Helvetica,sans-serif;color:${INK}">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(c.preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e4e1da">
<tr><td style="background:${INK};padding:18px 24px;border-bottom:4px solid ${RED}">
<span style="font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:700;color:#ffffff">${esc(siteConfig.shortName)}</span>
<span style="display:block;font-size:12px;color:${GOLD};margin-top:2px">${esc(siteConfig.motto)}</span>
</td></tr>
<tr><td style="padding:28px 24px 24px">
<h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.25;color:${INK}">${esc(c.heading)}</h1>
${c.paragraphs.map((p) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:${INK}">${esc(p)}</p>`).join("")}
${details}${quote}${button}
</td></tr>
<tr><td style="padding:16px 24px;background:${PAPER};font-size:12px;line-height:1.5;color:${MUTED}">${esc(c.footer)}<br>${esc(siteConfig.fullName)} · ${esc(siteConfig.headquarters.street)}, ${esc(siteConfig.headquarters.city)}</td></tr>
</table></td></tr></table></body></html>`;

  const text = [
    c.heading,
    "",
    ...c.paragraphs.flatMap((p) => [p, ""]),
    ...(c.details?.map(([k, v]) => `${k}: ${v}`) ?? []),
    ...(c.details?.length ? [""] : []),
    ...(c.quote ? [`${c.quote.label}:`, c.quote.text, ""] : []),
    ...(c.button ? [`${c.button.label}: ${c.button.href}`, ""] : []),
    "—",
    c.footer,
    `${siteConfig.fullName}`,
  ].join("\n");

  return { html, text };
}
