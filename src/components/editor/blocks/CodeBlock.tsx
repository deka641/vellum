"use client";

import { useState } from "react";
import { Eye, Code } from "lucide-react";
import { useEditorStore } from "@/stores/editor-store";
import type { CodeContent, BlockSettings } from "@/types/blocks";
import styles from "./blocks.module.css";

interface CodeBlockProps {
  id: string;
  content: CodeContent;
  settings: BlockSettings;
}

export function CodeBlock({ id, content }: CodeBlockProps) {
  const updateBlockContent = useEditorStore((s) => s.updateBlockContent);
  const [showPreview, setShowPreview] = useState(false);

  return (
    <div className={styles.codeEditor}>
      <div className={styles.codeToolbar}>
        <span className={styles.codeLabel}>
          {content.language === "embed" ? "Embed Code" : "HTML Code"}
        </span>
        <button
          className={styles.codeToggle}
          onClick={(e) => {
            e.stopPropagation();
            setShowPreview(!showPreview);
          }}
          title={showPreview ? "Edit code" : "Preview"}
        >
          {showPreview ? <Code size={14} /> : <Eye size={14} />}
          {showPreview ? "Code" : "Preview"}
        </button>
      </div>
      {showPreview ? (
        <div
          className={styles.codePreview}
          dangerouslySetInnerHTML={{ __html: content.code || "<p style='color:#999;text-align:center'>No code to preview</p>" }}
        />
      ) : (
        <textarea
          className={styles.codeTextarea}
          value={content.code || ""}
          onChange={(e) => updateBlockContent(id, { code: e.target.value })}
          placeholder="Paste your HTML or embed code here..."
          rows={6}
          onClick={(e) => e.stopPropagation()}
        />
      )}
    </div>
  );
}
