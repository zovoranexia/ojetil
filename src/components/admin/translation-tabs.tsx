"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { AlertCircle, Check } from "lucide-react";
import type { FieldErrors, FieldValues, UseFormRegister, UseFormWatch } from "react-hook-form";
import { Field, fieldAria, textareaClassName } from "@/components/forms/field";
import { Input } from "@/components/ui/input";
import { CONTENT_LOCALES, LOCALE_TAB_LABELS, type TranslationFieldSpec } from "@/modules/content/admin-schema";
import { cn } from "@/lib/utils";

/**
 * TET | PT | ID | EN tabbed editor for translated fields. Each tab shows whether
 * that language is complete, empty (falls back to Tetun publicly) or has errors.
 * Tetun is required; other languages are optional but must be complete if started.
 */
export function TranslationTabs<T extends FieldValues>({
  fields,
  register,
  watch,
  errors,
  disabled,
}: {
  fields: readonly TranslationFieldSpec[];
  register: UseFormRegister<T>;
  watch: UseFormWatch<T>;
  errors: FieldErrors<T>;
  disabled?: boolean;
}) {
  const values = ((watch("translations" as never) as unknown) ?? {}) as Record<string, Record<string, string>>;
  const tErrors = ((errors as Record<string, unknown>).translations ?? {}) as Record<string, Record<string, { message?: string }> | undefined>;

  return (
    <Tabs.Root defaultValue="TET" className="rounded-card border border-border-subtle">
      <Tabs.List aria-label="Content language" className="flex overflow-x-auto border-b border-border-subtle bg-paper">
        {CONTENT_LOCALES.map((locale) => {
          const v = values[locale] ?? {};
          const hasError = Boolean(tErrors[locale] && Object.keys(tErrors[locale]!).length);
          const complete = fields.filter((f) => f.required).every((f) => (v[f.name] ?? "").trim() !== "");
          return (
            <Tabs.Trigger
              key={locale}
              value={locale}
              className={cn(
                "relative inline-flex min-h-tap shrink-0 items-center gap-2 px-4 text-sm font-semibold text-ink-secondary md:min-h-11",
                "data-[state=active]:bg-surface-card data-[state=active]:text-ink data-[state=active]:after:absolute data-[state=active]:after:inset-x-0 data-[state=active]:after:bottom-0 data-[state=active]:after:h-0.5 data-[state=active]:after:bg-ojetil-red",
              )}
            >
              {LOCALE_TAB_LABELS[locale]}
              {hasError ? (
                <AlertCircle aria-label="has errors" className="size-4 text-status-rejected" />
              ) : complete ? (
                <Check aria-label="complete" className="size-4 text-status-verified" />
              ) : (
                <span className="text-xs font-normal">{locale === "TET" ? "required" : "optional"}</span>
              )}
            </Tabs.Trigger>
          );
        })}
      </Tabs.List>
      {CONTENT_LOCALES.map((locale) => (
        <Tabs.Content key={locale} value={locale} forceMount className="space-y-5 p-5 data-[state=inactive]:hidden" lang={locale.toLowerCase()}>
          {locale !== "TET" ? (
            <p className="text-xs text-ink-secondary">Leave every field empty to show the Tetun version to {LOCALE_TAB_LABELS[locale]} readers.</p>
          ) : null}
          {fields.map((f) => {
            const id = `translations-${locale}-${f.name}`;
            const name = `translations.${locale}.${f.name}`;
            const error = tErrors[locale]?.[f.name]?.message;
            return (
              <Field key={f.name} id={id} label={f.label} required={f.required && locale === "TET"} hint={f.hint} error={error}>
                {f.multiline ? (
                  <textarea
                    rows={f.rows ?? 6}
                    disabled={disabled}
                    className={cn(textareaClassName, f.rows && f.rows > 8 && "font-mono text-sm")}
                    {...fieldAria(id, { hint: Boolean(f.hint), error })}
                    {...register(name as never)}
                  />
                ) : (
                  <Input disabled={disabled} {...fieldAria(id, { hint: Boolean(f.hint), error })} {...register(name as never)} />
                )}
              </Field>
            );
          })}
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
}
