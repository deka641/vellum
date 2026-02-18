"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { useEditorStore, findBlockLocation } from "@/stores/editor-store";
import { useAutosave } from "@/hooks/use-autosave";
import { EditorToolbar } from "@/components/editor/EditorToolbar";
import { EditorCanvas } from "@/components/editor/EditorCanvas";
import { EditorSidebar } from "@/components/editor/EditorSidebar";
import { useToast } from "@/components/ui/Toast/Toast";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { Button } from "@/components/ui/Button/Button";
import { AlertCircle, RefreshCw } from "lucide-react";
import type { EditorBlock } from "@/types/blocks";
import styles from "./editor.module.css";

const ConflictBanner = dynamic(
  () => import("@/components/editor/ConflictBanner").then((m) => m.ConflictBanner),
  { ssr: false }
);
const PublishSuccessDialog = dynamic(
  () => import("@/components/editor/PublishSuccessDialog").then((m) => m.PublishSuccessDialog),
  { ssr: false }
);

export default function EditorPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<"not-found" | "server-error" | null>(null);
  const [siteId, setSiteId] = useState("");
  const [siteSlug, setSiteSlug] = useState("");
  const [isHomepage, setIsHomepage] = useState(false);
  const [pageStatus, setPageStatus] = useState<"DRAFT" | "PUBLISHED">("DRAFT");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const { setPage, addBlock, isDirty, pageSlug } = useEditorStore();
  const { save, forceSave } = useAutosave();

  const loadPage = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/pages/${params.pageId}`);
      if (!res.ok) {
        setLoadError(res.status === 404 ? "not-found" : "server-error");
        return;
      }
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

      setPage(data.id, data.title, blocks, data.updatedAt, data.description, data.slug, {
        metaTitle: data.metaTitle,
        ogImage: data.ogImage,
        noindex: data.noindex,
      });
    } catch {
      setLoadError("server-error");
    } finally {
      setLoading(false);
    }
  }, [params.pageId, setPage]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

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
        const state = useEditorStore.getState();
        if (!state.selectedBlockId) return;
        const loc = findBlockLocation(state.blocks, state.selectedBlockId);
        if (!loc) return;
        e.preventDefault();
        if (loc.level === "top") {
          if (e.key === "ArrowUp" && loc.index > 0) {
            state.moveBlock(loc.index, loc.index - 1);
          } else if (e.key === "ArrowDown" && loc.index < state.blocks.length - 1) {
            state.moveBlock(loc.index, loc.index + 1);
          }
        } else {
          const cols = (state.blocks.find((b) => b.id === loc.parentId)?.content as import("@/types/blocks").ColumnsContent)?.columns;
          if (!cols) return;
          const colBlocks = cols[loc.colIndex].blocks;
          if (e.key === "ArrowUp" && loc.index > 0) {
            state.moveBlockInColumn(loc.parentId, loc.colIndex, loc.index, loc.index - 1);
          } else if (e.key === "ArrowDown" && loc.index < colBlocks.length - 1) {
            state.moveBlockInColumn(loc.parentId, loc.colIndex, loc.index, loc.index + 1);
          }
        }
      }
      if (e.key === "Escape") {
        useEditorStore.getState().selectBlock(null);
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        const target = e.target as HTMLElement;
        const isEditing =
          target.isContentEditable ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.closest(".tiptap");
        const state = useEditorStore.getState();
        if (state.selectedBlockId && !isEditing) {
          e.preventDefault();
          const loc = findBlockLocation(state.blocks, state.selectedBlockId);
          if (!loc) return;
          if (loc.level === "top") {
            state.removeBlock(state.selectedBlockId);
          } else {
            state.removeBlockFromColumn(loc.parentId, state.selectedBlockId);
          }
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
        setPublishDialogOpen(true);
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

  if (loadError) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorCard}>
          <div className={styles.errorIcon}>
            <AlertCircle size={32} />
          </div>
          {loadError === "not-found" ? (
            <>
              <h2 className={styles.errorTitle}>Page not found</h2>
              <p className={styles.errorText}>
                This page may have been deleted or you don&apos;t have access to it.
              </p>
              <Button onClick={() => router.push("/sites")}>
                Back to sites
              </Button>
            </>
          ) : (
            <>
              <h2 className={styles.errorTitle}>Failed to load page</h2>
              <p className={styles.errorText}>
                Something went wrong while loading this page. Please try again.
              </p>
              <div className={styles.errorActions}>
                <Button onClick={loadPage} leftIcon={<RefreshCw size={16} />}>
                  Try again
                </Button>
                <Button variant="ghost" onClick={() => router.push("/sites")}>
                  Back to sites
                </Button>
              </div>
            </>
          )}
        </div>
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
      <PublishSuccessDialog
        open={publishDialogOpen}
        onOpenChange={setPublishDialogOpen}
        pageUrl={
          typeof window !== "undefined"
            ? `${window.location.origin}${isHomepage ? `/s/${siteSlug}` : `/s/${siteSlug}/${pageSlug}`}`
            : ""
        }
      />
    </div>
  );
}
