"use client";

import { Trash2 } from "lucide-react";
import { formatFileSize } from "@/lib/utils";
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

interface MediaGridProps {
  items: MediaItem[];
  onSelect?: (media: MediaItem) => void;
  onDelete?: (id: string) => void;
  selectable?: boolean;
}

export function MediaGrid({ items, onSelect, onDelete, selectable }: MediaGridProps) {
  return (
    <div className={styles.grid}>
      {items.map((item) => (
        <div
          key={item.id}
          className={`${styles.gridItem} ${selectable ? styles.selectable : ""}`}
          onClick={() => onSelect?.(item)}
        >
          <div className={styles.thumbnail}>
            {item.mimeType.startsWith("image/") ? (
              <img src={item.url} alt={item.alt || item.filename} />
            ) : (
              <div className={styles.filePlaceholder}>
                {item.mimeType.split("/")[1]?.toUpperCase()}
              </div>
            )}
          </div>
          <div className={styles.itemInfo}>
            <span className={styles.itemName}>{item.filename}</span>
            <span className={styles.itemSize}>{formatFileSize(item.size)}</span>
          </div>
          {onDelete && (
            <button
              className={styles.deleteBtn}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(item.id);
              }}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
