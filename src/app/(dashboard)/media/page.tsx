"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, CheckSquare, Trash2, ChevronLeft, ChevronRight, AlertCircle, RefreshCw, FolderOpen, Plus, Folder, Upload } from "lucide-react";
import { Topbar } from "@/components/dashboard/Topbar";
import { MediaGrid } from "@/components/media/MediaGrid";
import { MediaUploader } from "@/components/media/MediaUploader";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { Button } from "@/components/ui/Button/Button";
import { EmptyState } from "@/components/dashboard/EmptyState";
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
  folder: string | null;
}

type MediaTypeFilter = "all" | "images" | "videos" | "documents";

export default function MediaPage() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<MediaTypeFilter>("all");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState("date-desc");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [folders, setFolders] = useState<string[]>([]);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [uploadFolder, setUploadFolder] = useState<string | null>(null);
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
  }, [debouncedSearch, typeFilter, sortBy, activeFolder]);

  const fetchMedia = useCallback(async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (activeFolder !== null) params.set("folder", activeFolder);
      const [sortField, sortOrder] = sortBy.split("-");
      if (sortField && sortField !== "date") params.set("sort", sortField);
      if (sortOrder === "asc") params.set("order", "asc");

      const res = await fetch(`/api/media?${params}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.media || []);
        setTotalPages(data.pages || 1);
        setTotal(data.total || 0);
        setFolders(data.folders || []);
      } else {
        setFetchError(true);
      }
    } catch (e) {
      console.error("Failed to fetch media:", e);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, typeFilter, sortBy, activeFolder]);

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

  function handleCreateFolder() {
    const name = newFolderName.trim();
    if (!name) return;
    if (folders.includes(name)) {
      toast("Folder already exists", "error");
      return;
    }
    setFolders((prev) => [...prev, name].sort());
    setActiveFolder(name);
    setUploadFolder(name);
    setNewFolderName("");
    setShowNewFolder(false);
  }

  async function handleMoveToFolder(id: string, folder: string | null) {
    const res = await fetch(`/api/media/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folder }),
    });
    if (res.ok) {
      toast(folder ? `Moved to ${folder}` : "Moved to unfiled");
      fetchMedia();
    } else {
      toast("Failed to move file", "error");
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
      <div className={styles.pageLayout}>
        <aside className={styles.folderSidebar}>
          <div className={styles.folderHeader}>
            <span className={styles.folderTitle}>Folders</span>
            <button
              className={styles.folderAddBtn}
              onClick={() => setShowNewFolder(!showNewFolder)}
              title="New folder"
            >
              <Plus size={14} />
            </button>
          </div>
          {showNewFolder && (
            <div className={styles.newFolderRow}>
              <input
                className={styles.newFolderInput}
                type="text"
                placeholder="Folder name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleCreateFolder(); }}
                maxLength={100}
                autoFocus
              />
              <Button variant="primary" size="sm" onClick={handleCreateFolder}>
                Add
              </Button>
            </div>
          )}
          <button
            className={`${styles.folderItem} ${activeFolder === null ? styles.folderItemActive : ""}`}
            onClick={() => { setActiveFolder(null); setUploadFolder(null); }}
          >
            <FolderOpen size={14} />
            All files
          </button>
          <button
            className={`${styles.folderItem} ${activeFolder === "__unfiled__" ? styles.folderItemActive : ""}`}
            onClick={() => { setActiveFolder("__unfiled__"); setUploadFolder(null); }}
          >
            <FolderOpen size={14} />
            Unfiled
          </button>
          {folders.map((f) => (
            <button
              key={f}
              className={`${styles.folderItem} ${activeFolder === f ? styles.folderItemActive : ""}`}
              onClick={() => { setActiveFolder(f); setUploadFolder(f); }}
            >
              <Folder size={14} />
              {f}
            </button>
          ))}
        </aside>
        <div className={styles.content}>
        <div className={styles.uploadRow}>
          <MediaUploader
            onUpload={() => { fetchMedia(); }}
            folder={uploadFolder}
          />
          <div className={styles.uploadFolderSelect}>
            <label className={styles.uploadFolderLabel}>Upload to:</label>
            <select
              className={styles.sortSelect}
              value={uploadFolder || ""}
              onChange={(e) => setUploadFolder(e.target.value || null)}
            >
              <option value="">No folder</option>
              {folders.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
        </div>

        {loading && items.length === 0 ? (
          <div className={styles.loading}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} height={160} />
            ))}
          </div>
        ) : fetchError ? (
          <div className={styles.empty}>
            <div className={styles.emptyIconCircle} style={{ background: "var(--color-error-light, #FEF2F2)", color: "var(--color-error, #DC2626)" }}>
              <AlertCircle size={28} strokeWidth={1.5} />
            </div>
            <h3>Failed to load media</h3>
            <p>Something went wrong. Please try again.</p>
            <Button variant="secondary" size="sm" leftIcon={<RefreshCw size={14} />} onClick={fetchMedia}>
              Retry
            </Button>
          </div>
        ) : total === 0 && !debouncedSearch && typeFilter === "all" ? (
          <EmptyState
            icon={<Upload size={28} strokeWidth={1.5} />}
            title="No media yet"
            description="Upload images, videos, and documents to use across your sites"
            actionLabel="Upload your first file"
            onAction={() => {
              const input = document.querySelector<HTMLInputElement>('input[type="file"]');
              input?.click();
            }}
          />
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
              <select
                className={styles.sortSelect}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="date-desc">Newest first</option>
                <option value="date-asc">Oldest first</option>
                <option value="name-asc">Name A-Z</option>
                <option value="name-desc">Name Z-A</option>
                <option value="size-desc">Largest first</option>
                <option value="size-asc">Smallest first</option>
              </select>
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
              folders={folders}
              onMoveToFolder={handleMoveToFolder}
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
