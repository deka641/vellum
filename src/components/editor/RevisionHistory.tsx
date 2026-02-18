"use client";

import { useState, useEffect, useCallback } from "react";
import { History, RotateCcw } from "lucide-react";
import { useEditorStore } from "@/stores/editor-store";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog/ConfirmDialog";
import { Button } from "@/components/ui/Button/Button";
import type { EditorBlock } from "@/types/blocks";
import styles from "./RevisionHistory.module.css";

interface Revision {
  id: string;
  title: string;
  note: string | null;
  createdAt: string;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

interface RevisionHistoryProps {
  pageId: string;
}

export function RevisionHistory({ pageId }: RevisionHistoryProps) {
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [confirmRevisionId, setConfirmRevisionId] = useState<string | null>(null);

  const setBlocks = useEditorStore((s) => s.setBlocks);
  const setPageTitle = useEditorStore((s) => s.setPageTitle);
  const setDirty = useEditorStore((s) => s.setDirty);
  const setBlocksDirty = useEditorStore((s) => s.setBlocksDirty);

  const fetchRevisions = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`/api/pages/${pageId}/revisions`);
      if (!res.ok) {
        throw new Error("Failed to load revisions");
      }
      const data = await res.json();
      setRevisions(data);
    } catch (err) {
      console.error("Failed to fetch revisions:", err);
      setFetchError("Failed to load revision history");
    } finally {
      setLoading(false);
    }
  }, [pageId]);

  useEffect(() => {
    fetchRevisions();
  }, [fetchRevisions]);

  async function handleRestore() {
    if (!confirmRevisionId) return;

    setRestoring(true);
    try {
      const res = await fetch(
        `/api/pages/${pageId}/revisions/${confirmRevisionId}/restore`,
        { method: "POST" }
      );
      if (!res.ok) {
        throw new Error("Failed to restore revision");
      }
      const data = await res.json();

      // Update the editor store with restored data
      const blocks: EditorBlock[] = data.blocks.map((b: Record<string, unknown>) => ({
        id: b.id,
        type: b.type,
        content: b.content,
        settings: b.settings || {},
        parentId: b.parentId || null,
      }));

      setBlocks(blocks);
      setPageTitle(data.title);
      setDirty(true);
      setBlocksDirty(true);
    } catch (err) {
      console.error("Failed to restore revision:", err);
    } finally {
      setRestoring(false);
      setConfirmRevisionId(null);
    }
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} height={52} />
        ))}
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className={styles.error}>
        <p className={styles.errorText}>{fetchError}</p>
        <Button variant="secondary" size="sm" onClick={fetchRevisions}>
          Retry
        </Button>
      </div>
    );
  }

  if (revisions.length === 0) {
    return (
      <div className={styles.empty}>
        <History size={32} className={styles.emptyIcon} />
        <p className={styles.emptyTitle}>No revisions yet</p>
        <p className={styles.emptyDescription}>
          Revisions are created each time you publish a page. Publish your page to create the first snapshot.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.list}>
        {revisions.map((rev) => (
          <div key={rev.id} className={styles.item}>
            <div className={styles.itemInfo}>
              <span className={styles.itemTitle}>{rev.title}</span>
              <div className={styles.itemMeta}>
                <span>{formatRelativeTime(rev.createdAt)}</span>
                {rev.note && (
                  <span className={styles.itemNote}>{rev.note}</span>
                )}
              </div>
            </div>
            <button
              className={styles.restoreButton}
              onClick={() => setConfirmRevisionId(rev.id)}
              disabled={restoring}
            >
              <RotateCcw size={12} />
              {" "}Restore
            </button>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={confirmRevisionId !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmRevisionId(null);
        }}
        title="Restore revision?"
        description="This will replace the current page content with the selected revision. Any unsaved changes will be lost."
        confirmLabel="Restore"
        variant="default"
        onConfirm={handleRestore}
        loading={restoring}
      />
    </div>
  );
}
