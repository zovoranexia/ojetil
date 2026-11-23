"use client";

import { useRouter } from "next/navigation";
import { MemberWizard } from "@/app/[locale]/komunidade/registrasi/member-wizard";

/** The public registration wizard in office mode; opens the new record when saved. */
export function OfficeRegistration() {
  const router = useRouter();
  return <MemberWizard mode="office" onOfficeCreated={({ id }) => router.push(`/admin/anggota/${id}?registered=1`)} />;
}
