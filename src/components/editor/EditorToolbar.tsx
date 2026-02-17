"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, ExternalLink, Save, Undo2, Redo2, Loader2, AlertCircle, AlertTriangle, Monitor, Tablet, Smartphone, Check } from "lucide-react";
import { Button } from "@/components/ui/Button/Button";
import { IconButton } from "@/components/ui/IconButton/IconButton";
import { Badge } from "@/components/ui/Badge/Badge";
import { useEditorStore } from "@/stores/editor-store";
import { useAutosave } from "@/hooks/use-autosave";
import { KeyboardShortcutsDialog } from "./KeyboardShortcutsDialog";
import { SaveAsTemplateDialog } from "./SaveAsTemplateDialog";
import styles from "./EditorToolbar.module.css";

function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 10) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

function useRelativeTime(dateStr: string | null): string {
  const [text, setText] = useState(() => dateStr ? getRelativeTime(dateStr) : "");
  const update = useCallback(() => {
    if (dateStr) setText(getRelativeTime(dateStr));
  }, [dateStr]);

  useEffect(() => {
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, [update]);

  return text;
}

interface EditorToolbarProps {
  siteId: string;
  siteSlug: string;
  isHomepage: boolean;
  pageStatus: "DRAFT" | "PUBLISHED";
  onPublish: () => void;
}

export function EditorToolbar({ siteId, siteSlug, isHomepage, pageStatus, onPublish }: EditorToolbarProps) {
  const router = useRouter();
  const { pageTitle, pageSlug, setPageTitle, isDirty, isSaving, saveError, conflict, undo, redo, previewMode, setPreviewMode, lastSavedAt } =
    useEditorStore();
  const { save } = useAutosave();
  const hasConflict = conflict !== null;
  const relativeTime = useRelativeTime(lastSavedAt);

  return (
    <div className={styles.toolbar}>
      <div className={styles.left}>
        <IconButton
          icon={<ArrowLeft />}
          label="Back to site"
          onClick={() => router.push(`/sites/${siteId}`)}
        />
        <div className={styles.divider} />
        <input
          className={styles.titleInput}
          value={pageTitle}
          onChange={(e) => setPageTitle(e.target.value)}
          placeholder="Page title"
        />
        <Badge
          variant={pageStatus === "PUBLISHED" ? "success" : "default"}
          dot
        >
          {pageStatus === "PUBLISHED" ? "Published" : "Draft"}
        </Badge>
      </div>
      <div className={styles.right}>
        {hasConflict && (
          <span className={`${styles.saveStatus} ${styles.saveConflict}`}>
            <AlertTriangle size={14} />
            Conflict
          </span>
        )}
        {!hasConflict && isSaving && (
          <span className={styles.saveStatus}>
            <Loader2 size={14} className={styles.spinner} />
            Saving...
          </span>
        )}
        {!hasConflict && !isSaving && saveError && (
          <span className={`${styles.saveStatus} ${styles.saveError}`}>
            <AlertCircle size={14} />
            Save failed
          </span>
        )}
        {!hasConflict && !isSaving && !saveError && isDirty && (
          <span className={styles.saveStatus}>Unsaved changes</span>
        )}
        {!hasConflict && !isSaving && !saveError && !isDirty && (
          <span
            className={`${styles.saveStatus} ${styles.saveDone}`}
            title={lastSavedAt ? new Date(lastSavedAt).toLocaleString() : undefined}
          >
            <Check size={14} />
            Saved{relativeTime ? ` ${relativeTime}` : ""}
          </span>
        )}
        <IconButton icon={<Undo2 />} label="Undo (Ctrl+Z)" onClick={undo} />
        <IconButton icon={<Redo2 />} label="Redo (Ctrl+Shift+Z)" onClick={redo} />
        <KeyboardShortcutsDialog />
        <div className={styles.divider} />
        <div className={styles.previewToggle}>
          <button
            className={`${styles.previewBtn} ${previewMode === "desktop" ? styles.previewBtnActive : ""}`}
            onClick={() => setPreviewMode("desktop")}
            title="Desktop view"
          >
            <Monitor size={16} />
          </button>
          <button
            className={`${styles.previewBtn} ${previewMode === "tablet" ? styles.previewBtnActive : ""}`}
            onClick={() => setPreviewMode("tablet")}
            title="Tablet view"
          >
            <Tablet size={16} />
          </button>
          <button
            className={`${styles.previewBtn} ${previewMode === "mobile" ? styles.previewBtnActive : ""}`}
            onClick={() => setPreviewMode("mobile")}
            title="Mobile view"
          >
            <Smartphone size={16} />
          </button>
        </div>
        <div className={styles.divider} />
        <IconButton
          icon={<Eye />}
          label="Preview"
          onClick={() => {
            const { pageId } = useEditorStore.getState();
            window.open(`/preview/${pageId}`, "_blank");
          }}
        />
        {pageStatus === "PUBLISHED" && (
          <IconButton
            icon={<ExternalLink />}
            label="View published page"
            onClick={() => {
              const url = isHomepage ? `/s/${siteSlug}` : `/s/${siteSlug}/${pageSlug}`;
              window.open(url, "_blank");
            }}
          />
        )}
        <SaveAsTemplateDialog />
        <Button size="sm" onClick={() => { save(); }} disabled={hasConflict}>
          <Save size={14} />
          Save
        </Button>
        <Button size="sm" onClick={onPublish} disabled={hasConflict}>
          {pageStatus === "PUBLISHED" ? "Update" : "Publish"}
        </Button>
      </div>
    </div>
  );
}
