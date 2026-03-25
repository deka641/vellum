"use client";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PublishedBlock } from "./PublishedBlock";
import type { BlockData } from "@/types/blocks";
import styles from "./published.module.css";

export function SafePublishedBlock({ block, pageId, allBlocks, turnstileSiteKey }: { block: BlockData; pageId?: string; allBlocks?: BlockData[]; turnstileSiteKey?: string }) {
  return (
    <ErrorBoundary silent placeholder placeholderClassName={styles.blockErrorPlaceholder}>
      <PublishedBlock block={block} pageId={pageId} allBlocks={allBlocks} turnstileSiteKey={turnstileSiteKey} />
    </ErrorBoundary>
  );
}
