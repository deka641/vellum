"use client";

import { useEditorStore } from "@/stores/editor-store";
import type { ButtonContent } from "@/types/blocks";
import styles from "./blocks.module.css";

interface ButtonBlockProps {
  id: string;
  content: ButtonContent;
}

export function ButtonBlock({ id, content }: ButtonBlockProps) {
  const updateBlockContent = useEditorStore((s) => s.updateBlockContent);

  return (
    <div className={styles.buttonWrapper}>
      <span
        className={`${styles.buttonBlock} ${styles[`btn-${content.variant}`]}`}
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) =>
          updateBlockContent(id, { text: e.currentTarget.textContent || "" })
        }
      >
        {content.text}
      </span>
    </div>
  );
}
