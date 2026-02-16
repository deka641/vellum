"use client";

import { useState } from "react";
import { Image as ImageIcon, FolderOpen } from "lucide-react";
import { useEditorStore } from "@/stores/editor-store";
import { MediaPickerModal } from "@/components/editor/MediaPickerModal";
import type { ImageContent } from "@/types/blocks";
import styles from "./blocks.module.css";

interface ImageBlockProps {
  id: string;
  content: ImageContent;
}

export function ImageBlock({ id, content }: ImageBlockProps) {
  const updateBlockContent = useEditorStore((s) => s.updateBlockContent);
  const [pickerOpen, setPickerOpen] = useState(false);

  if (!content.src) {
    return (
      <div className={styles.imagePlaceholder}>
        <ImageIcon size={24} />
        <span>Click to add an image</span>
        <div className={styles.imagePlaceholderActions}>
          <button
            className={styles.browseMediaBtn}
            onClick={(e) => {
              e.stopPropagation();
              setPickerOpen(true);
            }}
          >
            <FolderOpen size={14} />
            Browse media
          </button>
          <input
            type="text"
            className={styles.imageUrlInput}
            placeholder="Or paste image URL..."
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const url = e.currentTarget.value.trim();
                if (url) updateBlockContent(id, { src: url });
              }
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
        <MediaPickerModal
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          onSelect={(media) => {
            updateBlockContent(id, {
              src: media.url,
              alt: media.alt || "",
              mediaId: media.id,
            });
          }}
        />
      </div>
    );
  }

  return (
    <div className={styles.imageWrapper}>
      <img src={content.src} alt={content.alt || ""} className={styles.image} />
      {content.caption && (
        <p className={styles.imageCaption}>{content.caption}</p>
      )}
    </div>
  );
}
