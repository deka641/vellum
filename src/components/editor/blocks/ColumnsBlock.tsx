"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, Trash2, GripVertical } from "lucide-react";
import type { ColumnsContent, BlockSettings, BlockType, EditorBlock } from "@/types/blocks";
import { useEditorStore } from "@/stores/editor-store";
import { blockDefinitions, blockCategories } from "@/lib/blocks";
import { BlockRenderer } from "../BlockRenderer";
import styles from "./blocks.module.css";

const DISALLOWED_NESTED_TYPES: BlockType[] = ["columns", "form", "video"];

interface ColumnsBlockProps {
  id: string;
  content: ColumnsContent;
  settings: BlockSettings;
}

function SortableNestedBlock({
  block,
  parentId,
}: {
  block: EditorBlock;
  parentId: string;
}) {
  const { selectedBlockId, selectBlock, removeBlockFromColumn } = useEditorStore();
  const isSelected = selectedBlockId === block.id;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.nestedBlockWrapper} ${isSelected ? styles.nestedBlockSelected : ""}`}
      onClick={(e) => {
        e.stopPropagation();
        selectBlock(block.id);
      }}
    >
      <div className={styles.nestedToolbar}>
        <button className={styles.nestedDragHandle} {...attributes} {...listeners}>
          <GripVertical size={12} />
        </button>
        <button
          className={styles.nestedDeleteBtn}
          onClick={(e) => {
            e.stopPropagation();
            removeBlockFromColumn(parentId, block.id);
          }}
        >
          <Trash2 size={12} />
        </button>
      </div>
      <BlockRenderer block={block} />
    </div>
  );
}

function ColumnDropZone({
  parentId,
  colIndex,
  blocks,
}: {
  parentId: string;
  colIndex: number;
  blocks: EditorBlock[];
}) {
  const { addBlockToColumn, moveBlockInColumn } = useEditorStore();
  const [showPicker, setShowPicker] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = blocks.findIndex((b) => b.id === active.id);
    const newIndex = blocks.findIndex((b) => b.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      moveBlockInColumn(parentId, colIndex, oldIndex, newIndex);
    }
  }

  return (
    <div className={styles.columnDropZone}>
      {blocks.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={blocks.map((b) => b.id)}
            strategy={verticalListSortingStrategy}
          >
            {blocks.map((block) => (
              <SortableNestedBlock
                key={block.id}
                block={block}
                parentId={parentId}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}

      {blocks.length === 0 && !showPicker && (
        <div className={styles.columnEmpty}>Column {colIndex + 1}</div>
      )}

      {showPicker ? (
        <div className={styles.columnBlockPicker}>
          {blockCategories.map((cat) => {
            const items = Object.values(blockDefinitions).filter(
              (b) => b.category === cat.key && !DISALLOWED_NESTED_TYPES.includes(b.type)
            );
            if (items.length === 0) return null;
            return (
              <div key={cat.key}>
                <span className={styles.columnPickerCatLabel}>{cat.label}</span>
                <div className={styles.columnPickerGrid}>
                  {items.map((def) => (
                    <button
                      key={def.type}
                      className={styles.columnPickerBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        addBlockToColumn(parentId, colIndex, def.type);
                        setShowPicker(false);
                      }}
                    >
                      {def.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          <button
            className={styles.columnPickerCancel}
            onClick={(e) => {
              e.stopPropagation();
              setShowPicker(false);
            }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          className={styles.columnAddBtn}
          onClick={(e) => {
            e.stopPropagation();
            setShowPicker(true);
          }}
        >
          <Plus size={14} />
          Add block
        </button>
      )}
    </div>
  );
}

export function ColumnsBlock({ id, content, settings }: ColumnsBlockProps) {
  return (
    <div
      className={styles.columns}
      style={{ gap: settings.gap || "24px" }}
      onClick={(e) => e.stopPropagation()}
    >
      {content.columns.map((col, i) => (
        <div key={i} className={styles.column}>
          <ColumnDropZone
            parentId={id}
            colIndex={i}
            blocks={col.blocks}
          />
        </div>
      ))}
    </div>
  );
}
