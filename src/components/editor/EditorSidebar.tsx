"use client";

import { useState, useEffect } from "react";
import { Plus, Settings2, X } from "lucide-react";
import { useEditorStore } from "@/stores/editor-store";
import { AddBlockMenu } from "./AddBlockMenu";
import { BlockSettings } from "./BlockSettings";
import type { BlockType } from "@/types/blocks";
import styles from "./EditorSidebar.module.css";

type Tab = "add" | "settings";

interface EditorSidebarProps {
  mobileOpen?: boolean;
  onMobileToggle?: () => void;
}

export function EditorSidebar({ mobileOpen, onMobileToggle }: EditorSidebarProps) {
  const [activeTab, setActiveTab] = useState<Tab>("add");
  const { selectedBlockId, addBlock } = useEditorStore();

  function handleAddBlock(type: BlockType) {
    addBlock(type);
    setActiveTab("settings");
  }

  // Auto-switch to settings when a block is selected
  useEffect(() => {
    if (selectedBlockId) {
      setActiveTab("settings");
    }
  }, [selectedBlockId]);

  const showSettings = selectedBlockId && activeTab === "settings";

  return (
    <>
      <button
        className={styles.toggleButton}
        onClick={onMobileToggle}
        aria-label={mobileOpen ? "Close sidebar" : "Open sidebar"}
      >
        {mobileOpen ? <X size={20} /> : <Settings2 size={20} />}
      </button>
      <aside className={`${styles.sidebar} ${mobileOpen ? styles.sidebarOpen : ""}`}>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === "add" ? styles.active : ""}`}
            onClick={() => setActiveTab("add")}
          >
            <Plus size={16} />
            Add Block
          </button>
          <button
            className={`${styles.tab} ${activeTab === "settings" ? styles.active : ""}`}
            onClick={() => setActiveTab("settings")}
          >
            <Settings2 size={16} />
            Settings
          </button>
        </div>
        <div className={styles.content}>
          {activeTab === "add" ? (
            <AddBlockMenu onAdd={handleAddBlock} />
          ) : (
            <BlockSettings />
          )}
        </div>
      </aside>
    </>
  );
}
