import "server-only";
import { getTranslations } from "next-intl/server";
import { resolveMessage } from "@/lib/i18n-message";

/** Server decoder for `msg()`-encoded strings (current request locale). See src/lib/i18n-message.ts. */
export async function getMessageText(): Promise<(text: string) => string> {
  const t = await getTranslations();
  return (text: string) => resolveMessage(t, text);
}
