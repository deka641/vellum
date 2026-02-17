"use client";

import { useState, useRef, useEffect } from "react";
import { Plus } from "lucide-react";
import { type BlockType } from "@/types/blocks";
import { AddBlockMenu } from "./AddBlockMenu";
import styles from "./InlineAddButton.module.css";

interface InlineAddButtonProps {
  onAdd: (type: BlockType) => void;
}

export function InlineAddButton({ onAdd }: InlineAddButtonProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className={styles.wrapper} ref={ref}>
      <button
        className={styles.trigger}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        aria-label="Insert block"
      >
        <Plus size={14} />
      </button>
      {open && (
        <div className={styles.popover} onClick={(e) => e.stopPropagation()}>
          <AddBlockMenu
            onAdd={(type) => {
              onAdd(type);
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
