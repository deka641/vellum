"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, Save, Undo2, Redo2, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button/Button";
import { IconButton } from "@/components/ui/IconButton/IconButton";
import { Badge } from "@/components/ui/Badge/Badge";
import { useEditorStore } from "@/stores/editor-store";
import { useAutosave } from "@/hooks/use-autosave";
import styles from "./EditorToolbar.module.css";

interface EditorToolbarProps {
  siteId: string;
  pageStatus: "DRAFT" | "PUBLISHED";
  onPublish: () => void;
}

export function EditorToolbar({ siteId, pageStatus, onPublish }: EditorToolbarProps) {
  const router = useRouter();
  const { pageTitle, setPageTitle, isDirty, isSaving, saveError, undo, redo } =
    useEditorStore();
  const { save } = useAutosave();

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
        {isSaving && (
          <span className={styles.saveStatus}>
            <Loader2 size={14} className={styles.spinner} />
            Saving...
          </span>
        )}
        {!isSaving && saveError && (
          <span className={`${styles.saveStatus} ${styles.saveError}`}>
            <AlertCircle size={14} />
            Save failed
          </span>
        )}
        {!isSaving && !saveError && isDirty && (
          <span className={styles.saveStatus}>Unsaved changes</span>
        )}
        {!isSaving && !saveError && !isDirty && (
          <span className={styles.saveStatus}>Saved</span>
        )}
        <IconButton icon={<Undo2 />} label="Undo (Ctrl+Z)" onClick={undo} />
        <IconButton icon={<Redo2 />} label="Redo (Ctrl+Shift+Z)" onClick={redo} />
        <div className={styles.divider} />
        <IconButton
          icon={<Eye />}
          label="Preview"
          onClick={() => {
            const { pageId } = useEditorStore.getState();
            window.open(`/preview/${pageId}`, "_blank");
          }}
        />
        <Button size="sm" onClick={() => { save(); }}>
          <Save size={14} />
          Save
        </Button>
        <Button size="sm" onClick={onPublish}>
          {pageStatus === "PUBLISHED" ? "Update" : "Publish"}
        </Button>
      </div>
    </div>
  );
}
