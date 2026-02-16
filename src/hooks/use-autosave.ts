"use client";

import { useEffect, useCallback, useRef } from "react";
import { useEditorStore } from "@/stores/editor-store";

export function useAutosave() {
  const { blocks, pageId, pageTitle, isDirty, setDirty, setSaving } =
    useEditorStore();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const blocksRef = useRef(blocks);
  const titleRef = useRef(pageTitle);

  useEffect(() => {
    blocksRef.current = blocks;
    titleRef.current = pageTitle;
  }, [blocks, pageTitle]);

  const save = useCallback(async () => {
    if (!pageId) return;

    setSaving(true);
    try {
      await fetch(`/api/pages/${pageId}/blocks`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blocks: blocksRef.current,
          title: titleRef.current,
        }),
      });
      setDirty(false);
    } catch (err) {
      console.error("Autosave failed:", err);
    } finally {
      setSaving(false);
    }
  }, [pageId, setDirty, setSaving]);

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
