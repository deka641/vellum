"use client";

import { useState, useEffect, useCallback } from "react";
import { History, RotateCcw, GitCompare, X } from "lucide-react";
import { useEditorStore } from "@/stores/editor-store";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog/ConfirmDialog";
import { Button } from "@/components/ui/Button/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/Dropdown/Dropdown";
import { useToast } from "@/components/ui/Toast/Toast";
import type { EditorBlock } from "@/types/blocks";
import styles from "./RevisionHistory.module.css";

interface Revision {
  id: string;
  title: string;
  note: string | null;
  createdAt: string;
}

interface DiffBlock {
  id: string;
  type: string;
  status: "added" | "removed" | "changed" | "unchanged";
  currentSummary?: string;
  revisionSummary?: string;
}

function getBlockSummary(block: EditorBlock): string {
  const c = block.content as Record<string, unknown>;
  switch (block.type) {
    case "heading": return (c.text as string) || "(empty heading)";
    case "text": {
      const html = (c.html as string) || "";
      const text = html.replace(/<[^>]*>/g, "").trim();
      return text.length > 80 ? text.slice(0, 80) + "\u2026" : text || "(empty text)";
    }
    case "image": return (c.alt as string) || (c.src as string) || "(image)";
    case "button": return (c.text as string) || "(button)";
    case "quote": return (c.text as string) || "(quote)";
    case "form": return `Form (${((c.fields as unknown[]) || []).length} fields)`;
    case "accordion": return `Accordion (${((c.items as unknown[]) || []).length} items)`;
    case "table": return `Table (${((c.rows as unknown[]) || []).length} rows)`;
    case "code": return `Code (${(c.displayMode as string) || "embed"})`;
    case "columns": return `Columns (${((c.columns as unknown[]) || []).length})`;
    default: return block.type;
  }
}

