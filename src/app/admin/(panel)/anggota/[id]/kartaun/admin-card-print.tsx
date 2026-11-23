"use client";

import { useTranslations } from "next-intl";
import { CardPrintActions } from "@/components/members/card-print-actions";
import { logMemberCardPrint } from "@/modules/members/admin-actions";

/** Backoffice print/download buttons; every print is written to the audit log first. */
export function AdminCardPrint({ id }: { id: string }) {
  const t = useTranslations("admin.members.detail");
  return (
    <CardPrintActions
      labels={{ cr80: t("printCr80"), a4: t("printA4"), hint: t("printHint"), failed: t("printFailed") }}
      onPrint={async (format) => (await logMemberCardPrint({ id, format })).ok}
    />
  );
}
