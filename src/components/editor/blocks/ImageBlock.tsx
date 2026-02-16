"use client";

import { Image as ImageIcon } from "lucide-react";
import { useEditorStore } from "@/stores/editor-store";
import type { ImageContent } from "@/types/blocks";
import styles from "./blocks.module.css";

interface ImageBlockProps {
  id: string;
  content: ImageContent;
}

export function ImageBlock({ id, content }: ImageBlockProps) {
  const updateBlockContent = useEditorStore((s) => s.updateBlockContent);

  if (!content.src) {
    return (
      <div className={styles.imagePlaceholder}>
        <ImageIcon size={24} />
        <span>Click to add an image</span>
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
