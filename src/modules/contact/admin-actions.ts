"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionError, authorizedAction } from "@/lib/actions";
import { msg } from "@/lib/i18n-message";
import { deleteContactMessage, setContactMessageStatus } from "./service";

const notFound = () => new ActionError("NOT_FOUND", msg("admin.inbox.notFound"));

export const updateContactMessageStatus = authorizedAction(
  "messages:manage",
  z.object({ id: z.string().min(1), status: z.enum(["NEW", "READ", "ARCHIVED"]) }),
  async ({ id, status }, user) => {
    if (!(await setContactMessageStatus(id, status, user))) throw notFound();
    revalidatePath("/admin/pesan");
    return { id };
  },
);

export const removeContactMessage = authorizedAction("messages:manage", z.object({ id: z.string().min(1) }), async ({ id }, user) => {
  if (!(await deleteContactMessage(id, user))) throw notFound();
  revalidatePath("/admin/pesan");
  return { id };
});
