"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog/Dialog";
import { MediaGrid } from "@/components/media/MediaGrid";
import { MediaUploader } from "@/components/media/MediaUploader";

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

interface MediaPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (media: MediaItem) => void;
}

export function MediaPickerModal({ open, onOpenChange, onSelect }: MediaPickerModalProps) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset page when search changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const fetchMedia = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res = await fetch(`/api/media?${params}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.media || []);
        setTotalPages(data.pages || 1);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    if (!open) return;
    fetchMedia();
  }, [open, fetchMedia]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSearchQuery("");
      setDebouncedSearch("");
      setPage(1);
    }
  }, [open]);

  function handleSelect(media: MediaItem) {
    onSelect(media);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Choose media</DialogTitle>
        </DialogHeader>
        <MediaUploader
          onUpload={(media) => {
            const item = media as unknown as MediaItem;
            setItems((prev) => [item, ...prev]);
            handleSelect(item);
          }}
        />
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <Search
            size={14}
            style={{
              position: "absolute",
              left: "12px",
              color: "var(--color-text-tertiary)",
              pointerEvents: "none",
            }}
          />
          <input
            type="text"
            placeholder="Search media..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px 8px 32px",
              fontSize: "var(--text-sm)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              background: "var(--color-surface)",
              color: "var(--color-text-primary)",
            }}
          />
        </div>
        {loading ? (
          <p style={{ textAlign: "center", padding: "2rem", color: "var(--color-text-tertiary)", fontSize: "var(--text-sm)" }}>
            Loading media...
          </p>
        ) : items.length === 0 ? (
          <p style={{ textAlign: "center", padding: "2rem", color: "var(--color-text-tertiary)", fontSize: "var(--text-sm)" }}>
            {debouncedSearch ? `No results for "${debouncedSearch}"` : "No media files yet. Upload one above."}
          </p>
        ) : (
          <>
            <MediaGrid items={items} selectable onSelect={handleSelect} />
            {totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "12px", padding: "8px 0" }}>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  style={{
                    padding: "4px 8px",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-md)",
                    background: "var(--color-surface)",
                    cursor: page <= 1 ? "not-allowed" : "pointer",
                    opacity: page <= 1 ? 0.5 : 1,
                    display: "flex",
                    alignItems: "center",
                  }}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} />
                </button>
                <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  style={{
                    padding: "4px 8px",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-md)",
                    background: "var(--color-surface)",
                    cursor: page >= totalPages ? "not-allowed" : "pointer",
                    opacity: page >= totalPages ? 0.5 : 1,
                    display: "flex",
                    alignItems: "center",
                  }}
                  aria-label="Next page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
