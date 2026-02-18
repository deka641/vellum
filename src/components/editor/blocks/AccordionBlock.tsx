"use client";

import { useCallback } from "react";
import { Plus, Trash2, ChevronDown, GripVertical } from "lucide-react";
import type { AccordionContent, BlockSettings } from "@/types/blocks";
import { useEditorStore } from "@/stores/editor-store";
import { generateId } from "@/lib/utils";
import styles from "./blocks.module.css";

interface AccordionBlockProps {
  id: string;
  content: AccordionContent;
  settings: BlockSettings;
}

export function AccordionBlock({ id, content }: AccordionBlockProps) {
  const updateBlockContent = useEditorStore((s) => s.updateBlockContent);

  const updateItem = useCallback(
    (itemId: string, field: "title" | "content", value: string) => {
      const newItems = content.items.map((item) =>
        item.id === itemId ? { ...item, [field]: value } : item
      );
      updateBlockContent(id, { items: newItems });
    },
    [id, content.items, updateBlockContent]
  );

  const addItem = useCallback(() => {
    const newItems = [
      ...content.items,
      { id: generateId(), title: "New item", content: "<p>Content here</p>" },
    ];
    updateBlockContent(id, { items: newItems });
  }, [id, content.items, updateBlockContent]);

  const removeItem = useCallback(
    (itemId: string) => {
      if (content.items.length <= 1) return;
      const newItems = content.items.filter((item) => item.id !== itemId);
      updateBlockContent(id, { items: newItems });
    },
    [id, content.items, updateBlockContent]
  );

  const moveItem = useCallback(
    (fromIndex: number, direction: "up" | "down") => {
      const toIndex = direction === "up" ? fromIndex - 1 : fromIndex + 1;
      if (toIndex < 0 || toIndex >= content.items.length) return;
      const newItems = [...content.items];
      const [moved] = newItems.splice(fromIndex, 1);
      newItems.splice(toIndex, 0, moved);
      updateBlockContent(id, { items: newItems });
    },
    [id, content.items, updateBlockContent]
  );

  const setStyle = useCallback(
    (style: "bordered" | "minimal") => {
      updateBlockContent(id, { style });
    },
    [id, updateBlockContent]
  );

  return (
    <div className={styles.accordionEditor} onClick={(e) => e.stopPropagation()}>
      <div className={styles.accordionStyleToggle}>
        <button
          className={`${styles.accordionStyleBtn} ${content.style === "bordered" ? styles.accordionStyleActive : ""}`}
          onClick={() => setStyle("bordered")}
        >
          Bordered
        </button>
        <button
          className={`${styles.accordionStyleBtn} ${content.style === "minimal" ? styles.accordionStyleActive : ""}`}
          onClick={() => setStyle("minimal")}
        >
          Minimal
        </button>
      </div>

      {content.items.map((item, index) => (
        <div
          key={item.id}
          className={`${styles.accordionItem} ${content.style === "bordered" ? styles.accordionItemBordered : ""}`}
        >
          <div className={styles.accordionItemHeader}>
            <button
              className={styles.accordionDragHandle}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                // Toggle up/down on click
                if (index > 0) moveItem(index, "up");
              }}
              title="Move up"
            >
              <GripVertical size={12} />
            </button>
            <ChevronDown size={14} className={styles.accordionChevron} />
            <input
              className={styles.accordionTitleInput}
              value={item.title}
              onChange={(e) => updateItem(item.id, "title", e.target.value)}
              placeholder="Accordion title"
            />
            <button
              className={styles.accordionDeleteBtn}
              onClick={(e) => {
                e.stopPropagation();
                removeItem(item.id);
              }}
              title="Remove item"
              disabled={content.items.length <= 1}
            >
              <Trash2 size={12} />
            </button>
          </div>
          <div className={styles.accordionItemBody}>
            <textarea
              className={styles.accordionContentInput}
              value={item.content.replace(/<[^>]*>/g, "")}
              onChange={(e) => updateItem(item.id, "content", `<p>${e.target.value}</p>`)}
              placeholder="Accordion content..."
              rows={2}
            />
          </div>
        </div>
      ))}

      <button className={styles.accordionAddBtn} onClick={addItem}>
        <Plus size={14} />
        Add item
      </button>
    </div>
  );
}
