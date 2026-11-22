"use client";

import { ImageIcon, RefreshCw, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { useMessageText } from "@/components/i18n/message-text";
import { Button } from "@/components/ui/button";
import { MediaPicker } from "./media-picker";

/**
 * Cover image chosen from (or uploaded into) the Media library. Shared by the
 * news and event editors; the value is the image's public URL ("" = none).
 */
export function CoverImageField({
  label,
  value,
  onChange,
  disabled,
  maxImageBytes,
  maxMediaBytes,
  error,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  disabled: boolean;
  maxImageBytes: number;
  maxMediaBytes: number;
  error?: string;
}) {
  const [picking, setPicking] = useState(false);
  const t = useTranslations("admin.media");
  const id = useId();
  const text = useMessageText();

  return (
    <div className="space-y-1.5">
      <span id={`${id}-label`} className="text-sm font-medium text-ink">
        {label}
      </span>
      {value ? (
        <div className="overflow-hidden rounded-card border border-border-subtle">
          {/* eslint-disable-next-line @next/next/no-img-element -- admin preview of an arbitrary uploaded/https image */}
          <img src={value} alt="" className="aspect-[16/9] w-full bg-surface-muted object-cover" />
          <div className="flex gap-1 border-t border-border-subtle p-1.5">
            <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={() => setPicking(true)}>
              <RefreshCw aria-hidden="true" /> {t("cover.replace")}
            </Button>
            <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={() => onChange("")} className="text-status-rejected">
              <X aria-hidden="true" /> {t("cover.remove")}
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          aria-labelledby={`${id}-label`}
          aria-describedby={`${id}-hint`}
          disabled={disabled}
          onClick={() => setPicking(true)}
          className="flex aspect-[16/10] w-full flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed border-border-subtle text-sm text-ink-secondary transition-colors hover:border-border-strong hover:text-ink disabled:opacity-60"
        >
          <ImageIcon aria-hidden="true" className="size-6" />
          {t("cover.choose")}
        </button>
      )}
      <p id={`${id}-hint`} className="text-xs text-ink-secondary">
        {t("cover.hint", { mb: Math.round(maxImageBytes / 1_048_576) })}
      </p>
      {error ? <p className="text-sm text-status-rejected">{text(error)}</p> : null}
      <MediaPicker
        open={picking}
        onOpenChange={setPicking}
        kinds={["IMAGE"]}
        title={t("picker.titleImages")}
        canUpload={!disabled}
        limits={{ imageMb: Math.round(maxImageBytes / 1_048_576), fileMb: Math.round(maxMediaBytes / 1_048_576) }}
        onSelect={(asset) => onChange(asset.url)}
      />
    </div>
  );
}
