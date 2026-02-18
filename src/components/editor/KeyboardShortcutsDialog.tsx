"use client";

import { useState, useEffect, useCallback } from "react";
import { Keyboard } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton/IconButton";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/Dialog/Dialog";
import styles from "./KeyboardShortcutsDialog.module.css";

function isMac(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform);
}

interface Shortcut {
  label: string;
  keys: string[];
}

interface ShortcutGroup {
  title: string;
  shortcuts: Shortcut[];
}

function getShortcutGroups(): ShortcutGroup[] {
  const mod = isMac() ? "\u2318" : "Ctrl";
  return [
    {
      title: "General",
      shortcuts: [
        { label: "Save", keys: [mod, "S"] },
        { label: "Undo", keys: [mod, "Z"] },
        { label: "Redo", keys: [mod, "Shift", "Z"] },
        { label: "Keyboard shortcuts", keys: ["?"] },
      ],
    },
    {
      title: "Block actions",
      shortcuts: [
        { label: "Copy block", keys: [mod, "C"] },
        { label: "Paste block", keys: [mod, "V"] },
        { label: "Duplicate block", keys: [mod, "D"] },
        { label: "Delete block", keys: ["Delete / Backspace"] },
        { label: "Deselect block", keys: ["Escape"] },
        { label: "Move block up", keys: ["Alt", "\u2191"] },
        { label: "Move block down", keys: ["Alt", "\u2193"] },
      ],
    },
    {
      title: "Text formatting",
      shortcuts: [
        { label: "Bold", keys: [mod, "B"] },
        { label: "Italic", keys: [mod, "I"] },
        { label: "Strikethrough", keys: [mod, "Shift", "X"] },
      ],
    },
  ];
}

export function KeyboardShortcutsDialog() {
  const [open, setOpen] = useState(false);
  const groups = getShortcutGroups();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "?" && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const target = e.target as HTMLElement;
      const isEditing =
        target.isContentEditable ||
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.closest(".tiptap");
      if (isEditing) return;
      e.preventDefault();
      setOpen(true);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <IconButton icon={<Keyboard size={16} />} label="Keyboard shortcuts (?)" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>Available shortcuts in the editor</DialogDescription>
        </DialogHeader>
        <div className={styles.groups}>
          {groups.map((group) => (
            <div key={group.title} className={styles.group}>
              <h4 className={styles.groupTitle}>{group.title}</h4>
              <div className={styles.shortcutList}>
                {group.shortcuts.map((shortcut) => (
                  <div key={shortcut.label} className={styles.shortcutRow}>
                    <span className={styles.shortcutLabel}>{shortcut.label}</span>
                    <span className={styles.shortcutKeys}>
                      {shortcut.keys.map((key, i) => (
                        <span key={i}>
                          {i > 0 && <span className={styles.plus}> + </span>}
                          <kbd className={styles.kbd}>{key}</kbd>
                        </span>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
