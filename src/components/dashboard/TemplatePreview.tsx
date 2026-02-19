"use client";

import { PublishedBlock } from "@/components/published/PublishedBlock";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/Dialog/Dialog";
import { Button } from "@/components/ui/Button/Button";

interface BlockData {
  id: string;
  type: string;
  content: Record<string, unknown>;
  settings: Record<string, unknown>;
  parentId?: string | null;
}

interface TemplatePreviewProps {
  open: boolean;
  onClose: () => void;
  name: string;
  blocks: unknown[];
}

export function TemplatePreview({ open, onClose, name, blocks }: TemplatePreviewProps) {
  const typedBlocks = (blocks || []) as BlockData[];
  const topLevelBlocks = typedBlocks.filter((b) => !b.parentId);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent style={{ maxWidth: 720, maxHeight: "80vh" }}>
        <DialogHeader>
          <DialogTitle>Preview: {name}</DialogTitle>
        </DialogHeader>
        <div
          style={{
            overflow: "auto",
            maxHeight: "60vh",
            border: "1px solid var(--color-border-light)",
            borderRadius: "var(--radius-md)",
            background: "var(--color-surface)",
          }}
        >
          {topLevelBlocks.length === 0 ? (
            <div
              style={{
                padding: "var(--space-8)",
                textAlign: "center",
                color: "var(--color-text-tertiary)",
                fontSize: "var(--text-sm)",
              }}
            >
              Blank template — start from scratch
            </div>
          ) : (
            <div
              style={{
                transform: "scale(0.6)",
                transformOrigin: "top left",
                width: "166.67%",
                pointerEvents: "none",
                padding: "var(--space-6)",
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-4)",
              }}
            >
              {topLevelBlocks.map((block) => (
                <PublishedBlock
                  key={block.id}
                  block={block}
                  allBlocks={typedBlocks}
                />
              ))}
            </div>
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: "var(--space-3)" }}>
          <DialogClose asChild>
            <Button variant="ghost" size="sm">Close</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
