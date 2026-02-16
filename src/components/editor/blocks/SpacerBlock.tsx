"use client";

import { useEditorStore } from "@/stores/editor-store";
import type { SpacerContent } from "@/types/blocks";
import styles from "./blocks.module.css";

interface SpacerBlockProps {
  id: string;
  content: SpacerContent;
}

export function SpacerBlock({ id, content }: SpacerBlockProps) {
  const updateBlockContent = useEditorStore((s) => s.updateBlockContent);

  return (
    <div
      className={styles.spacer}
      style={{ height: content.height }}
    >
      <div className={styles.spacerLabel}>
        <input
          type="range"
          min={8}
          max={200}
          value={content.height}
          onChange={(e) =>
            updateBlockContent(id, { height: Number(e.target.value) })
          }
          className={styles.spacerRange}
          onClick={(e) => e.stopPropagation()}
        />
        <span>{content.height}px</span>
      </div>
    </div>
  );
}
