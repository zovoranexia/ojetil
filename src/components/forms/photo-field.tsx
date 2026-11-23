"use client";

import { Camera, Loader2, Trash2, Video, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { MAX_PHOTO_BYTES, PHOTO_MIME_TYPES } from "@/modules/members/registration-schema";

const MAX_EDGE = 1200;

/**
 * Phone cameras produce 3–8 MB photos; asking people on mobile data to resize
 * them manually is a dead end. Oversized images are downscaled in the browser
 * (canvas → JPEG) before upload, so most photos "just work" and the upload is
 * small. The server still enforces the 1 MB limit and re-encodes the image.
 */
async function shrinkImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file); // honours EXIF orientation in modern browsers
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size <= MAX_PHOTO_BYTES) {
    bitmap.close();
    return file;
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  for (const quality of [0.85, 0.75, 0.6, 0.45]) {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (blob && blob.size <= MAX_PHOTO_BYTES) {
      return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
    }
  }
  throw new Error("too large");
}

export interface PhotoFieldLabels {
  label: string;
  hint: string;
  choose: string;
  change: string;
  remove: string;
  processing: string;
  preview: string;
  optional: string;
  errorSize: string;
  errorType: string;
}

/** Webcam capture (office desk). Omit to offer file upload only. */
export interface PhotoCameraLabels {
  open: string;
  capture: string;
  cancel: string;
  unavailable: string;
}

export function PhotoField({
  value,
  onChange,
  error,
  onError,
  labels,
  disabled,
  camera,
}: {
  value: File | null;
  onChange: (file: File | null) => void;
  error?: string;
  onError: (message: string | undefined) => void;
  labels: PhotoFieldLabels;
  disabled?: boolean;
  camera?: PhotoCameraLabels;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [processing, setProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cameraOn, setCameraOn] = useState(false);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  };
  useEffect(() => () => streamRef.current?.getTracks().forEach((t) => t.stop()), []);

  async function startCamera() {
    if (!camera) return;
    onError(undefined);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
      streamRef.current = stream;
      setCameraOn(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      });
    } catch {
      onError(camera.unavailable);
    }
  }

  /** Grabs a portrait (3:4) frame from the webcam and feeds it through the normal file path. */
  async function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const targetRatio = 3 / 4;
    let sw = video.videoWidth;
    let sh = video.videoHeight;
    if (sw / sh > targetRatio) sw = Math.round(sh * targetRatio);
    else sh = Math.round(sw / targetRatio);
    const canvas = document.createElement("canvas");
    canvas.width = sw;
    canvas.height = sh;
    canvas.getContext("2d")?.drawImage(video, (video.videoWidth - sw) / 2, (video.videoHeight - sh) / 2, sw, sh, 0, 0, sw, sh);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    stopCamera();
    if (blob) await handleFile(new File([blob], "camera.jpg", { type: "image/jpeg" }));
  }

  useEffect(() => {
    if (!value) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(value);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    onError(undefined);
    if (!(PHOTO_MIME_TYPES as readonly string[]).includes(file.type)) {
      onError(labels.errorType);
      return;
    }
    setProcessing(true);
    try {
      onChange(await shrinkImage(file));
    } catch (e) {
      onError(e instanceof Error && e.message === "too large" ? labels.errorSize : labels.errorType);
    } finally {
      setProcessing(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const describedBy = [`${id}-hint`, error ? `${id}-error` : null].filter(Boolean).join(" ");

  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium text-ink-secondary" id={`${id}-label`}>
        {labels.label} <span className="font-normal">({labels.optional})</span>
      </p>
      <div className="flex items-center gap-4">
        <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border-subtle bg-surface-muted">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- local object URL preview, never optimised
            <img src={previewUrl} alt={labels.preview} className="size-full object-cover" />
          ) : processing ? (
            <Loader2 aria-hidden="true" className="size-6 animate-spin text-ink-secondary" />
          ) : (
            <Camera aria-hidden="true" className="size-6 text-ink-secondary" />
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <label
            htmlFor={id}
            className="inline-flex min-h-tap cursor-pointer items-center gap-2 rounded-control border border-border-subtle bg-surface-card px-4 text-sm font-semibold text-ink hover:border-border-strong focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ojetil-red md:min-h-10"
          >
            {processing ? labels.processing : value ? labels.change : labels.choose}
            <input
              ref={inputRef}
              id={id}
              type="file"
              accept={PHOTO_MIME_TYPES.join(",")}
              className="sr-only"
              aria-labelledby={`${id}-label`}
              aria-describedby={describedBy}
              aria-invalid={error ? true : undefined}
              disabled={disabled || processing}
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </label>
          {camera && !cameraOn ? (
            <button
              type="button"
              onClick={() => void startCamera()}
              disabled={disabled || processing}
              className="inline-flex min-h-tap items-center gap-2 rounded-control border border-border-subtle bg-surface-card px-4 text-sm font-semibold text-ink hover:border-border-strong md:min-h-10"
            >
              <Video aria-hidden="true" className="size-4" />
              {camera.open}
            </button>
          ) : null}
          {value && !processing ? (
            <button
              type="button"
              onClick={() => onChange(null)}
              disabled={disabled}
              className="inline-flex min-h-tap items-center gap-1.5 rounded-control px-3 text-sm font-semibold text-status-rejected hover:bg-status-rejected-bg md:min-h-10"
            >
              <Trash2 aria-hidden="true" className="size-4" />
              {labels.remove}
            </button>
          ) : null}
        </div>
      </div>
      {camera && cameraOn ? (
        <div className="space-y-2 rounded-card border border-border-subtle bg-ink p-2">
          {/* Mirrored like a mirror for the person in front of it; the captured photo is not mirrored. */}
          <video ref={videoRef} playsInline muted aria-label={camera.open} className="mx-auto aspect-[3/4] max-h-80 rounded-control bg-black object-cover [transform:scaleX(-1)]" />
          <div className="flex justify-center gap-2">
            <button type="button" onClick={() => void capture()} className="inline-flex min-h-tap items-center gap-2 rounded-control bg-ojetil-red px-4 text-sm font-semibold text-white hover:bg-ojetil-red-hover md:min-h-10">
              <Camera aria-hidden="true" className="size-4" /> {camera.capture}
            </button>
            <button type="button" onClick={stopCamera} className="inline-flex min-h-tap items-center gap-2 rounded-control px-4 text-sm font-semibold text-paper hover:bg-paper/10 md:min-h-10">
              <X aria-hidden="true" className="size-4" /> {camera.cancel}
            </button>
          </div>
        </div>
      ) : null}
      <p id={`${id}-hint`} className="text-xs text-ink-secondary">
        {labels.hint}
      </p>
      <p id={`${id}-error`} aria-live="polite" className="min-h-0 text-sm text-status-rejected">
        {error ?? ""}
      </p>
    </div>
  );
}
