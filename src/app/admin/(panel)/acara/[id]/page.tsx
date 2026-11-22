import type { Metadata } from "next";
import { Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AdminPageHeading, ReadOnlyNotice } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { satisfies } from "@/config/rbac";
import { getServerEnv } from "@/lib/env";
import { diliDaysFromNow, toDiliLocalInput } from "@/lib/dates";
import { requirePageAccess } from "@/lib/security/guards";
import { emptyTranslations } from "@/modules/content/admin-schema";
import { EVENT_TRANSLATION_FIELDS, type EventFormValues } from "@/modules/events/admin-schema";
import { getEventForEdit } from "@/modules/events/admin-queries";
import { EventEditor } from "../event-editor";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.events");
  return { title: t("metaEdit") };
}

export default async function EventEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isNew = id === "baru";
  const user = await requirePageAccess(isNew ? "events:write" : "events:read", `/admin/acara/${id}`);
  const canWrite = satisfies(user.role, "events:write");
  const t = await getTranslations("admin.events");

  const loaded = isNew ? null : await getEventForEdit(id);
  if (!isNew && !loaded) notFound();

  const initial: EventFormValues = loaded ?? {
    slug: "",
    type: "SEMINAR",
    status: "DRAFT",
    startAt: toDiliLocalInput(diliDaysFromNow(14, 9)),
    endAt: toDiliLocalInput(diliDaysFromNow(14, 12)),
    location: "",
    municipality: "",
    isOnline: false,
    onlineUrl: "",
    capacity: 100,
    registrationOpen: true,
    registrationDeadline: "",
    coverImageUrl: "",
    translations: emptyTranslations(EVENT_TRANSLATION_FIELDS),
  };
  const registered = loaded?.registered ?? 0;
  const totalRegistrations = loaded?.totalRegistrations ?? 0;

  return (
    <>
      <AdminPageHeading
        back={{ href: "/admin/acara", label: t("allEvents") }}
        title={isNew ? t("newEvent") : initial.translations.TET.title || initial.slug}
        actions={
          !isNew ? (
            <Button asChild variant="outline">
              <Link href={`/admin/acara/${id}/peserta`}>
                <Users aria-hidden="true" /> {t("attendeesCount", { count: registered })}
              </Link>
            </Button>
          ) : null
        }
      />
      {!canWrite ? <ReadOnlyNotice>{t("readOnly")}</ReadOnlyNotice> : null}
      <EventEditor initial={initial} readOnly={!canWrite} canPublish={satisfies(user.role, "events:publish")} registered={registered} totalRegistrations={totalRegistrations} maxImageBytes={getServerEnv().MAX_IMAGE_UPLOAD_BYTES} maxMediaBytes={getServerEnv().MAX_MEDIA_FILE_BYTES} />
    </>
  );
}
