"use client";

import { type ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import { useEditorStore } from "@/stores/editor-store";
import { cn } from "@/lib/utils";
import styles from "./BlockWrapper.module.css";

interface BlockWrapperProps {
  id: string;
  children: ReactNode;
}

export function BlockWrapper({ id, children }: BlockWrapperProps) {
  const { selectedBlockId, selectBlock, removeBlock } = useEditorStore();
  const isSelected = selectedBlockId === id;

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
        isDragging && styles.dragging
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
        >
          <GripVertical size={14} />
        </button>
        <button
          className={styles.deleteButton}
          onClick={(e) => {
            e.stopPropagation();
            removeBlock(id);
          }}
        >
          <Trash2 size={14} />
        </button>
      </div>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
