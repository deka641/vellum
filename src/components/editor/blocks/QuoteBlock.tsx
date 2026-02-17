"use client";

import { useRef, useEffect, type CSSProperties } from "react";
import { useEditorStore } from "@/stores/editor-store";
import type { QuoteContent, BlockSettings } from "@/types/blocks";
import styles from "./blocks.module.css";

interface QuoteBlockProps {
  id: string;
  content: QuoteContent;
  settings: BlockSettings;
}

export function QuoteBlock({ id, content, settings }: QuoteBlockProps) {
  const updateBlockContent = useEditorStore((s) => s.updateBlockContent);
  const variant = content.style || "default";
  const elRef = useRef<HTMLDivElement>(null);
  const isLocalEdit = useRef(false);

  // Sync store changes (e.g. undo/redo) back to DOM
  useEffect(() => {
    if (isLocalEdit.current) {
      isLocalEdit.current = false;
      return;
    }
    if (elRef.current && elRef.current.textContent !== (content.text || "")) {
      elRef.current.textContent = content.text || "";
    }
  }, [content.text]);

  const inlineStyle: CSSProperties = {
    ...(settings.textColor && { color: settings.textColor }),
    ...(settings.backgroundColor && { backgroundColor: settings.backgroundColor }),
    ...(settings.fontSize && { fontSize: settings.fontSize }),
    ...(settings.paddingY && { paddingTop: settings.paddingY, paddingBottom: settings.paddingY }),
    ...(settings.paddingX && { paddingLeft: settings.paddingX, paddingRight: settings.paddingX }),
    ...(settings.align && { textAlign: settings.align }),
  };

  return (
    <blockquote
      className={`${styles.quote} ${styles[`quote-${variant}`] || ""}`}
      style={inlineStyle}
    >
      <div
        ref={elRef}
        className={styles.quoteText}
        contentEditable
        suppressContentEditableWarning
        data-placeholder="Enter quote text..."
        onInput={(e: React.FormEvent<HTMLDivElement>) => {
          isLocalEdit.current = true;
          updateBlockContent(id, { text: e.currentTarget.textContent || "" });
        }}
        onBlur={(e) =>
          updateBlockContent(id, { text: e.currentTarget.textContent || "" })
        }
      >
        {content.text || ""}
      </div>
      <input
        className={styles.quoteAttribution}
        placeholder="Attribution (optional)"
        value={content.attribution || ""}
        onChange={(e) => updateBlockContent(id, { attribution: e.target.value })}
        onClick={(e) => e.stopPropagation()}
      />
    </blockquote>
  );
}
