"use client";

import { useState, type CSSProperties } from "react";
import { Image as ImageIcon } from "lucide-react";
import { useEditorStore } from "@/stores/editor-store";
import { MediaPickerModal } from "@/components/editor/MediaPickerModal";
import type { ImageContent, BlockSettings } from "@/types/blocks";
import styles from "./blocks.module.css";

interface ImageBlockProps {
  id: string;
  content: ImageContent;
  settings?: BlockSettings;
}

export function ImageBlock({ id, content, settings }: ImageBlockProps) {
  const updateBlockContent = useEditorStore((s) => s.updateBlockContent);
  const [pickerOpen, setPickerOpen] = useState(false);

  if (!content.src) {
    return (
      <div
        className={styles.imageEmptyState}
        onClick={(e) => {
          e.stopPropagation();
          setPickerOpen(true);
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setPickerOpen(true);
          }
        }}
      >
        <div className={styles.imageEmptyIcon}>
          <ImageIcon size={32} />
        </div>
        <span className={styles.imageEmptyTitle}>Click to add image</span>
        <span className={styles.imageEmptySubtitle}>or drag and drop</span>
        <input
          type="text"
          className={styles.imageUrlInput}
          placeholder="Or paste image URL and press Enter..."
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const url = e.currentTarget.value.trim();
              if (url) updateBlockContent(id, { src: url });
            }
          }}
          onClick={(e) => e.stopPropagation()}
        />
        <MediaPickerModal
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          onSelect={(media) => {
            updateBlockContent(id, {
              src: media.url,
              alt: media.alt || "",
              mediaId: media.id,
              ...(media.width ? { width: media.width } : {}),
              ...(media.height ? { height: media.height } : {}),
            });
          }}
        />
      </div>
    );
  }

  const imgStyle: CSSProperties = {
    ...(settings?.width && { width: settings.width as string }),
    ...(settings?.rounded && { borderRadius: "var(--radius-lg)" }),
    ...(settings?.shadow && { boxShadow: "var(--shadow-lg)" }),
  };

  const [imageError, setImageError] = useState(false);

  return (
    <div className={styles.imageWrapper}>
      <img
        src={content.src}
        alt={content.alt || ""}
        className={styles.image}
        style={imgStyle}
        onError={() => setImageError(true)}
        onLoad={() => setImageError(false)}
      />
      {imageError && (
        <div className={styles.imageErrorOverlay}>
          <ImageIcon size={20} />
          <span>Image failed to load</span>
          <button
            className={styles.imageErrorRetry}
            onClick={(e) => {
              e.stopPropagation();
              setImageError(false);
              updateBlockContent(id, { src: content.src });
            }}
          >
            Retry
          </button>
        </div>
      )}
      <div className={styles.imageAltField}>
        <label className={styles.imageAltLabel} htmlFor={`alt-${id}`}>
          Alt text
          {!content.alt && (
            <span className={styles.imageAltWarning}>Missing</span>
          )}
        </label>
        <input
          id={`alt-${id}`}
          type="text"
          className={styles.imageAltInput}
          value={content.alt || ""}
          placeholder="Describe the image for screen readers and SEO"
          onChange={(e) => updateBlockContent(id, { alt: e.target.value })}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
      {content.caption && (
        <p className={styles.imageCaption}>{content.caption}</p>
      )}
    </div>
  );
}
