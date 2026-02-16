"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useEditorStore } from "@/stores/editor-store";
import { useAutosave } from "@/hooks/use-autosave";
import { EditorToolbar } from "@/components/editor/EditorToolbar";
import { EditorCanvas } from "@/components/editor/EditorCanvas";
import { EditorSidebar } from "@/components/editor/EditorSidebar";
import { useToast } from "@/components/ui/Toast/Toast";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import type { EditorBlock } from "@/types/blocks";
import styles from "./editor.module.css";

export default function EditorPage() {
  const params = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [siteId, setSiteId] = useState("");
  const [pageStatus, setPageStatus] = useState<"DRAFT" | "PUBLISHED">("DRAFT");
  const { setPage, addBlock, isDirty } = useEditorStore();
  const { save } = useAutosave();

  useEffect(() => {
    async function loadPage() {
      try {
        const res = await fetch(`/api/pages/${params.pageId}`);
        if (!res.ok) throw new Error("Failed to load page");
        const data = await res.json();

        setSiteId(data.site.id);
        setPageStatus(data.status);

        const blocks: EditorBlock[] = data.blocks.map(
          (b: { id: string; type: string; content: unknown; settings: unknown; parentId: string | null }) => ({
            id: b.id,
            type: b.type,
            content: b.content,
            settings: b.settings,
            parentId: b.parentId,
          })
        );

        setPage(data.id, data.title, blocks);
      } catch {
        toast("Failed to load page", "error");
      } finally {
        setLoading(false);
      }
    }
    loadPage();
  }, [params.pageId, setPage, toast]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        save();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          useEditorStore.getState().redo();
        } else {
          useEditorStore.getState().undo();
        }
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        const { selectedBlockId, removeBlock } = useEditorStore.getState();
        const target = e.target as HTMLElement;
        const isEditing =
          target.isContentEditable ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.closest(".tiptap");
        if (selectedBlockId && !isEditing) {
          e.preventDefault();
          removeBlock(selectedBlockId);
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [save]);

  // Warn before closing tab with unsaved changes
  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const handlePublish = useCallback(async () => {
    await save();
    try {
      const res = await fetch(`/api/pages/${params.pageId}/publish`, {
        method: "POST",
      });
      if (res.ok) {
        setPageStatus("PUBLISHED");
        toast("Page published!");
      } else {
        toast("Failed to publish", "error");
      }
    } catch {
      toast("Something went wrong", "error");
    }
  }, [params.pageId, save, toast]);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Skeleton height={56} />
        <Skeleton height={600} />
      </div>
    );
  }

  return (
    <div className={styles.editor}>
      <EditorToolbar
        siteId={siteId}
        pageStatus={pageStatus}
        onPublish={handlePublish}
      />
      <div className={styles.body}>
        <EditorCanvas onAddBlock={() => addBlock("text")} />
        <EditorSidebar />
      </div>
    </div>
  );
}
