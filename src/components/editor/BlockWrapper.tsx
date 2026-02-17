"use client";

import { type ReactNode } from "react";
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

export function BlockWrapper({ id, children }: BlockWrapperProps) {
  const { selectedBlockId, selectBlock, removeBlock, duplicateBlock, blocks, updateBlockSettings, undo } = useEditorStore();
  const { toast } = useToast();
  const isSelected = selectedBlockId === id;
  const block = blocks.find((b) => b.id === id);
  const isHidden = block?.settings.hidden === true;

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
  };

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
      onClick={(e) => {
        e.stopPropagation();
        selectBlock(id);
      }}
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
          onClick={(e) => {
            e.stopPropagation();
            duplicateBlock(id);
          }}
          title="Duplicate block"
          aria-label="Duplicate block"
        >
          <Copy size={14} />
        </button>
        <button
          className={styles.visibilityButton}
          onClick={(e) => {
            e.stopPropagation();
            updateBlockSettings(id, { hidden: !isHidden });
          }}
          title={isHidden ? "Show block" : "Hide block"}
          aria-label={isHidden ? "Show block" : "Hide block"}
        >
          {isHidden ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
        <button
          className={styles.deleteButton}
          onClick={(e) => {
            e.stopPropagation();
            removeBlock(id);
            const idx = useEditorStore.getState().historyIndex;
            toast("Block deleted", "info", {
              label: "Undo",
              onClick: () => {
                if (useEditorStore.getState().historyIndex === idx) undo();
              },
            });
          }}
          title="Delete block"
          aria-label="Delete block"
        >
          <Trash2 size={14} />
        </button>
      </div>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
