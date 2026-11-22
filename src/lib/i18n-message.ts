/**
 * Translatable messages that cross the server → client boundary as plain strings
 * (Zod issue messages, ActionResult errors, thrown ActionErrors).
 *
 * Schemas and services cannot know the reader's language (the same Zod schema runs
 * in the browser via zodResolver and on the server), so they emit an encoded key:
 *
 *     msg("admin.validation.required")                 → "@admin.validation.required"
 *     msg("admin.validation.maxChars", { max: 200 })   → "@admin.validation.maxChars|{"max":200}"
 *
 * and the UI decodes it at display time with `useMessageText()` (client) or
 * `getMessageText()` (server). Anything not starting with "@" is shown verbatim,
 * so already-translated text (public site) passes through untouched.
 *
 * Safe to import anywhere (no server or client deps).
 */
export type MessageValues = Record<string, string | number>;

const PREFIX = "@";

export function msg(key: string, values?: MessageValues): string {
  return values ? `${PREFIX}${key}|${JSON.stringify(values)}` : `${PREFIX}${key}`;
}

export function parseMsg(text: string): { key: string; values?: MessageValues } | null {
  if (!text.startsWith(PREFIX)) return null;
  const bar = text.indexOf("|");
  if (bar === -1) return { key: text.slice(1) };
  try {
    return { key: text.slice(1, bar), values: JSON.parse(text.slice(bar + 1)) as MessageValues };
  } catch {
    return { key: text.slice(1, bar) };
  }
}

type LooseTranslator = { (key: string, values?: MessageValues): string; has(key: string): boolean };

/** Decodes `text` with a root-level translator (useTranslations() / getTranslations() without namespace). */
export function resolveMessage(t: unknown, text: string): string {
  const parsed = parseMsg(text);
  if (!parsed) return text;
  const tr = t as LooseTranslator;
  return tr.has(parsed.key) ? tr(parsed.key, parsed.values) : parsed.key;
}
