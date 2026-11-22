"use client";

import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { resolveMessage } from "@/lib/i18n-message";

/** Client decoder for `msg()`-encoded strings; plain text is returned as is. See src/lib/i18n-message.ts. */
export function useMessageText(): (text: string) => string {
  const t = useTranslations();
  return useCallback((text: string) => resolveMessage(t, text), [t]);
}

/** Renders a possibly `msg()`-encoded string. */
export function MessageText({ value }: { value: string }) {
  const resolve = useMessageText();
  return <>{resolve(value)}</>;
}
