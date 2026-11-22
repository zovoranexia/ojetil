import { siteConfig } from "@/config/site";
import { absoluteUrl } from "@/lib/seo";

type JsonLdValue = string | number | boolean | null | undefined | JsonLdValue[] | { [key: string]: JsonLdValue };

/**
 * schema.org structured data (rich results in search, better link previews).
 * `<` is escaped so text from the database can never close the script element.
 */
export function JsonLd({ data }: { data: { [key: string]: JsonLdValue } }) {
  const json = JSON.stringify({ "@context": "https://schema.org", ...data }).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}

/** The organisation itself, referenced as publisher/organizer by articles and events. */
export function organizationLd(): { [key: string]: JsonLdValue } {
  const { headquarters: hq, contact } = siteConfig;
  return {
    "@type": "NGO",
    "@id": absoluteUrl("/#organization"),
    name: siteConfig.fullName,
    alternateName: siteConfig.shortName,
    slogan: siteConfig.motto,
    url: absoluteUrl("/"),
    logo: absoluteUrl("/brand/ojetil-emblem.jpg"),
    email: contact.email,
    telephone: contact.phone,
    address: { "@type": "PostalAddress", streetAddress: hq.street, addressLocality: hq.city, addressCountry: "TL" },
  };
}
