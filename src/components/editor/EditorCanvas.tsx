"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { useEditorStore } from "@/stores/editor-store";
import { BlockWrapper } from "./BlockWrapper";
import { BlockRenderer } from "./BlockRenderer";
import styles from "./EditorCanvas.module.css";

interface EditorCanvasProps {
  onAddBlock: () => void;
}

const previewWidths = {
  desktop: "100%",
  tablet: "768px",
  mobile: "375px",
} as const;

export function EditorCanvas({ onAddBlock }: EditorCanvasProps) {
  const { blocks, moveBlock, selectBlock, previewMode } = useEditorStore();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = blocks.findIndex((b) => b.id === active.id);
    const newIndex = blocks.findIndex((b) => b.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      moveBlock(oldIndex, newIndex);
    }
  }

  return (
    <div className={styles.canvas} onClick={() => selectBlock(null)}>
      <div
        className={styles.page}
        style={{
          maxWidth: previewWidths[previewMode],
          transition: "max-width 300ms ease",
        }}
      >
        {blocks.length === 0 ? (
          <div className={styles.empty}>
            <p>Your page is empty</p>
            <span>Add a block from the sidebar or click below</span>
            <button className={styles.addButton} onClick={onAddBlock}>
              <Plus size={20} />
              Add your first block
            </button>
          </div>
        ) : (
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
                <BlockWrapper key={block.id} id={block.id}>
                  <BlockRenderer block={block} />
                </BlockWrapper>
              ))}
            </SortableContext>
          </DndContext>
        )}

        {blocks.length > 0 && (
          <button className={styles.addBlockBottom} onClick={onAddBlock}>
            <Plus size={16} />
            Add block
          </button>
        )}
      </div>
    </div>
  );
}
