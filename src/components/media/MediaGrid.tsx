"use client";

import { useState } from "react";
import { Trash2, Check, AlertCircle, CheckCircle } from "lucide-react";
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
  onUpdateAlt?: (id: string, alt: string) => void;
  selectable?: boolean;
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}

export function MediaGrid({ items, onSelect, onDelete, onUpdateAlt, selectable, selectionMode, selectedIds, onToggleSelect }: MediaGridProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [altValue, setAltValue] = useState("");
  const [savingAlt, setSavingAlt] = useState(false);

  function handleItemClick(item: MediaItem) {
    if (selectionMode && onToggleSelect) {
      onToggleSelect(item.id);
      return;
    }
    if (selectable && onSelect) {
      onSelect(item);
      return;
    }
    if (onUpdateAlt) {
      if (expandedId === item.id) {
        setExpandedId(null);
      } else {
        setExpandedId(item.id);
        setAltValue(item.alt || "");
      }
    }
  }

  async function handleSaveAlt(id: string) {
    if (!onUpdateAlt) return;
    setSavingAlt(true);
    await onUpdateAlt(id, altValue);
    setSavingAlt(false);
    setExpandedId(null);
  }

  return (
    <div className={styles.grid}>
      {items.map((item) => (
        <div key={item.id}>
          <div
            className={`${styles.gridItem} ${selectable ? styles.selectable : ""} ${selectionMode && selectedIds?.has(item.id) ? styles.gridItemSelected : ""}`}
            onClick={() => handleItemClick(item)}
          >
            {selectionMode && (
              <div className={styles.selectionCheckbox}>
                {selectedIds?.has(item.id) && <Check size={14} />}
              </div>
            )}
            <div className={styles.thumbnail}>
              {item.mimeType.startsWith("image/") ? (
                <img src={item.url} alt={item.alt || item.filename} />
              ) : (
                <div className={styles.filePlaceholder}>
                  {item.mimeType.split("/")[1]?.toUpperCase()}
                </div>
              )}
              {!selectionMode && onUpdateAlt && (
                <div className={styles.altBadge}>
                  {item.alt ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                </div>
              )}
            </div>
            <div className={styles.itemInfo}>
              <span className={styles.itemName}>{item.filename}</span>
              <span className={styles.itemSize}>{formatFileSize(item.size)}</span>
            </div>
            {onDelete && !selectionMode && (
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
          {expandedId === item.id && onUpdateAlt && (
            <div className={styles.altEditor}>
              <input
                className={styles.altInput}
                value={altValue}
                onChange={(e) => setAltValue(e.target.value)}
                placeholder="Add alt text for accessibility..."
                onClick={(e) => e.stopPropagation()}
              />
              <button
                className={styles.altSaveBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSaveAlt(item.id);
                }}
                disabled={savingAlt}
              >
                {savingAlt ? "..." : "Save"}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
