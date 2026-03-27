"use client";

import { useEffect } from "react";

interface PageViewTrackerProps {
  siteId: string;
  pageId?: string;
  path: string;
}

export function PageViewTracker({ siteId, pageId, path }: PageViewTrackerProps) {
  useEffect(() => {
    // Don't track in development
    if (process.env.NODE_ENV === "development") return;

    const controller = new AbortController();

    fetch("/api/analytics/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        siteId,
        pageId,
        path,
        referrer: document.referrer || undefined,
      }),
      signal: controller.signal,
    }).catch(() => {
      // Fire-and-forget: silently ignore failures
    });

    return () => controller.abort();
  }, [siteId, pageId, path]);

  return null;
}
