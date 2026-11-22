import { Mail, MapPin, MessageSquare, Phone } from "lucide-react";
import NextLink from "next/link";
import { getTranslations } from "next-intl/server";
import { Emblem } from "@/components/brand/emblem";
import { TaisRibbon } from "@/components/brand/tais-ribbon";
import { CHECK_STATUS_PATH, CONTACT_PATH, PRIMARY_NAV, REGISTER_PATH } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { Link } from "@/i18n/navigation";
import { currentDiliYear } from "@/lib/dates";

export async function SiteFooter() {
  const t = await getTranslations("footer");
  const nav = await getTranslations("nav");
  const { headquarters: hq, contact } = siteConfig;
  const linkClass = "inline-flex min-h-tap items-center text-paper/80 hover:text-paper md:min-h-9";

  return (
    <footer className="mt-auto">
      <TaisRibbon />
      <div className="bg-ink text-paper">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-[1.4fr_1fr_1fr_1.2fr] md:px-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Emblem size={48} />
              <span className="font-serif text-2xl font-bold">{siteConfig.shortName}</span>
            </div>
            <p className="max-w-xs text-sm text-paper/75">{t("tagline")}</p>
            <p className="font-serif text-lg text-gold-accent">
              {siteConfig.motto}
              <span className="block text-base text-paper/70">{siteConfig.mottoSubline}</span>
            </p>
          </div>

          <nav aria-labelledby="footer-explore">
            <h2 id="footer-explore" className="font-sans text-xs font-semibold uppercase tracking-[0.12em] text-gold-accent">
              {t("explore")}
            </h2>
            <ul className="mt-3">
              {PRIMARY_NAV.map((item) => (
                <li key={item.key}>
                  <Link href={item.href} className={linkClass}>
                    {nav(item.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-labelledby="footer-community">
            <h2 id="footer-community" className="font-sans text-xs font-semibold uppercase tracking-[0.12em] text-gold-accent">
              {t("community")}
            </h2>
            <ul className="mt-3">
              <li>
                <Link href={REGISTER_PATH} className={linkClass}>
                  {nav("register")}
                </Link>
              </li>
              <li>
                <Link href={CHECK_STATUS_PATH} className={linkClass}>
                  {nav("checkStatus")}
                </Link>
              </li>
              <li>
                <NextLink href="/admin/login" className={linkClass} rel="nofollow" prefetch={false}>
                  {t("staff")}
                </NextLink>
              </li>
            </ul>
          </nav>

          <address className="not-italic">
            <h2 className="font-sans text-xs font-semibold uppercase tracking-[0.12em] text-gold-accent">{t("contact")}</h2>
            <ul className="mt-3 space-y-3 text-sm text-paper/80">
              <li className="flex gap-3">
                <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-gold-accent" />
                <span>
                  <span className="sr-only">{t("headquarters")}: </span>
                  {hq.street}, {hq.city}
                  <br />
                  {hq.country}
                </span>
              </li>
              <li className="flex gap-3">
                <Mail aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-gold-accent" />
                <a href={`mailto:${contact.email}`} className="break-all hover:text-paper">
                  {contact.email}
                </a>
              </li>
              <li className="flex gap-3">
                <Phone aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-gold-accent" />
                <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="tabular-nums hover:text-paper">
                  {contact.phone}
                </a>
              </li>
              <li className="flex gap-3">
                <MessageSquare aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-gold-accent" />
                <Link href={CONTACT_PATH} className="font-semibold text-paper hover:underline">
                  {t("sendMessage")}
                </Link>
              </li>
            </ul>
          </address>
        </div>
        <div className="border-t border-paper/10">
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-5 text-xs text-paper/60 md:flex-row md:justify-between md:px-8">
            <p>{t("rights", { year: currentDiliYear() })}</p>
            <p>{t("timezone", { zone: siteConfig.timeZoneLabel })}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
