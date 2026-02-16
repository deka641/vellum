"use client";

import { useEffect, useCallback, useRef } from "react";
import { useEditorStore } from "@/stores/editor-store";
import { useToast } from "@/components/ui/Toast/Toast";

const MAX_RETRIES = 3;
const BASE_DELAY = 2000;

export function useAutosave() {
  const { blocks, pageId, pageTitle, isDirty, setDirty, setSaving, setSaveError } =
    useEditorStore();
  const { toast } = useToast();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const blocksRef = useRef(blocks);
  const titleRef = useRef(pageTitle);
  const retryCountRef = useRef(0);
  const isSavingRef = useRef(false);

  useEffect(() => {
    blocksRef.current = blocks;
    titleRef.current = pageTitle;
  }, [blocks, pageTitle]);

  // Reset retry counter when user makes new edits
  useEffect(() => {
    if (isDirty) {
      retryCountRef.current = 0;
    }
  }, [isDirty, blocks, pageTitle]);

  const saveWithRetry = useCallback(async (): Promise<boolean> => {
    if (!pageId) return false;

    const res = await fetch(`/api/pages/${pageId}/blocks`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        blocks: blocksRef.current,
        title: titleRef.current,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Save failed (${res.status})`);
    }

    return true;
  }, [pageId]);

  const save = useCallback(async () => {
    if (!pageId || isSavingRef.current) return;

    isSavingRef.current = true;
    setSaving(true);

    for (let attempt = 0; attempt <= MAX_RETRIES - 1; attempt++) {
      try {
        await saveWithRetry();
        setDirty(false);
        setSaveError(null);
        retryCountRef.current = 0;
        isSavingRef.current = false;
        setSaving(false);
        return;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Save failed";

        if (attempt < MAX_RETRIES - 1) {
          const delay = BASE_DELAY * Math.pow(2, attempt);
          toast(`Save failed, retrying... (${attempt + 2}/${MAX_RETRIES})`, "info");
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          toast(`Unable to save: ${message}`, "error");
          setSaveError(message);
        }
      }
    }

    isSavingRef.current = false;
    setSaving(false);
  }, [pageId, saveWithRetry, setDirty, setSaving, setSaveError, toast]);

  useEffect(() => {
    if (!isDirty) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(save, 2000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isDirty, blocks, pageTitle, save]);

  return { save };
}
