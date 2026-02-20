"use client";

import type { DividerContent, BlockSettings } from "@/types/blocks";
import styles from "./blocks.module.css";

interface DividerBlockProps {
  id: string;
  content: DividerContent;
  settings: BlockSettings;
}

export function DividerBlock({ settings }: DividerBlockProps) {
  const align = settings.align;
  return (
    <hr
      className={styles.divider}
      style={{
        borderStyle: settings.style || "solid",
        borderColor: settings.color || "var(--color-border)",
        borderTopWidth: settings.thickness || "1px",
        maxWidth: settings.maxWidth || "100%",
        margin: align === "center" ? "var(--space-2) auto" :
                align === "right" ? "var(--space-2) 0 var(--space-2) auto" :
                "var(--space-2) 0",
      }}
    />
  );
}
