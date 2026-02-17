"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useEditorStore } from "@/stores/editor-store";
import { useAutosave } from "@/hooks/use-autosave";
import { EditorToolbar } from "@/components/editor/EditorToolbar";
import { EditorCanvas } from "@/components/editor/EditorCanvas";
import { EditorSidebar } from "@/components/editor/EditorSidebar";
import { ConflictBanner } from "@/components/editor/ConflictBanner";
import { useToast } from "@/components/ui/Toast/Toast";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import type { EditorBlock } from "@/types/blocks";
import styles from "./editor.module.css";

export default function EditorPage() {
  const params = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [siteId, setSiteId] = useState("");
  const [siteSlug, setSiteSlug] = useState("");
  const [isHomepage, setIsHomepage] = useState(false);
  const [pageStatus, setPageStatus] = useState<"DRAFT" | "PUBLISHED">("DRAFT");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { setPage, addBlock, isDirty, pageSlug } = useEditorStore();
  const { save, forceSave } = useAutosave();

  useEffect(() => {
    async function loadPage() {
      try {
        const res = await fetch(`/api/pages/${params.pageId}`);
        if (!res.ok) throw new Error("Failed to load page");
        const data = await res.json();

        setSiteId(data.site.id);
        setSiteSlug(data.site.slug);
        setIsHomepage(data.isHomepage);
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

        setPage(data.id, data.title, blocks, data.updatedAt, data.description, data.slug);
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
      if ((e.metaKey || e.ctrlKey) && e.key === "d") {
        e.preventDefault();
        const { selectedBlockId, duplicateBlock } = useEditorStore.getState();
        if (selectedBlockId) {
          duplicateBlock(selectedBlockId);
        }
      }
      if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
        const target = e.target as HTMLElement;
        const isEditing =
          target.isContentEditable ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.closest(".tiptap");
        if (isEditing) return;
        const { selectedBlockId, blocks, moveBlock } = useEditorStore.getState();
        if (!selectedBlockId) return;
        const index = blocks.findIndex((b) => b.id === selectedBlockId);
        if (index === -1) return;
        e.preventDefault();
        if (e.key === "ArrowUp" && index > 0) {
          moveBlock(index, index - 1);
        } else if (e.key === "ArrowDown" && index < blocks.length - 1) {
          moveBlock(index, index + 1);
        }
      }
      if (e.key === "Escape") {
        useEditorStore.getState().selectBlock(null);
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
        const data = await res.json();
        setPageStatus("PUBLISHED");
        if (data.updatedAt) {
          useEditorStore.getState().setLastSavedAt(data.updatedAt);
        }
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
        siteSlug={siteSlug}
        isHomepage={isHomepage}
        pageStatus={pageStatus}
        onPublish={handlePublish}
      />
      <ConflictBanner onForceSave={forceSave} />
      <div className={styles.body}>
        <EditorCanvas onAddBlock={() => addBlock("text")} />
        <EditorSidebar
          mobileOpen={sidebarOpen}
          onMobileToggle={() => setSidebarOpen((o) => !o)}
        />
      </div>
    </div>
  );
}
