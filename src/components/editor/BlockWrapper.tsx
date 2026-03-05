"use client";

import { memo, type ReactNode, useCallback, useState, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, Copy, Clipboard, Eye, EyeOff, Bookmark } from "lucide-react";
import { useEditorStore } from "@/stores/editor-store";
import { useShallow } from "zustand/react/shallow";
import { useToast } from "@/components/ui/Toast/Toast";
import { ErrorBoundary, BlockErrorFallback } from "@/components/ErrorBoundary";
import { cn } from "@/lib/utils";
import styles from "./BlockWrapper.module.css";

interface BlockWrapperProps {
  id: string;
  children: ReactNode;
}

export const BlockWrapper = memo(function BlockWrapper({ id, children }: BlockWrapperProps) {
  const isSelected = useEditorStore((s) => s.selectedBlockId === id);
  const { isHidden, marginTop, marginBottom, blockType } = useEditorStore(
    useShallow((s) => {
      const block = s.blocks.find((b) => b.id === id);
      return {
        isHidden: block?.settings.hidden === true,
        marginTop: block?.settings.marginTop as string | undefined,
        marginBottom: block?.settings.marginBottom as string | undefined,
        blockType: block?.type as string | undefined,
      };
    })
  );
  const isExiting = useEditorStore((s) => s.exitingBlockIds.has(id));
  const isSettled = useEditorStore((s) => s.settledBlockId === id);
  const selectBlock = useEditorStore((s) => s.selectBlock);
  const removeBlock = useEditorStore((s) => s.removeBlock);
  const duplicateBlock = useEditorStore((s) => s.duplicateBlock);
  const copyBlock = useEditorStore((s) => s.copyBlock);
  const updateBlockSettings = useEditorStore((s) => s.updateBlockSettings);
  const undo = useEditorStore((s) => s.undo);
  const { toast } = useToast();

  const blockIndex = useEditorStore((s) => s.blocks.findIndex((b) => b.id === id));
  const blockCount = useEditorStore((s) => s.blocks.length);

  const blockLabel = blockType
    ? `${blockType.charAt(0).toUpperCase() + blockType.slice(1)} block`
    : "Block";

  // Enter animation: start with isEntering true, clear after a frame to trigger CSS animation
  const [isEntering, setIsEntering] = useState(true);
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setIsEntering(false);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    ...(marginTop ? { marginTop } : {}),
    ...(marginBottom ? { marginBottom } : {}),
  };

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    selectBlock(id);
  }, [id, selectBlock]);

  const handleDuplicate = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    duplicateBlock(id);
  }, [id, duplicateBlock]);

  const handleCopy = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    copyBlock(id);
    toast("Block copied to clipboard", "info");
  }, [id, copyBlock, toast]);

  const handleToggleVisibility = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    updateBlockSettings(id, { hidden: !isHidden });
  }, [id, isHidden, updateBlockSettings]);

  const handleSaveAsTemplate = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    const block = useEditorStore.getState().blocks.find((b) => b.id === id);
    if (!block) return;
    const typeName = block.type.charAt(0).toUpperCase() + block.type.slice(1);
    const name = `${typeName} template`;
    try {
      const res = await fetch("/api/block-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          type: block.type,
          content: block.content,
          settings: block.settings,
        }),
      });
      if (res.ok) {
        toast("Block saved as template", "success");
      } else {
        const data = await res.json().catch(() => ({}));
        toast(data.error || "Failed to save template", "error");
      }
    } catch {
      toast("Failed to save template", "error");
    }
  }, [id, toast]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    removeBlock(id);
    const idx = useEditorStore.getState().historyIndex;
    toast("Block deleted", "info", {
      label: "Undo",
      onClick: () => {
        if (useEditorStore.getState().historyIndex === idx) undo();
      },
    });
  }, [id, removeBlock, undo, toast]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        styles.wrapper,
        isSelected && styles.selected,
        isDragging && styles.dragging,
        isHidden && styles.hidden,
        isEntering && styles.entering,
        isExiting && styles.exiting,
        isSettled && styles.settled
      )}
      onClick={handleClick}
      role="region"
      aria-label={blockLabel}
    >
      <div className={styles.toolbar}>
        <button
          className={styles.dragHandle}
          {...attributes}
          {...listeners}
          aria-label={`Reorder ${blockLabel}, position ${blockIndex + 1} of ${blockCount}`}
          aria-roledescription="sortable"
          aria-describedby="block-reorder-instructions"
        >
          <GripVertical size={14} />
        </button>
        <button
          className={styles.duplicateButton}
          onClick={handleDuplicate}
          title="Duplicate block"
          aria-label="Duplicate block"
        >
          <Copy size={14} />
        </button>
        <button
          className={styles.copyButton}
          onClick={handleCopy}
          title="Copy block (Ctrl+C)"
          aria-label="Copy block to clipboard"
        >
          <Clipboard size={14} />
        </button>
        <button
          className={styles.saveTemplateButton}
          onClick={handleSaveAsTemplate}
          title="Save as template"
          aria-label="Save block as template"
        >
          <Bookmark size={14} />
        </button>
        <button
          className={styles.visibilityButton}
          onClick={handleToggleVisibility}
          title={isHidden ? "Show block" : "Hide block"}
          aria-label={isHidden ? "Show block" : "Hide block"}
        >
          {isHidden ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
        <button
          className={styles.deleteButton}
          onClick={handleDelete}
          title="Delete block"
          aria-label="Delete block"
        >
          <Trash2 size={14} />
        </button>
      </div>
      <div className={styles.content}>
        <ErrorBoundary
          fallback={<BlockErrorFallback onDelete={() => removeBlock(id)} />}
          resetKey={id}
        >
          {children}
        </ErrorBoundary>
      </div>
      <div id="block-reorder-instructions" className={styles.srOnly}>
        Use Alt+Up and Alt+Down arrow keys to reorder this block
      </div>
    </div>
  );
});
