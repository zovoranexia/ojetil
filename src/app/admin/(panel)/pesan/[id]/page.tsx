import type { Metadata } from "next";
import { Mail, Phone, Reply } from "lucide-react";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { AdminPageHeading } from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { satisfies } from "@/config/rbac";
import { siteConfig } from "@/config/site";
import { adminDateTime } from "@/lib/admin-format";
import { requirePageAccess } from "@/lib/security/guards";
import { openContactMessage } from "@/modules/contact/service";
import { MESSAGE_STATUS_TONE } from "../status";
import { MessageActions } from "./message-actions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.inbox");
  return { title: t("metaTitleOne") };
}

const LANGUAGE_NAMES = { TET: "Tetun", PT: "Português", ID: "Bahasa Indonesia", EN: "English" } as const;

export default async function MessagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageAccess("messages:read", `/admin/pesan/${id}`);
  // Opening marks a NEW message as READ (audited).
  const m = await openContactMessage(id, user);
  if (!m) notFound();
  const [t, locale] = await Promise.all([getTranslations("admin.inbox"), getLocale()]);
  const topic = t(`topics.${m.subject}` as never);
  const replyHref = `mailto:${m.email}?subject=${encodeURIComponent(`Re: ${siteConfig.shortName} — ${topic}`)}`;

  return (
    <>
      <AdminPageHeading back={{ href: "/admin/pesan", label: t("allMessages") }} title={topic} description={t("receivedAt", { date: adminDateTime(m.createdAt, locale) })} />
      <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
        <article className="rounded-card border border-border-subtle bg-surface-card p-5 md:p-6">
          <p className="whitespace-pre-wrap break-words leading-relaxed">{m.message}</p>
        </article>
        <aside className="space-y-4 xl:self-start">
          <section className="space-y-3 rounded-card border border-border-subtle bg-surface-card p-5">
            <h2 className="font-serif text-lg font-semibold">{m.name}</h2>
            <p className="flex items-center gap-2 text-sm">
              <Mail aria-hidden="true" className="size-4 shrink-0 text-ink-secondary" />
              <a href={`mailto:${m.email}`} className="break-all hover:text-ojetil-red hover:underline">
                {m.email}
              </a>
            </p>
            {m.phone ? (
              <p className="flex items-center gap-2 text-sm">
                <Phone aria-hidden="true" className="size-4 shrink-0 text-ink-secondary" />
                <a href={`tel:${m.phone.replace(/\s/g, "")}`} className="tabular-nums hover:text-ojetil-red hover:underline">
                  {m.phone}
                </a>
              </p>
            ) : null}
            <p className="text-sm text-ink-secondary">{t("language", { language: LANGUAGE_NAMES[m.locale] })}</p>
            <Badge tone={MESSAGE_STATUS_TONE[m.status]}>{t(`status.${m.status}`)}</Badge>
            <Button asChild className="w-full">
              <a href={replyHref}>
                <Reply aria-hidden="true" /> {t("reply")}
              </a>
            </Button>
          </section>
          {satisfies(user.role, "messages:manage") ? <MessageActions id={m.id} status={m.status} /> : null}
        </aside>
      </div>
    </>
  );
}
