"use client";

import { memo, type ReactNode, useCallback, useState, useEffect, useRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, Copy, Clipboard, Eye, EyeOff, Bookmark, RefreshCw } from "lucide-react";
import { useEditorStore } from "@/stores/editor-store";
import { useShallow } from "zustand/react/shallow";
import { useToast } from "@/components/ui/Toast/Toast";
import { ErrorBoundary, BlockErrorFallback } from "@/components/ErrorBoundary";
import { cn } from "@/lib/utils";
import type { BlockType } from "@/types/blocks";
import styles from "./BlockWrapper.module.css";

interface BlockWrapperProps {
  id: string;
  children: ReactNode;
  onMultiSelect?: (id: string) => void;
  onRangeSelect?: (id: string) => void;
}

export const BlockWrapper = memo(function BlockWrapper({ id, children, onMultiSelect, onRangeSelect }: BlockWrapperProps) {
  const isSelected = useEditorStore((s) => s.selectedBlockId === id);
  const isMultiSelected = useEditorStore((s) => s.selectedBlockIds.has(id));
  const multiSelectCount = useEditorStore((s) => s.selectedBlockIds.size);
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
  const convertBlock = useEditorStore((s) => s.convertBlock);
  const updateBlockSettings = useEditorStore((s) => s.updateBlockSettings);
  const undo = useEditorStore((s) => s.undo);
  const { toast } = useToast();
  const [showConvertMenu, setShowConvertMenu] = useState(false);
  const convertMenuRef = useRef<HTMLDivElement>(null);

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
    if (e.shiftKey && onRangeSelect) {
      onRangeSelect(id);
    } else if ((e.metaKey || e.ctrlKey) && onMultiSelect) {
      onMultiSelect(id);
    } else {
      selectBlock(id);
    }
  }, [id, selectBlock, onMultiSelect, onRangeSelect]);

  const handleDuplicate = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    duplicateBlock(id);
  }, [id, duplicateBlock]);

  const handleCopy = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    copyBlock(id);
    toast("Block copied to clipboard", "info");
  }, [id, copyBlock, toast]);

  const convertibleTypes: Record<string, { type: BlockType; label: string }[]> = {
    heading: [
      { type: "text", label: "Text" },
      { type: "quote", label: "Quote" },
    ],
    text: [
      { type: "heading", label: "Heading" },
      { type: "quote", label: "Quote" },
    ],
    quote: [
      { type: "heading", label: "Heading" },
      { type: "text", label: "Text" },
    ],
  };
  const canConvert = blockType ? blockType in convertibleTypes : false;

  const handleConvert = useCallback((toType: BlockType) => {
    convertBlock(id, toType);
    setShowConvertMenu(false);
    toast(`Converted to ${toType}`, "info");
  }, [id, convertBlock, toast]);

  // Close convert menu on outside click
  useEffect(() => {
    if (!showConvertMenu) return;
    function handleClickOutside(e: MouseEvent) {
      if (convertMenuRef.current && !convertMenuRef.current.contains(e.target as Node)) {
        setShowConvertMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showConvertMenu]);

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
        isSelected && multiSelectCount <= 1 && styles.selected,
        isMultiSelected && multiSelectCount > 1 && styles.multiSelected,
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
        {canConvert && (
          <div className={styles.convertWrapper} ref={convertMenuRef}>
            <button
              className={styles.convertButton}
              onClick={(e) => { e.stopPropagation(); setShowConvertMenu(!showConvertMenu); }}
              title="Convert block type"
              aria-label="Convert block type"
              aria-expanded={showConvertMenu}
            >
              <RefreshCw size={14} />
            </button>
            {showConvertMenu && blockType && convertibleTypes[blockType] && (
              <div className={styles.convertMenu}>
                {convertibleTypes[blockType].map((opt) => (
                  <button
                    key={opt.type}
                    className={styles.convertMenuItem}
                    onClick={(e) => { e.stopPropagation(); handleConvert(opt.type); }}
                  >
                    Convert to {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
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
