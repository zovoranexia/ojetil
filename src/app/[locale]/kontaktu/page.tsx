import type { Metadata } from "next";
import { Clock, ExternalLink, Mail, MapPin, Phone } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/public/page-header";
import { siteConfig } from "@/config/site";
import { getMetadataLocale, getPageLocale } from "@/i18n/page-locale";
import { localizedAlternates } from "@/lib/seo";
import { ContactForm } from "./contact-form";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = await getMetadataLocale(params);
  if (!locale) return {};
  const t = await getTranslations({ locale, namespace: "contact" });
  return { title: t("metaTitle"), description: t("lead"), alternates: localizedAlternates("/kontaktu", locale) };
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  await getPageLocale(params);
  const [t, about] = await Promise.all([getTranslations("contact"), getTranslations("about.contact")]);
  const { headquarters: hq, contact } = siteConfig;
  const mapUrl = `https://www.openstreetmap.org/?mlat=${hq.geo.lat}&mlon=${hq.geo.lng}#map=17/${hq.geo.lat}/${hq.geo.lng}`;

  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} />
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:px-8 md:py-14 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-12">
        <ContactForm />

        <aside aria-labelledby="contact-direct" className="space-y-4 lg:self-start">
          <h2 id="contact-direct" className="font-serif text-xl font-semibold">
            {t("direct")}
          </h2>
          <a href={`mailto:${contact.email}`} className="flex items-center gap-4 rounded-card border border-border-subtle bg-surface-card p-5 hover:border-border-strong">
            <Mail aria-hidden="true" className="size-5 shrink-0 text-ojetil-red" />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-ink-secondary">{about("email")}</span>
              <span className="break-all">{contact.email}</span>
            </span>
          </a>
          <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="flex items-center gap-4 rounded-card border border-border-subtle bg-surface-card p-5 hover:border-border-strong">
            <Phone aria-hidden="true" className="size-5 shrink-0 text-ojetil-red" />
            <span>
              <span className="block text-sm font-medium text-ink-secondary">{about("phone")}</span>
              <span className="tabular-nums">{contact.phone}</span>
            </span>
          </a>
          <address className="not-italic rounded-card border border-border-subtle bg-surface-card p-5">
            <p className="flex gap-4">
              <MapPin aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-ojetil-red" />
              <span>
                <span className="block text-sm font-medium text-ink-secondary">{about("address")}</span>
                {hq.street}, {hq.city}, {hq.country}
                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 flex min-h-tap items-center gap-1.5 text-sm font-semibold text-ojetil-red underline-offset-4 hover:underline md:min-h-9"
                >
                  {about("map")} <ExternalLink aria-hidden="true" className="size-4" />
                </a>
              </span>
            </p>
            <p className="mt-3 flex gap-4 text-sm">
              <Clock aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-ojetil-red" />
              <span className="tabular-nums">{about("hours")}</span>
            </p>
          </address>
          <p className="text-sm text-ink-secondary">{t("privacy")}</p>
        </aside>
      </div>
    </>
  );
}
