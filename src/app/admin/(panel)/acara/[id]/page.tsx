import type { Metadata } from "next";
import { Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeading, ReadOnlyNotice } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { satisfies } from "@/config/rbac";
import { diliDaysFromNow, toDiliLocalInput } from "@/lib/dates";
import { requirePageAccess } from "@/lib/security/guards";
import { emptyTranslations } from "@/modules/content/admin-schema";
import { EVENT_TRANSLATION_FIELDS, type EventFormValues } from "@/modules/events/admin-schema";
import { getEventForEdit } from "@/modules/events/admin-queries";
import { EventEditor } from "../event-editor";

export const metadata: Metadata = { title: "Edit event" };

export default async function EventEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isNew = id === "baru";
  const user = await requirePageAccess(isNew ? "events:write" : "events:read", `/admin/acara/${id}`);
  const canWrite = satisfies(user.role, "events:write");

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
        back={{ href: "/admin/acara", label: "All events" }}
        title={isNew ? "New event" : initial.translations.TET.title || initial.slug}
        actions={
          !isNew ? (
            <Button asChild variant="outline">
              <Link href={`/admin/acara/${id}/peserta`}>
                <Users aria-hidden="true" /> Attendees ({registered})
              </Link>
            </Button>
          ) : null
        }
      />
      {!canWrite ? <ReadOnlyNotice>Read-only: your role can view events but not edit them.</ReadOnlyNotice> : null}
      <EventEditor initial={initial} readOnly={!canWrite} canPublish={satisfies(user.role, "events:publish")} registered={registered} totalRegistrations={totalRegistrations} />
    </>
  );
}
