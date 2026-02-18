"use client";

import { memo, type ReactNode, useCallback } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, Copy, Eye, EyeOff } from "lucide-react";
import { useEditorStore } from "@/stores/editor-store";
import { useToast } from "@/components/ui/Toast/Toast";
import { cn } from "@/lib/utils";
import styles from "./BlockWrapper.module.css";

interface BlockWrapperProps {
  id: string;
  children: ReactNode;
}

export const BlockWrapper = memo(function BlockWrapper({ id, children }: BlockWrapperProps) {
  const isSelected = useEditorStore((s) => s.selectedBlockId === id);
  const isHidden = useEditorStore((s) => {
    const block = s.blocks.find((b) => b.id === id);
    return block?.settings.hidden === true;
  });
  const marginTop = useEditorStore((s) => s.blocks.find((b) => b.id === id)?.settings.marginTop);
  const marginBottom = useEditorStore((s) => s.blocks.find((b) => b.id === id)?.settings.marginBottom);
  const selectBlock = useEditorStore((s) => s.selectBlock);
  const removeBlock = useEditorStore((s) => s.removeBlock);
  const duplicateBlock = useEditorStore((s) => s.duplicateBlock);
  const updateBlockSettings = useEditorStore((s) => s.updateBlockSettings);
  const undo = useEditorStore((s) => s.undo);
  const { toast } = useToast();

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

  const handleToggleVisibility = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    updateBlockSettings(id, { hidden: !isHidden });
  }, [id, isHidden, updateBlockSettings]);

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
        isHidden && styles.hidden
      )}
      onClick={handleClick}
    >
      <div className={styles.toolbar}>
        <button
          className={styles.dragHandle}
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder block"
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
      <div className={styles.content}>{children}</div>
    </div>
  );
});
