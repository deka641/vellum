"use client";

import type { DividerContent, BlockSettings } from "@/types/blocks";
import styles from "./blocks.module.css";

interface DividerBlockProps {
  id: string;
  content: DividerContent;
  settings: BlockSettings;
}

export function DividerBlock({ settings }: DividerBlockProps) {
  return (
    <hr
      className={styles.divider}
      style={{
        borderStyle: settings.style || "solid",
        borderColor: settings.color || "var(--color-border)",
      }}
    />
  );
}
