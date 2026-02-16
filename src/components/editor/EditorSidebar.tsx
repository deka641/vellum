"use client";

import { useState } from "react";
import { Plus, Settings2 } from "lucide-react";
import { useEditorStore } from "@/stores/editor-store";
import { AddBlockMenu } from "./AddBlockMenu";
import { BlockSettings } from "./BlockSettings";
import type { BlockType } from "@/types/blocks";
import styles from "./EditorSidebar.module.css";

type Tab = "add" | "settings";

export function EditorSidebar() {
  const [activeTab, setActiveTab] = useState<Tab>("add");
  const { selectedBlockId, addBlock } = useEditorStore();

  function handleAddBlock(type: BlockType) {
    addBlock(type);
    setActiveTab("settings");
  }

  // Auto-switch to settings when a block is selected
  const showSettings = selectedBlockId && activeTab === "settings";

  return (
    <aside className={styles.sidebar}>
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
  );
}
