"use client";

import type { ColumnsContent, BlockSettings } from "@/types/blocks";
import { BlockRenderer } from "../BlockRenderer";
import styles from "./blocks.module.css";

interface ColumnsBlockProps {
  id: string;
  content: ColumnsContent;
  settings: BlockSettings;
}

export function ColumnsBlock({ content, settings }: ColumnsBlockProps) {
  return (
    <div
      className={styles.columns}
      style={{ gap: settings.gap || "24px" }}
    >
      {content.columns.map((col, i) => (
        <div key={i} className={styles.column}>
          {col.blocks.length === 0 ? (
            <div className={styles.columnEmpty}>Column {i + 1}</div>
          ) : (
            col.blocks.map((block) => (
              <BlockRenderer key={block.id} block={block} />
            ))
          )}
        </div>
      ))}
    </div>
  );
}
