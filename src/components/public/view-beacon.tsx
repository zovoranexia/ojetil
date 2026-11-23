"use client";

import { useEffect } from "react";

/**
 * Counts one read per article per browser session, after the reader has had
 * the page open for a few seconds (so bounces and prefetches don't count).
 * Sends only the slug; no cookie or identifier.
 */
export function ViewBeacon({ slug }: { slug: string }) {
  useEffect(() => {
    const key = `ojetil-read:${slug}`;
    try {
      if (sessionStorage.getItem(key)) return;
    } catch {
      // Storage blocked (private mode): still count, the server de-duplicates.
    }
    const timer = window.setTimeout(() => {
      try {
        sessionStorage.setItem(key, "1");
      } catch {
        /* ignore */
      }
      const body = new Blob([slug], { type: "text/plain" });
      if (!navigator.sendBeacon?.("/api/news/view", body)) {
        void fetch("/api/news/view", { method: "POST", body: slug, keepalive: true }).catch(() => undefined);
      }
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [slug]);
  return null;
}
