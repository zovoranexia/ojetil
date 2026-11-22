import type { MetadataRoute } from "next";
import { LOCALES } from "@/config/locales";
import { PRIMARY_NAV, CONTACT_PATH, REGISTER_PATH } from "@/config/navigation";
import { getPathname } from "@/i18n/navigation";
import { absoluteUrl } from "@/lib/seo";
import { publicEventsForSitemap } from "@/modules/events/queries";
import { publishedNewsForSitemap } from "@/modules/news/queries";

/** Rendered per request (two small queries): never prerendered, so builds need no database. */
export const dynamic = "force-dynamic";

/**
 * /sitemap.xml — every public page in Tetun (canonical, unprefixed) with its
 * PT/ID/EN alternates, so search engines index each language version.
 * PDFs are excluded on purpose (they are served with X-Robots-Tag: noindex).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entry = (path: string, opts: { lastModified?: Date; changeFrequency?: MetadataRoute.Sitemap[number]["changeFrequency"]; priority?: number } = {}) => ({
    url: absoluteUrl(getPathname({ href: path, locale: "tet" })),
    ...opts,
    alternates: { languages: Object.fromEntries(LOCALES.map((l) => [l, absoluteUrl(getPathname({ href: path, locale: l }))])) },
  });

  const [news, events] = await Promise.all([publishedNewsForSitemap(), publicEventsForSitemap()]);

  return [
    ...PRIMARY_NAV.map((item) => entry(item.href, { changeFrequency: item.href === "/" || item.href === "/notisia" ? "daily" : "weekly", priority: item.href === "/" ? 1 : 0.8 })),
    entry(CONTACT_PATH, { changeFrequency: "yearly", priority: 0.5 }),
    entry(REGISTER_PATH, { changeFrequency: "yearly", priority: 0.6 }),
    ...news.map((a) => entry(`/notisia/${a.slug}`, { lastModified: a.updatedAt, changeFrequency: "monthly", priority: 0.7 })),
    ...events.map((e) => entry(`/edukasaun/acara/${e.slug}`, { lastModified: e.updatedAt, changeFrequency: "weekly", priority: 0.6 })),
  ];
}
