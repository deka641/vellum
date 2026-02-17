"use client";

import { useEffect, useState, useMemo } from "react";
import { Image as ImageIcon, Search, CheckSquare, Trash2 } from "lucide-react";
import { Topbar } from "@/components/dashboard/Topbar";
import { MediaGrid } from "@/components/media/MediaGrid";
import { MediaUploader } from "@/components/media/MediaUploader";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { Button } from "@/components/ui/Button/Button";
import { useToast } from "@/components/ui/Toast/Toast";
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
  const [typeFilter, setTypeFilter] = useState<MediaTypeFilter>("all");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    fetch("/api/media")
      .then((res) => res.json())
      .then((data) => setItems(data.media || []))
      .finally(() => setLoading(false));
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q || item.filename.toLowerCase().includes(q);
      if (!matchesSearch) return false;

      if (typeFilter === "all") return true;
      if (typeFilter === "images") return item.mimeType.startsWith("image/");
      if (typeFilter === "videos") return item.mimeType.startsWith("video/");
      return !item.mimeType.startsWith("image/") && !item.mimeType.startsWith("video/");
    });
  }, [items, searchQuery, typeFilter]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this file?")) return;
    const res = await fetch(`/api/media/${id}`, { method: "DELETE" });
    if (res.ok) {
      setItems((prev) => prev.filter((m) => m.id !== id));
      toast("File deleted");
    } else {
      toast("Failed to delete file", "error");
    }
  }

  function handleToggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected file(s)?`)) return;

    const ids = Array.from(selectedIds);
    try {
      const res = await fetch("/api/media/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (res.ok) {
        setItems((prev) => prev.filter((m) => !selectedIds.has(m.id)));
        setSelectedIds(new Set());
        setSelectionMode(false);
        toast(`${ids.length} file(s) deleted`);
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
          onUpload={(media) =>
            setItems((prev) => [media as unknown as MediaItem, ...prev])
          }
        />

        {loading ? (
          <div className={styles.loading}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} height={160} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className={styles.empty}>
            <ImageIcon size={48} strokeWidth={1} />
            <h3>No media yet</h3>
            <p>Upload your first file to get started</p>
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
              items={filteredItems}
              onDelete={handleDelete}
              onUpdateAlt={handleUpdateAlt}
              selectionMode={selectionMode}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
            />
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
    </>
  );
}
