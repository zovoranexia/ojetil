"use client";

import { useRouter } from "next/navigation";
import { MemberWizard } from "@/app/[locale]/komunidade/registrasi/member-wizard";

/** The public registration wizard in office mode; opens the new record when saved. */
export function OfficeRegistration({ canVerify }: { canVerify: boolean }) {
  const router = useRouter();
  return (
    <MemberWizard
      mode="office"
      canVerify={canVerify}
      // Verified on the spot → straight to the card; otherwise to the record (waiting in the queue).
      onOfficeCreated={({ id, status }) => router.push(status === "VERIFIED" ? `/admin/anggota/${id}/kartaun?verified=1` : `/admin/anggota/${id}?registered=1`)}
    />
  );
}
