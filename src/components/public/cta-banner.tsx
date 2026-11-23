import { existsSync } from "node:fs";
import { join } from "node:path";
import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { CHECK_STATUS_PATH, REGISTER_PATH } from "@/config/navigation";
import { Link } from "@/i18n/navigation";
import { isLowData } from "@/lib/bandwidth";

/**
 * Background photo of the registration banner (a historical photo of the
 * clandestine youth movement). Put the file at public/brand/cta-clandestine.jpg
 * (landscape, ≥ 1600 px wide, no text on it). It is shown in black-and-white
 * under a red tint; without the file the banner uses the gradient alone.
 */
const PHOTO_PATH = "/brand/cta-clandestine.jpg";
const hasPhoto = existsSync(join(process.cwd(), "public", PHOTO_PATH));

export async function CtaBanner() {
  const [t, low] = await Promise.all([getTranslations("home"), isLowData()]);
  const showPhoto = hasPhoto && !low;

  return (
    <section aria-labelledby="cta-title" className="px-4 pb-16 md:px-8">
      <div className={`relative isolate mx-auto max-w-6xl overflow-hidden rounded-card text-white shadow-[0_24px_48px_-28px_rgb(58_10_7/0.6)] ${showPhoto ? "bg-[#3a0a07]" : "bg-ojetil-red"}`}>
        {showPhoto ? (
          <>
            {/* Decorative: black-and-white photo on the right, tinted with the flag red. */}
            {/* eslint-disable-next-line @next/next/no-img-element -- static brand photo, decorative */}
            <img
              src={PHOTO_PATH}
              alt=""
              aria-hidden="true"
              loading="lazy"
              decoding="async"
              className="decorative-media absolute inset-y-0 right-0 -z-20 h-full w-full object-cover object-right brightness-125 contrast-125 grayscale md:w-[72%]"
            />
            <div aria-hidden="true" className="absolute inset-0 -z-10 bg-ojetil-red/75 mix-blend-multiply" />
          </>
        ) : null}
        {/* Deep maroon on the left (text side) fading to the flag red, then into the photo. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgb(42_6_5/0.97)_0%,rgb(110_20_14/0.92)_30%,rgb(180_35_24/0.7)_52%,rgb(180_35_24/0.2)_75%,rgb(180_35_24/0)_100%)] max-md:bg-[linear-gradient(180deg,rgb(42_6_5/0.95)_0%,rgb(140_26_18/0.88)_60%,rgb(180_35_24/0.7)_100%)]"
        />
        <div aria-hidden="true" className="tais-ribbon absolute inset-x-0 top-0" />

        <div className="grid gap-8 px-6 py-12 md:grid-cols-[1.5fr_1fr] md:items-center md:px-12 md:py-16">
          <div>
            <h2 id="cta-title" className="text-3xl text-white [text-shadow:0_1px_12px_rgb(0_0_0/0.35)] md:text-4xl">
              {t("cta.title")}
            </h2>
            <p className="mt-4 max-w-2xl text-white/90 [text-shadow:0_1px_8px_rgb(0_0_0/0.35)]">{t("cta.body")}</p>
          </div>
          <div className="flex flex-col gap-3 md:items-end">
            <Button asChild size="lg" variant="editorial" className="w-full shadow-lg md:w-auto">
              <Link href={REGISTER_PATH}>
                {t("cta.button")} <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            <Link
              href={CHECK_STATUS_PATH}
              className="inline-flex min-h-tap items-center text-sm font-semibold text-gold-accent underline underline-offset-4 hover:text-white"
            >
              {t("cta.checkStatus")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
