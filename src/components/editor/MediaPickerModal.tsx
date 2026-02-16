"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/media")
      .then((res) => res.json())
      .then((data) => setItems(data.media || []))
      .finally(() => setLoading(false));
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
        {loading ? (
          <p style={{ textAlign: "center", padding: "2rem", color: "var(--color-text-tertiary)", fontSize: "var(--text-sm)" }}>
            Loading media...
          </p>
        ) : items.length === 0 ? (
          <p style={{ textAlign: "center", padding: "2rem", color: "var(--color-text-tertiary)", fontSize: "var(--text-sm)" }}>
            No media files yet. Upload one above.
          </p>
        ) : (
          <MediaGrid items={items} selectable onSelect={handleSelect} />
        )}
      </DialogContent>
    </Dialog>
  );
}
