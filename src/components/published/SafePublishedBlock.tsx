"use client";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PublishedBlock } from "./PublishedBlock";

interface BlockData {
  id: string;
  type: string;
  content: Record<string, unknown>;
  settings: Record<string, unknown>;
}

export function SafePublishedBlock({ block, pageId }: { block: BlockData; pageId?: string }) {
  return (
    <ErrorBoundary silent>
      <PublishedBlock block={block} pageId={pageId} />
    </ErrorBoundary>
  );
}
