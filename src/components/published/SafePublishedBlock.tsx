"use client";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PublishedBlock } from "./PublishedBlock";
import type { BlockData } from "@/types/blocks";

export function SafePublishedBlock({ block, pageId, allBlocks }: { block: BlockData; pageId?: string; allBlocks?: BlockData[] }) {
  return (
    <ErrorBoundary silent>
      <PublishedBlock block={block} pageId={pageId} allBlocks={allBlocks} />
    </ErrorBoundary>
  );
}
