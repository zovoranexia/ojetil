import "server-only";
import sanitizeHtml from "sanitize-html";
import { looksLikeHtml, markdownToHtml } from "./markdown-to-html";
import { isAllowedEmbedSrc } from "./video-embed";

/**
 * Strict allowlist for rich-text article bodies. Runs on every save (what is
 * stored is already clean) and again at render time (defence in depth, plus
 * Low-Data transformations). Anything not listed is dropped:
 *  • no scripts, event handlers, inline styles (except text-align), classes or ids;
 *  • links: http(s)/mailto only, always rel="noopener noreferrer nofollow";
 *  • images: our own /uploads/ paths or https URLs;
 *  • iframes: only canonical youtube-nocookie.com / player.vimeo.com embeds.
 */
const ALIGN = [/^(left|right|center|justify)$/];

function isAllowedImageSrc(src: string | undefined): boolean {
  if (!src) return false;
  if (src.startsWith("/uploads/") && !src.includes("..")) return true;
  return /^https:\/\/[^\s"'<>]+$/.test(src);
}

function baseOptions(): sanitizeHtml.IOptions {
  return {
    allowedTags: ["p", "br", "h2", "h3", "strong", "em", "u", "s", "ul", "ol", "li", "blockquote", "hr", "a", "img", "iframe", "div"],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "width", "height", "loading", "decoding"],
      iframe: ["src", "title", "allow", "allowfullscreen", "loading", "referrerpolicy"],
      div: ["data-video-embed"],
      p: ["style"],
      h2: ["style"],
      h3: ["style"],
    },
    allowedStyles: { p: { "text-align": ALIGN }, h2: { "text-align": ALIGN }, h3: { "text-align": ALIGN } },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: { img: ["https"], iframe: ["https"] },
    allowedSchemesAppliedToAttributes: ["href", "src"],
    allowProtocolRelative: false,
    allowedIframeHostnames: ["www.youtube-nocookie.com", "player.vimeo.com"],
    disallowedTagsMode: "discard",
    nonTextTags: ["style", "script", "textarea", "option", "noscript", "template"],
    transformTags: {
      h1: "h2",
      h4: "h3",
      h5: "h3",
      h6: "h3",
      b: "strong",
      i: "em",
      strike: "s",
      del: "s",
      a: (tagName, attribs) => {
        const href = attribs.href ?? "";
        return {
          tagName,
          attribs: {
            href,
            ...(/^https?:\/\//i.test(href) ? { target: "_blank" } : {}),
            rel: "noopener noreferrer nofollow",
          },
        };
      },
      iframe: (tagName, attribs) => ({
        tagName,
        attribs: {
          src: attribs.src ?? "",
          title: (attribs.title ?? "Video").slice(0, 120),
          allow: "accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen",
          allowfullscreen: "",
          loading: "lazy",
          referrerpolicy: "strict-origin-when-cross-origin",
        },
      }),
    },
    exclusiveFilter: (frame) => {
      if (frame.tag === "iframe") return !isAllowedEmbedSrc(frame.attribs.src ?? "");
      if (frame.tag === "img") return !isAllowedImageSrc(frame.attribs.src);
      if (frame.tag === "div") return frame.attribs["data-video-embed"] === undefined && !frame.text.trim();
      return false;
    },
  };
}

/** Sanitises editor output before it is stored. */
export function sanitizeArticleHtml(html: string): string {
  return dropEmptyEmbeds(sanitizeHtml(html, baseOptions())).trim();
}

/** An embed wrapper whose iframe was rejected would render as an empty 16:9 box. */
function dropEmptyEmbeds(html: string): string {
  return html.replace(/<div data-video-embed(?:="")?>\s*<\/div>/g, "");
}

/** Text content of a body (HTML or legacy Markdown), whitespace-collapsed. */
export function articlePlainText(body: string): string {
  const html = looksLikeHtml(body) ? body : markdownToHtml(body);
  const spaced = html.replace(/<\/(p|h2|h3|li|blockquote|div)>|<br\s*\/?>/gi, " ");
  return sanitizeHtml(spaced, { allowedTags: [], allowedAttributes: {} })
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** Visible-content check: a body of only empty paragraphs counts as empty. */
export function isEmptyArticleHtml(html: string): boolean {
  return articlePlainText(html) === "" && !/<(img|iframe)\b/i.test(html);
}

/** Watch-page URL for a canonical embed URL (used for the Low-Data link). */
function watchUrl(embedSrc: string): string {
  const yt = /youtube-nocookie\.com\/embed\/([A-Za-z0-9_-]{11})/.exec(embedSrc);
  if (yt) return `https://www.youtube.com/watch?v=${yt[1]}`;
  const vm = /player\.vimeo\.com\/video\/(\d+)(?:\?h=([0-9a-f]+))?/.exec(embedSrc);
  if (vm) return `https://vimeo.com/${vm[1]}${vm[2] ? `/${vm[2]}` : ""}`;
  return embedSrc;
}

/**
 * Body → safe HTML for the public article page. Legacy Markdown rows are
 * converted on the fly. In Low-Data Mode images are dropped and video embeds
 * become plain links, so nothing heavy is downloaded.
 */
export function renderArticleHtml(body: string, opts: { lowData: boolean; videoLinkLabel: string }): string {
  const html = looksLikeHtml(body) ? body : markdownToHtml(body);
  const base = baseOptions();
  if (!opts.lowData) {
    return dropEmptyEmbeds(sanitizeHtml(html, {
      ...base,
      transformTags: {
        ...base.transformTags,
        img: (tagName, attribs) => ({ tagName, attribs: { ...attribs, loading: "lazy", decoding: "async" } }),
      },
    }));
  }
  return dropEmptyEmbeds(sanitizeHtml(html, {
    ...base,
    transformTags: {
      ...base.transformTags,
      iframe: (_tagName, attribs) => ({
        tagName: "a",
        attribs: (isAllowedEmbedSrc(attribs.src ?? "") ? { href: watchUrl(attribs.src!), target: "_blank", rel: "noopener noreferrer nofollow" } : {}) as Record<string, string>,
        text: `▶ ${opts.videoLinkLabel}`,
      }),
    },
    // Note: exclusiveFilter sees the ORIGINAL tag name with the transformed attributes.
    exclusiveFilter: (frame) => {
      if (frame.tag === "img") return true;
      if (frame.tag === "iframe") return !frame.attribs.href;
      return base.exclusiveFilter?.(frame) ?? false;
    },
  }));
}
