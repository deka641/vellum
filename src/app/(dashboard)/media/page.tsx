"use client";

import { useEffect, useState, useCallback } from "react";
import { Image as ImageIcon, Search, CheckSquare, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Topbar } from "@/components/dashboard/Topbar";
import { MediaGrid } from "@/components/media/MediaGrid";
import { MediaUploader } from "@/components/media/MediaUploader";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { Button } from "@/components/ui/Button/Button";
import { useToast } from "@/components/ui/Toast/Toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog/ConfirmDialog";
import styles from "./media-page.module.css";
import mediaStyles from "@/components/media/media.module.css";

interface MediaItem {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
  alt: string | null;
  width: number | null;
  height: number | null;
}

type MediaTypeFilter = "all" | "images" | "videos" | "documents";

export default function MediaPage() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<MediaTypeFilter>("all");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const { toast } = useToast();

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, typeFilter]);

  const fetchMedia = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (typeFilter !== "all") params.set("type", typeFilter);

      const res = await fetch(`/api/media?${params}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.media || []);
        setTotalPages(data.pages || 1);
        setTotal(data.total || 0);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, typeFilter]);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  function handleDelete(id: string) {
    setDeleteTarget(id);
  }

  async function confirmDeleteFile() {
    if (!deleteTarget) return;
    const res = await fetch(`/api/media/${deleteTarget}`, { method: "DELETE" });
    if (res.ok) {
      toast("File deleted");
      fetchMedia();
    } else {
      toast("Failed to delete file", "error");
    }
    setDeleteTarget(null);
  }

  function handleToggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    setConfirmBulkDelete(true);
  }

  async function confirmBulkDeleteFiles() {
    const ids = Array.from(selectedIds);
    try {
      const res = await fetch("/api/media/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (res.ok) {
        setSelectedIds(new Set());
        setSelectionMode(false);
        toast(`${ids.length} file(s) deleted`);
        fetchMedia();
      } else {
        toast("Failed to delete files", "error");
      }
    } catch {
      toast("Failed to delete files", "error");
    }
  }

  async function handleUpdateAlt(id: string, alt: string) {
    const res = await fetch(`/api/media/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alt }),
    });
    if (res.ok) {
      setItems((prev) => prev.map((m) => m.id === id ? { ...m, alt } : m));
      toast("Alt text updated");
    } else {
      toast("Failed to update alt text", "error");
    }
  }

  return (
    <>
      <Topbar title="Media Library" description="Upload and manage your files" />
      <div className={styles.content}>
        <MediaUploader
          onUpload={() => { fetchMedia(); }}
        />

        {loading && items.length === 0 ? (
          <div className={styles.loading}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} height={160} />
            ))}
          </div>
        ) : total === 0 && !debouncedSearch && typeFilter === "all" ? (
          <div className={styles.empty}>
            <div className={styles.emptyIconCircle}>
              <ImageIcon size={28} strokeWidth={1.5} />
            </div>
            <h3>No media yet</h3>
            <p>Upload images, videos, and documents to use across your sites</p>
          </div>
        ) : (
          <>
            <div className={styles.filterBar}>
              <div className={styles.searchWrap}>
                <Search size={16} className={styles.searchIcon} />
                <input
                  className={styles.searchInput}
                  type="text"
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className={styles.typeTabs}>
                {(["all", "images", "videos", "documents"] as const).map((t) => (
                  <button
                    key={t}
                    className={`${styles.typeTab} ${typeFilter === t ? styles.typeTabActive : ""}`}
                    onClick={() => setTypeFilter(t)}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
              <Button
                variant={selectionMode ? "primary" : "secondary"}
                size="sm"
                leftIcon={<CheckSquare size={14} />}
                onClick={() => {
                  setSelectionMode(!selectionMode);
                  setSelectedIds(new Set());
                }}
              >
                Select
              </Button>
            </div>
            <MediaGrid
              items={items}
              onDelete={handleDelete}
              onUpdateAlt={handleUpdateAlt}
              selectionMode={selectionMode}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
            />
            {totalPages > 1 && (
              <div className={styles.pagination}>
                <span className={styles.paginationInfo}>
                  {total} file{total !== 1 ? "s" : ""}
                </span>
                <div className={styles.paginationControls}>
                  <button
                    className={styles.paginationBtn}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className={styles.paginationPage}>
                    {page} / {totalPages}
                  </span>
                  <button
                    className={styles.paginationBtn}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
            {selectionMode && selectedIds.size > 0 && (
              <div className={mediaStyles.bulkBar}>
                <span className={mediaStyles.bulkBarCount}>{selectedIds.size} selected</span>
                <button className={mediaStyles.bulkBarBtn} onClick={handleBulkDelete}>
                  <Trash2 size={14} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
                  Delete selected
                </button>
                <button className={mediaStyles.bulkBarCancel} onClick={() => { setSelectionMode(false); setSelectedIds(new Set()); }}>
                  Cancel
                </button>
              </div>
            )}
          </>
        )}
      </div>
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete file"
        description="Are you sure you want to delete this file?"
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmDeleteFile}
      />
      <ConfirmDialog
        open={confirmBulkDelete}
        onOpenChange={setConfirmBulkDelete}
        title="Delete selected files"
        description={`Are you sure you want to delete ${selectedIds.size} selected file(s)?`}
        confirmLabel="Delete all"
        variant="danger"
        onConfirm={confirmBulkDeleteFiles}
      />
    </>
  );
}
