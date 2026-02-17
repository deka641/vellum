"use client";

import { useEffect, useCallback, useRef } from "react";
import { useEditorStore } from "@/stores/editor-store";
import { useToast } from "@/components/ui/Toast/Toast";

const MAX_RETRIES = 3;
const BASE_DELAY = 2000;

export function useAutosave() {
  const { blocks, pageId, pageTitle, isDirty, conflict, setDirty, setSaving, setSaveError, setLastSavedAt, setConflict } =
    useEditorStore();
  const { toast } = useToast();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const isSavingRef = useRef(false);
  const forceNextSaveRef = useRef(false);

  // Reset retry counter when user makes new edits
  useEffect(() => {
    if (isDirty) {
      retryCountRef.current = 0;
    }
  }, [isDirty, blocks, pageTitle]);

  const saveWithRetry = useCallback(async (): Promise<{ success: boolean; conflict?: boolean }> => {
    if (!pageId) return { success: false };

    // Read latest state directly from store — no stale refs
    const state = useEditorStore.getState();

    const body: Record<string, unknown> = {
      blocks: state.blocks,
      title: state.pageTitle,
    };

    // Send expectedUpdatedAt unless force-saving
    if (!forceNextSaveRef.current && state.lastSavedAt) {
      body.expectedUpdatedAt = state.lastSavedAt;
    }
    forceNextSaveRef.current = false;

    const res = await fetch(`/api/pages/${pageId}/blocks`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.status === 409) {
      const data = await res.json().catch(() => ({}));
      if (data.serverState) {
        setConflict({
          serverBlocks: data.serverState.blocks.map((b: { id: string; type: string; content: unknown; settings: unknown; parentId: string | null }) => ({
            id: b.id,
            type: b.type,
            content: b.content,
            settings: b.settings,
            parentId: b.parentId,
          })),
          serverTitle: data.serverState.title,
          serverUpdatedAt: data.serverState.updatedAt,
        });
      }
      return { success: false, conflict: true };
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Save failed (${res.status})`);
    }

    const data = await res.json();
    if (data.updatedAt) {
      setLastSavedAt(data.updatedAt);
    }

    return { success: true };
  }, [pageId, setConflict, setLastSavedAt]);

  const save = useCallback(async () => {
    if (!pageId || isSavingRef.current) return;

    isSavingRef.current = true;
    setSaving(true);

    // Snapshot what we're about to save
    const snapshotState = useEditorStore.getState();
    const snapshotBlocks = snapshotState.blocks;
    const snapshotTitle = snapshotState.pageTitle;

    for (let attempt = 0; attempt <= MAX_RETRIES - 1; attempt++) {
      try {
        const result = await saveWithRetry();

        if (result.conflict) {
          toast("This page was modified in another session", "info");
          isSavingRef.current = false;
          setSaving(false);
          return;
        }

        // Only clear dirty if store state hasn't diverged during save
        const currentState = useEditorStore.getState();
        if (currentState.blocks === snapshotBlocks && currentState.pageTitle === snapshotTitle) {
          setDirty(false);
        }
        setSaveError(null);
        retryCountRef.current = 0;
        isSavingRef.current = false;
        setSaving(false);
        return;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Save failed";

        if (attempt < MAX_RETRIES - 1) {
          const delay = Math.min(BASE_DELAY * Math.pow(2, attempt), 30000);
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

  const forceSave = useCallback(async () => {
    forceNextSaveRef.current = true;
    await save();
  }, [save]);

  useEffect(() => {
    if (!isDirty || conflict) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(save, 2000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isDirty, blocks, pageTitle, save, conflict]);

  return { save, forceSave };
}
