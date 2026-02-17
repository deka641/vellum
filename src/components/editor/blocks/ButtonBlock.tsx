"use client";

import { useRef, useEffect } from "react";
import { useEditorStore } from "@/stores/editor-store";
import type { ButtonContent } from "@/types/blocks";
import styles from "./blocks.module.css";

interface ButtonBlockProps {
  id: string;
  content: ButtonContent;
}

export function ButtonBlock({ id, content }: ButtonBlockProps) {
  const updateBlockContent = useEditorStore((s) => s.updateBlockContent);
  const elRef = useRef<HTMLSpanElement>(null);
  const isLocalEdit = useRef(false);

  // Sync store changes (e.g. undo/redo) back to DOM
  useEffect(() => {
    if (isLocalEdit.current) {
      isLocalEdit.current = false;
      return;
    }
    if (elRef.current && elRef.current.textContent !== content.text) {
      elRef.current.textContent = content.text;
    }
  }, [content.text]);

  return (
    <div className={styles.buttonWrapper}>
      <span
        ref={elRef}
        className={`${styles.buttonBlock} ${styles[`btn-${content.variant}`]}`}
        contentEditable
        suppressContentEditableWarning
        onInput={(e: React.FormEvent<HTMLSpanElement>) => {
          isLocalEdit.current = true;
          updateBlockContent(id, { text: e.currentTarget.textContent || "" });
        }}
        onBlur={(e) =>
          updateBlockContent(id, { text: e.currentTarget.textContent || "" })
        }
      >
        {content.text}
      </span>
    </div>
  );
}
