"use client";

import { useState, useEffect } from "react";
import { Plus, Settings2, History, X } from "lucide-react";
import { useEditorStore } from "@/stores/editor-store";
import { AddBlockMenu } from "./AddBlockMenu";
import { BlockSettings } from "./BlockSettings";
import { RevisionHistory } from "./RevisionHistory";
import type { BlockType } from "@/types/blocks";
import styles from "./EditorSidebar.module.css";

type Tab = "add" | "settings" | "history";

interface EditorSidebarProps {
  mobileOpen?: boolean;
  onMobileToggle?: () => void;
}

export function EditorSidebar({ mobileOpen, onMobileToggle }: EditorSidebarProps) {
  const [activeTab, setActiveTab] = useState<Tab>("add");
  const selectedBlockId = useEditorStore((s) => s.selectedBlockId);
  const addBlock = useEditorStore((s) => s.addBlock);
  const pageId = useEditorStore((s) => s.pageId);

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
        <div className={styles.tabs} role="tablist" aria-label="Editor sidebar tabs">
          <button
            className={`${styles.tab} ${activeTab === "add" ? styles.active : ""}`}
            onClick={() => setActiveTab("add")}
            role="tab"
            aria-selected={activeTab === "add"}
            id="tab-add"
            aria-controls="tabpanel-add"
          >
            <Plus size={16} />
            Add Block
          </button>
          <button
            className={`${styles.tab} ${activeTab === "settings" ? styles.active : ""}`}
            onClick={() => setActiveTab("settings")}
            role="tab"
            aria-selected={activeTab === "settings"}
            id="tab-settings"
            aria-controls="tabpanel-settings"
          >
            <Settings2 size={16} />
            Settings
          </button>
          <button
            className={`${styles.tab} ${activeTab === "history" ? styles.active : ""}`}
            onClick={() => setActiveTab("history")}
            role="tab"
            aria-selected={activeTab === "history"}
            id="tab-history"
            aria-controls="tabpanel-history"
          >
            <History size={16} />
            History
          </button>
        </div>
        <div className={styles.content} role="tabpanel" id={`tabpanel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
          {activeTab === "add" && (
            <AddBlockMenu onAdd={handleAddBlock} />
          )}
          {activeTab === "settings" && (
            <BlockSettings />
          )}
          {activeTab === "history" && pageId && (
            <RevisionHistory pageId={pageId} />
          )}
        </div>
      </aside>
    </>
  );
}
