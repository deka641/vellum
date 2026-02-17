"use client";

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

function getShortcuts(): Shortcut[] {
  const mod = isMac() ? "\u2318" : "Ctrl";
  return [
    { label: "Save", keys: [mod, "S"] },
    { label: "Undo", keys: [mod, "Z"] },
    { label: "Redo", keys: [mod, "Shift", "Z"] },
    { label: "Duplicate block", keys: [mod, "D"] },
    { label: "Delete block", keys: ["Delete / Backspace"] },
    { label: "Deselect", keys: ["Escape"] },
  ];
}

export function KeyboardShortcutsDialog() {
  const shortcuts = getShortcuts();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <IconButton icon={<Keyboard size={16} />} label="Keyboard shortcuts" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>Available shortcuts in the editor</DialogDescription>
        </DialogHeader>
        <div className={styles.shortcutList}>
          {shortcuts.map((shortcut) => (
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
      </DialogContent>
    </Dialog>
  );
}
