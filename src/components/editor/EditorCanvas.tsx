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
import { Plus, Type, AlignLeft, Image as ImageIcon, Columns2, Sparkles, Upload } from "lucide-react";
import { type BlockType } from "@/types/blocks";
import { useEditorStore } from "@/stores/editor-store";
import { useToast } from "@/components/ui/Toast/Toast";
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

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/avif"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function EditorCanvas({ onAddBlock }: EditorCanvasProps) {
  const blocks = useEditorStore((s) => s.blocks);
  const moveBlock = useEditorStore((s) => s.moveBlock);
  const addBlock = useEditorStore((s) => s.addBlock);
  const selectBlock = useEditorStore((s) => s.selectBlock);
  const previewMode = useEditorStore((s) => s.previewMode);
  const updateBlockContent = useEditorStore((s) => s.updateBlockContent);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadingBlocks, setUploadingBlocks] = useState<Set<string>>(new Set());
  const shouldReduceMotion = useReducedMotion();
  const motion_ = shouldReduceMotion ? blockMotionReduced : blockMotion;
  const { toast } = useToast();

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

  const handleAddBlockAt = useCallback((type: BlockType, index: number) => {
    addBlock(type, index);
  }, [addBlock]);

  // File drop handlers
  const handleFileDragOver = useCallback((e: React.DragEvent) => {
    // Only show overlay for files (not DnD kit)
    if (e.dataTransfer.types.includes("Files")) {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(true);
    }
  }, []);

  const handleFileDragLeave = useCallback((e: React.DragEvent) => {
    // Only reset if leaving the canvas area
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragOver(false);
    }
  }, []);

  const handleFileDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter((f) => ACCEPTED_IMAGE_TYPES.includes(f.type));

    if (imageFiles.length === 0 && files.length > 0) {
      toast("Only images can be dropped here", "info");
      return;
    }

    for (const file of imageFiles) {
      if (file.size > MAX_FILE_SIZE) {
        toast(`${file.name} exceeds 10MB limit`, "error");
        continue;
      }

      // Create a placeholder image block
      const store = useEditorStore.getState();
      store.addBlock("image");
      const newBlock = useEditorStore.getState().blocks[useEditorStore.getState().blocks.length - 1];
      const blockId = newBlock.id;

      setUploadingBlocks((prev) => new Set(prev).add(blockId));

      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/media", { method: "POST", body: formData });

        if (!res.ok) {
          throw new Error("Upload failed");
        }

        const media = await res.json();
        updateBlockContent(blockId, {
          src: media.url,
          alt: media.alt || file.name,
          mediaId: media.id,
          ...(media.width ? { width: media.width } : {}),
          ...(media.height ? { height: media.height } : {}),
        });
      } catch {
        toast(`Failed to upload ${file.name}`, "error");
        useEditorStore.getState().removeBlock(blockId);
      } finally {
        setUploadingBlocks((prev) => {
          const next = new Set(prev);
          next.delete(blockId);
          return next;
        });
      }
    }
  }, [toast, updateBlockContent]);

  const activeBlock = activeId ? blocks.find((b) => b.id === activeId) : null;

  return (
    <div
      className={styles.canvas}
      onClick={() => selectBlock(null)}
      onDragOver={handleFileDragOver}
      onDragLeave={handleFileDragLeave}
      onDrop={handleFileDrop}
    >
      {isDragOver && (
        <div className={styles.dropOverlay}>
          <div className={styles.dropOverlayContent}>
            <Upload size={32} />
            <span>Drop images here</span>
          </div>
        </div>
      )}
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
                    <InlineAddButton onAdd={(type: BlockType) => handleAddBlockAt(type, index)} />
                    <BlockWrapper id={block.id}>
                      {uploadingBlocks.has(block.id) ? (
                        <div className={styles.uploadingPlaceholder}>
                          <div className={styles.uploadingSpinner} />
                          <span>Uploading...</span>
                        </div>
                      ) : (
                        <BlockRenderer block={block} />
                      )}
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
