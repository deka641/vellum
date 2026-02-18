"use client";

import { List } from "lucide-react";
import type { TocContent, BlockSettings } from "@/types/blocks";
import { useEditorStore } from "@/stores/editor-store";
import styles from "./blocks.module.css";

interface TocBlockProps {
  id: string;
  content: TocContent;
  settings: BlockSettings;
}

export function TocBlock({ id, content }: TocBlockProps) {
  const updateBlockContent = useEditorStore((s) => s.updateBlockContent);

  return (
    <div className={styles.tocEditor}>
      <div className={styles.tocPreview}>
        <List size={20} />
        <div className={styles.tocPreviewText}>
          <strong>Table of Contents</strong>
          <span>Auto-generated from heading blocks on the published page</span>
        </div>
      </div>
      <div className={styles.tocSettings}>
        <label className={styles.tocSettingLabel}>
          Max depth
          <select
            className={styles.tocSelect}
            value={content.maxDepth}
            onChange={(e) => updateBlockContent(id, { maxDepth: Number(e.target.value) })}
          >
            <option value={2}>H1 - H2</option>
            <option value={3}>H1 - H3</option>
            <option value={4}>H1 - H4</option>
          </select>
        </label>
        <label className={styles.tocSettingLabel}>
          Style
          <select
            className={styles.tocSelect}
            value={content.style}
            onChange={(e) => updateBlockContent(id, { style: e.target.value })}
          >
            <option value="boxed">Boxed</option>
            <option value="minimal">Minimal</option>
          </select>
        </label>
        <label className={styles.tocCheckboxLabel}>
          <input
            type="checkbox"
            checked={content.ordered}
            onChange={(e) => updateBlockContent(id, { ordered: e.target.checked })}
          />
          Numbered list
        </label>
      </div>
    </div>
  );
}
