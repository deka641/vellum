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
import { DISALLOWED_NESTED_TYPES } from "@/lib/validations";
import { BlockRenderer } from "../BlockRenderer";
import styles from "./blocks.module.css";

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
  const isSelected = useEditorStore((s) => s.selectedBlockId === block.id);
  const selectBlock = useEditorStore((s) => s.selectBlock);
  const removeBlockFromColumn = useEditorStore((s) => s.removeBlockFromColumn);

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
  const addBlockToColumn = useEditorStore((s) => s.addBlockToColumn);
  const moveBlockInColumn = useEditorStore((s) => s.moveBlockInColumn);
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

const TWO_COL_PRESETS: number[][] = [
  [50, 50], [66, 34], [34, 66], [75, 25], [25, 75],
];
const THREE_COL_PRESETS: number[][] = [
  [33, 33, 34], [50, 25, 25], [25, 50, 25], [25, 25, 50],
];

function PresetLabel({ widths }: { widths: number[] }) {
  return (
    <span className={styles.presetLabel}>
      {widths.map((w, i) => (
        <span key={i} className={styles.presetBar} style={{ flex: w }} />
      ))}
    </span>
  );
}

export function ColumnsBlock({ id, content, settings }: ColumnsBlockProps) {
  const updateBlockContent = useEditorStore((s) => s.updateBlockContent);
  const colCount = content.columns.length;
  const widths = content.columnWidths || content.columns.map(() => Math.floor(100 / colCount));
  const presets = colCount === 3 ? THREE_COL_PRESETS : TWO_COL_PRESETS;

  function setWidths(newWidths: number[]) {
    updateBlockContent(id, { columnWidths: newWidths });
  }

  function toggleColumnCount() {
    if (colCount === 2) {
      const newCols = [...content.columns, { blocks: [] }];
      updateBlockContent(id, { columns: newCols, columnWidths: [33, 33, 34] });
    } else {
      const merged = [...content.columns[1].blocks, ...content.columns.slice(2).flatMap(c => c.blocks)];
      const newCols = [content.columns[0], { blocks: merged }];
      updateBlockContent(id, { columns: newCols, columnWidths: [50, 50] });
    }
  }

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <div className={styles.columnPresets}>
        {presets.map((preset, i) => {
          const isActive = preset.every((w, j) => widths[j] === w);
          return (
            <button
              key={i}
              className={`${styles.presetBtn} ${isActive ? styles.presetBtnActive : ""}`}
              onClick={(e) => { e.stopPropagation(); setWidths(preset); }}
              title={preset.join("/")}
            >
              <PresetLabel widths={preset} />
            </button>
          );
        })}
        <button
          className={styles.columnCountToggle}
          onClick={(e) => { e.stopPropagation(); toggleColumnCount(); }}
        >
          {colCount === 2 ? "3 cols" : "2 cols"}
        </button>
      </div>
      <div
        className={styles.columns}
        style={{ gap: settings.gap || "24px", gridTemplateColumns: widths.map(w => `${w}%`).join(" ") }}
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
    </div>
  );
}
