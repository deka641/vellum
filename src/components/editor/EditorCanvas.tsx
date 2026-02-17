"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Plus, Type, AlignLeft, Image as ImageIcon, Columns2, Sparkles } from "lucide-react";
import { type BlockType } from "@/types/blocks";
import { useEditorStore } from "@/stores/editor-store";
import { BlockWrapper } from "./BlockWrapper";
import { BlockRenderer } from "./BlockRenderer";
import { InlineAddButton } from "./InlineAddButton";
import styles from "./EditorCanvas.module.css";

interface EditorCanvasProps {
  onAddBlock: () => void;
}

const previewWidths = {
  desktop: "100%",
  tablet: "768px",
  mobile: "375px",
} as const;

const blockMotion = {
  initial: { opacity: 0, y: -8, scaleY: 0.95 },
  animate: { opacity: 1, y: 0, scaleY: 1 },
  exit: { opacity: 0, x: -20, scaleY: 0.95 },
  transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
};

const blockMotionReduced = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.15 },
};

export function EditorCanvas({ onAddBlock }: EditorCanvasProps) {
  const { blocks, moveBlock, addBlock, selectBlock, previewMode } = useEditorStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const motion_ = shouldReduceMotion ? blockMotionReduced : blockMotion;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;

    const oldIndex = blocks.findIndex((b) => b.id === active.id);
    const newIndex = blocks.findIndex((b) => b.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      moveBlock(oldIndex, newIndex);
    }
  }, [blocks, moveBlock]);

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  const activeBlock = activeId ? blocks.find((b) => b.id === activeId) : null;

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
            <div className={styles.emptyIcon}>
              <Sparkles size={32} />
            </div>
            <p>Start building your page</p>
            <span>Pick a block type to get started</span>
            <div className={styles.quickBlocks}>
              {[
                { type: "heading" as BlockType, icon: <Type size={20} />, label: "Heading" },
                { type: "text" as BlockType, icon: <AlignLeft size={20} />, label: "Text" },
                { type: "image" as BlockType, icon: <ImageIcon size={20} />, label: "Image" },
                { type: "columns" as BlockType, icon: <Columns2 size={20} />, label: "Columns" },
              ].map((item) => (
                <button
                  key={item.type}
                  className={styles.quickBlock}
                  onClick={(e) => {
                    e.stopPropagation();
                    addBlock(item.type);
                  }}
                >
                  <div className={styles.quickBlockIcon}>{item.icon}</div>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
            <button
              className={styles.addButton}
              onClick={(e) => {
                e.stopPropagation();
                onAddBlock();
              }}
            >
              <Plus size={16} />
              Or choose from all blocks
            </button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <SortableContext
              items={blocks.map((b) => b.id)}
              strategy={verticalListSortingStrategy}
            >
              <AnimatePresence initial={false} mode="popLayout">
                {blocks.map((block, index) => (
                  <motion.div
                    key={block.id}
                    layout={!shouldReduceMotion}
                    initial={motion_.initial}
                    animate={motion_.animate}
                    exit={motion_.exit}
                    transition={motion_.transition}
                  >
                    <InlineAddButton onAdd={(type: BlockType) => addBlock(type, index)} />
                    <BlockWrapper id={block.id}>
                      <BlockRenderer block={block} />
                    </BlockWrapper>
                  </motion.div>
                ))}
              </AnimatePresence>
            </SortableContext>
            <DragOverlay dropAnimation={null}>
              {activeBlock ? (
                <div className={styles.dragOverlay}>
                  <BlockRenderer block={activeBlock} />
                </div>
              ) : null}
            </DragOverlay>
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
