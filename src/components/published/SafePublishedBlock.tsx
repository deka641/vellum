"use client";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PublishedBlock } from "./PublishedBlock";

interface BlockData {
  id: string;
  type: string;
  content: Record<string, unknown>;
  settings: Record<string, unknown>;
}

export function SafePublishedBlock({ block, pageId, allBlocks }: { block: BlockData; pageId?: string; allBlocks?: BlockData[] }) {
  return (
    <ErrorBoundary silent>
      <PublishedBlock block={block} pageId={pageId} allBlocks={allBlocks} />
    </ErrorBoundary>
  );
}
