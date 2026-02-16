"use client";

import { useEditorStore } from "@/stores/editor-store";
import type { HeadingContent } from "@/types/blocks";
import styles from "./blocks.module.css";

interface HeadingBlockProps {
  id: string;
  content: HeadingContent;
}

const headingElements = {
  1: "h1",
  2: "h2",
  3: "h3",
  4: "h4",
} as const;

export function HeadingBlock({ id, content }: HeadingBlockProps) {
  const updateBlockContent = useEditorStore((s) => s.updateBlockContent);
  const Tag = headingElements[content.level] || "h2";

  return (
    <Tag
      className={styles.heading}
      contentEditable
      suppressContentEditableWarning
      onBlur={(e: React.FocusEvent<HTMLHeadingElement>) =>
        updateBlockContent(id, { text: e.currentTarget.textContent || "" })
      }
      data-level={content.level}
    >
      {content.text}
    </Tag>
  );
}
