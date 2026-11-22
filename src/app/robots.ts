import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

/** /robots.txt — the public site is indexable; the backoffice and APIs are not. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] }],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
