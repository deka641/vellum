"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog/Dialog";
import { MediaGrid } from "./MediaGrid";
import { MediaUploader } from "./MediaUploader";
import styles from "./media.module.css";

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

interface MediaPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (media: MediaItem) => void;
}

export function MediaPicker({ open, onOpenChange, onSelect }: MediaPickerProps) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      fetch("/api/media")
        .then((res) => res.json())
        .then((data) => setItems(data.media || []))
        .finally(() => setLoading(false));
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={styles.pickerDialog}>
        <DialogHeader>
          <DialogTitle>Select Media</DialogTitle>
        </DialogHeader>
        <MediaUploader
          onUpload={(media) =>
            setItems((prev) => [media as unknown as MediaItem, ...prev])
          }
        />
        {loading ? (
          <p className={styles.loadingText}>Loading...</p>
        ) : (
          <MediaGrid
            items={items}
            selectable
            onSelect={(media) => {
              onSelect(media);
              onOpenChange(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
