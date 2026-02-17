"use client";

import { useRef, useEffect, type CSSProperties } from "react";
import { useEditorStore } from "@/stores/editor-store";
import type { HeadingContent, BlockSettings } from "@/types/blocks";
import styles from "./blocks.module.css";

interface HeadingBlockProps {
  id: string;
  content: HeadingContent;
  settings: BlockSettings;
}

const headingElements = {
  1: "h1",
  2: "h2",
  3: "h3",
  4: "h4",
} as const;

export function HeadingBlock({ id, content, settings }: HeadingBlockProps) {
  const updateBlockContent = useEditorStore((s) => s.updateBlockContent);
  const Tag = headingElements[content.level] || "h2";
  const elRef = useRef<HTMLHeadingElement>(null);
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

  const inlineStyle: CSSProperties = {
    ...(settings.textColor && { color: settings.textColor }),
    ...(settings.backgroundColor && { backgroundColor: settings.backgroundColor }),
    ...(settings.fontSize && { fontSize: settings.fontSize }),
    ...(settings.paddingY && { paddingTop: settings.paddingY, paddingBottom: settings.paddingY }),
    ...(settings.paddingX && { paddingLeft: settings.paddingX, paddingRight: settings.paddingX }),
    ...(settings.align && { textAlign: settings.align }),
  };

  return (
    <Tag
      ref={elRef as React.Ref<HTMLHeadingElement>}
      className={styles.heading}
      contentEditable
      suppressContentEditableWarning
      onInput={(e: React.FormEvent<HTMLHeadingElement>) => {
        isLocalEdit.current = true;
        updateBlockContent(id, { text: e.currentTarget.textContent || "" });
      }}
      onBlur={(e: React.FocusEvent<HTMLHeadingElement>) =>
        updateBlockContent(id, { text: e.currentTarget.textContent || "" })
      }
      data-level={content.level}
      style={inlineStyle}
    >
      {content.text}
    </Tag>
  );
}
