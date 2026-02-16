"use client";

import type { CSSProperties } from "react";
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
        className={styles.quoteText}
        contentEditable
        suppressContentEditableWarning
        data-placeholder="Enter quote text..."
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