function computeDiff(currentBlocks: EditorBlock[], revisionBlocks: EditorBlock[]): DiffBlock[] {
  const revMap = new Map(revisionBlocks.map((b) => [b.id, b]));
  const _curMap = new Map(currentBlocks.map((b) => [b.id, b]));
  const result: DiffBlock[] = [];
  const seen = new Set<string>();

  // Walk current blocks
  for (const cur of currentBlocks) {
    seen.add(cur.id);
    const rev = revMap.get(cur.id);
    if (!rev) {
      result.push({ id: cur.id, type: cur.type, status: "added", currentSummary: getBlockSummary(cur) });
    } else if (JSON.stringify(cur.content) !== JSON.stringify(rev.content)) {
      result.push({ id: cur.id, type: cur.type, status: "changed", currentSummary: getBlockSummary(cur), revisionSummary: getBlockSummary(rev) });
    } else {
      result.push({ id: cur.id, type: cur.type, status: "unchanged", currentSummary: getBlockSummary(cur) });
    }
  }

  // Blocks in revision but not in current
  for (const rev of revisionBlocks) {
    if (!seen.has(rev.id)) {
      result.push({ id: rev.id, type: rev.type, status: "removed", revisionSummary: getBlockSummary(rev) });
    }
  }

  return result;
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
  const [confirmMode, setConfirmMode] = useState<"all" | "blocks" | "title">("all");
  const [diffRevisionId, setDiffRevisionId] = useState<string | null>(null);
  const [diffBlocks, setDiffBlocks] = useState<DiffBlock[] | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);
  const [diffError, setDiffError] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareBaseId, setCompareBaseId] = useState<string | null>(null);

  const { toast } = useToast();
  const currentBlocks = useEditorStore((s) => s.blocks);
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
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fields: confirmMode === "all" ? undefined : [confirmMode] }),
        }
      );
      if (!res.ok) {
        throw new Error("Failed to restore revision");
      }
      const data = await res.json();

      // Update the editor store with restored data
      if (confirmMode === "all" || confirmMode === "blocks") {
        const blocks: EditorBlock[] = data.blocks.map((b: Record<string, unknown>) => ({
          id: b.id,
          type: b.type,
          content: b.content,
          settings: b.settings || {},
          parentId: b.parentId || null,
        }));
        setBlocks(blocks);
      }
      if (confirmMode === "all" || confirmMode === "title") {
        setPageTitle(data.title);
      }
      setDirty(true);
      setBlocksDirty(true);
      toast("Revision restored successfully");
    } catch (err) {
      console.error("Failed to restore revision:", err);
      toast("Failed to restore revision. Please try again.", "error");
    } finally {
      setRestoring(false);
      setConfirmRevisionId(null);
      setConfirmMode("all");
    }
  }

  async function handleCompare(revisionId: string) {
    if (compareMode) {
      handleCompareRevisionClick(revisionId);
      return;
    }
    if (diffRevisionId === revisionId) {
      setDiffRevisionId(null);
      setDiffBlocks(null);
      return;
    }
    setDiffRevisionId(revisionId);
    setDiffLoading(true);
    setDiffError(null);
    setDiffBlocks(null);
    try {
      const res = await fetch(`/api/pages/${pageId}/revisions?revisionId=${revisionId}`);
      if (!res.ok) throw new Error("Failed to load revision");
      const rev = await res.json() as { id: string; blocks?: EditorBlock[] };
      if (Array.isArray(rev.blocks)) {
        setDiffBlocks(computeDiff(currentBlocks, rev.blocks as EditorBlock[]));
      }
    } catch {
      setDiffBlocks(null);
      setDiffError("Failed to load revision data for comparison");
    } finally {
      setDiffLoading(false);
    }
  }

  async function handleCompareRevisionClick(revisionId: string) {
    if (!compareBaseId) {
      setCompareBaseId(revisionId);
      return;
    }
    if (compareBaseId === revisionId) {
      setCompareBaseId(null);
      return;
    }

    const idA = compareBaseId;
    const idB = revisionId;
    setDiffLoading(true);
    setDiffError(null);
    setDiffBlocks(null);

    try {
      const [resA, resB] = await Promise.all([
        fetch(`/api/pages/${pageId}/revisions?revisionId=${idA}`),
        fetch(`/api/pages/${pageId}/revisions?revisionId=${idB}`),
      ]);
      if (!resA.ok || !resB.ok) throw new Error("Failed to load revisions");
      const revA = await resA.json() as { id: string; blocks?: EditorBlock[]; createdAt: string };
      const revB = await resB.json() as { id: string; blocks?: EditorBlock[]; createdAt: string };

      const aTime = new Date(revA.createdAt).getTime();
      const bTime = new Date(revB.createdAt).getTime();
      const older = aTime <= bTime ? revA : revB;
      const newer = aTime <= bTime ? revB : revA;

      if (Array.isArray(newer.blocks) && Array.isArray(older.blocks)) {
        setDiffBlocks(computeDiff(newer.blocks as EditorBlock[], older.blocks as EditorBlock[]));
        setDiffRevisionId(`${older.id}:${newer.id}`);
      }
    } catch {
      setDiffBlocks(null);
      setDiffError("Failed to load revision data for comparison");
    } finally {
      setDiffLoading(false);
      setCompareMode(false);
      setCompareBaseId(null);
    }
  }

  function exitCompareMode() {
    setCompareMode(false);
    setCompareBaseId(null);
    setDiffRevisionId(null);
    setDiffBlocks(null);
    setDiffError(null);
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

  const compareRevisionIds = diffRevisionId?.includes(":") ? diffRevisionId.split(":") : null;
  const olderCompareRevision = compareRevisionIds ? revisions.find((r) => r.id === compareRevisionIds[0]) : null;
  const newerCompareRevision = compareRevisionIds ? revisions.find((r) => r.id === compareRevisionIds[1]) : null;

  return (
    <div className={styles.container}>
      {revisions.length >= 2 && (
        <div className={styles.compareModeBar}>
          {compareMode ? (
            <>
              <span className={styles.compareModeText}>
                {compareBaseId ? "Select the second revision to compare" : "Select the first revision to compare"}
              </span>
              <Button variant="ghost" size="sm" onClick={exitCompareMode}>
                Cancel
              </Button>
            </>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<GitCompare size={14} />}
              onClick={() => {
                setCompareMode(true);
                setCompareBaseId(null);
                setDiffRevisionId(null);
                setDiffBlocks(null);
              }}
            >
              Compare revisions
            </Button>
          )}
        </div>
      )}
      <div className={styles.list}>
        {revisions.map((rev) => {
          const isCompareSelected = compareMode && compareBaseId === rev.id;
          return (
          <div key={rev.id}>
            <div className={`${styles.item} ${isCompareSelected ? styles.itemSelected : ""}`}>
              <div className={styles.itemInfo}>
                <span className={styles.itemTitle}>{rev.title}</span>
                <div className={styles.itemMeta}>
                  <span>{formatRelativeTime(rev.createdAt)}</span>
                  {rev.note && (
                    <span className={styles.itemNote}>{rev.note}</span>
                  )}
                </div>
              </div>
              <div className={styles.itemActions}>
                <button
                  className={`${styles.compareButton} ${diffRevisionId === rev.id || isCompareSelected ? styles.compareButtonActive : ""}`}
                  onClick={() => handleCompare(rev.id)}
                  disabled={diffLoading}
                  title={compareMode ? (isCompareSelected ? "Deselect" : "Select for comparison") : "Compare with current"}
                >
                  {diffRevisionId === rev.id && !compareMode ? <X size={12} /> : <GitCompare size={12} />}
                </button>
                {!compareMode && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={styles.restoreButton}
                      disabled={restoring}
                    >
                      <RotateCcw size={12} />
                      {" "}Restore
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => { setConfirmMode("all"); setConfirmRevisionId(rev.id); }}>
                      Restore all
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setConfirmMode("blocks"); setConfirmRevisionId(rev.id); }}>
                      Restore blocks only
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setConfirmMode("title"); setConfirmRevisionId(rev.id); }}>
                      Restore title only
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                )}
              </div>
            </div>
            {diffRevisionId === rev.id && diffBlocks && (
              <div className={styles.diffPanel}>
                <div className={styles.diffHeader}>Changes since this revision</div>
                {diffBlocks.filter((d) => d.status !== "unchanged").length === 0 ? (
                  <div className={styles.diffEmpty}>No changes detected</div>
                ) : (
                  <div className={styles.diffList}>
                    {diffBlocks.filter((d) => d.status !== "unchanged").map((d) => (
                      <div key={d.id} className={`${styles.diffItem} ${styles[`diff-${d.status}`]}`}>
                        <span className={styles.diffBadge}>{d.status}</span>
                        <span className={styles.diffType}>{d.type}</span>
                        <span className={styles.diffSummary}>
                          {d.status === "changed" ? d.revisionSummary : d.currentSummary || d.revisionSummary}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {diffRevisionId === rev.id && diffError && !diffLoading && (
              <div className={styles.diffPanel}>
                <div className={styles.diffEmpty}>{diffError}</div>
              </div>
            )}
            {diffRevisionId === rev.id && diffLoading && (
              <div className={styles.diffPanel}>
                <Skeleton height={60} />
              </div>
            )}
          </div>
          );
        })}
      </div>
      {compareRevisionIds && diffBlocks && (
        <div className={styles.diffPanel}>
          <div className={styles.diffHeader}>
            {olderCompareRevision
              ? `Older: "${olderCompareRevision.title}" (${formatRelativeTime(olderCompareRevision.createdAt)})`
              : "Older revision"}{" "}
            vs{" "}
            {newerCompareRevision
              ? `Newer: "${newerCompareRevision.title}" (${formatRelativeTime(newerCompareRevision.createdAt)})`
              : "Newer revision"}
          </div>
          {diffBlocks.filter((d) => d.status !== "unchanged").length === 0 ? (
            <div className={styles.diffEmpty}>No changes detected between revisions</div>
          ) : (
            <div className={styles.diffList}>
              {diffBlocks.filter((d) => d.status !== "unchanged").map((d) => (
                <div key={d.id} className={`${styles.diffItem} ${styles[`diff-${d.status}`]}`}>
                  <span className={styles.diffBadge}>{d.status}</span>
                  <span className={styles.diffType}>{d.type}</span>
                  <span className={styles.diffSummary}>
                    {d.status === "changed" ? d.revisionSummary : d.currentSummary || d.revisionSummary}
                  </span>
                </div>
              ))}
            </div>
          )}
          <button className={styles.compareDismiss} onClick={() => { setDiffRevisionId(null); setDiffBlocks(null); }}>
            Dismiss
          </button>
        </div>
      )}
      {compareRevisionIds && diffError && !diffLoading && (
        <div className={styles.diffPanel}>
          <div className={styles.diffEmpty}>{diffError}</div>
        </div>
      )}
      {compareRevisionIds && diffLoading && (
        <div className={styles.diffPanel}>
          <Skeleton height={60} />
        </div>
      )}

      <ConfirmDialog
        open={confirmRevisionId !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmRevisionId(null);
        }}
        title={`Restore ${confirmMode === "all" ? "revision" : confirmMode === "blocks" ? "blocks only" : "title only"}?`}
        description={confirmMode === "all"
          ? "This will replace the current page content with the selected revision. Any unsaved changes will be lost."
          : confirmMode === "blocks"
            ? "This will replace the current blocks with blocks from the selected revision. The page title will not be changed."
            : "This will replace the current page title with the title from the selected revision. Blocks will not be changed."
        }
        confirmLabel="Restore"
        variant="default"
        onConfirm={handleRestore}
        loading={restoring}
      />
    </div>
  );
}
