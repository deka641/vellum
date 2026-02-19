import { create } from "zustand";
import { type EditorBlock, type BlockContent, type BlockSettings, type ColumnsContent } from "@/types/blocks";
import { createBlock } from "@/lib/blocks";
import { generateId } from "@/lib/utils";
import { DISALLOWED_NESTED_TYPES } from "@/lib/validations";
import type { BlockType } from "@/types/blocks";

interface HistoryEntry {
  blocks: EditorBlock[];
}

interface ConflictState {
  serverBlocks: EditorBlock[];
  serverTitle: string;
  serverUpdatedAt: string;
}

type PreviewMode = "desktop" | "tablet" | "mobile";

interface EditorState {
  blocks: EditorBlock[];
  selectedBlockId: string | null;
  isDirty: boolean;
  blocksDirty: boolean;
  isSaving: boolean;
  saveError: string | null;
  pageId: string | null;
  pageTitle: string;
  pageDescription: string | null;
  pageSlug: string;
  pageMetaTitle: string | null;
  pageOgImage: string | null;
  pageNoindex: boolean;
  lastSavedAt: string | null;
  conflict: ConflictState | null;
  previewMode: PreviewMode;

  // Animation state
  exitingBlockIds: Set<string>;
  settledBlockId: string | null;

  // History
  history: HistoryEntry[];
  historyIndex: number;

  // Actions
  setPage: (pageId: string, title: string, blocks: EditorBlock[], updatedAt: string, description?: string | null, slug?: string, meta?: { metaTitle?: string | null; ogImage?: string | null; noindex?: boolean }) => void;
  addBlock: (type: BlockType, index?: number) => void;
  removeBlock: (id: string) => void;
  updateBlockContent: (id: string, content: Partial<BlockContent>) => void;
  updateBlockSettings: (id: string, settings: Partial<BlockSettings>) => void;
  moveBlock: (fromIndex: number, toIndex: number) => void;
  selectBlock: (id: string | null) => void;
  setBlocks: (blocks: EditorBlock[]) => void;
  setDirty: (dirty: boolean) => void;
  setBlocksDirty: (dirty: boolean) => void;
  setSaving: (saving: boolean) => void;
  setSaveError: (error: string | null) => void;
  setPageTitle: (title: string) => void;
  setPageDescription: (description: string | null) => void;
  setPageSlug: (slug: string) => void;
  setPageMetaTitle: (metaTitle: string | null) => void;
  setPageOgImage: (ogImage: string | null) => void;
  setPageNoindex: (noindex: boolean) => void;
  setLastSavedAt: (updatedAt: string) => void;
  setConflict: (conflict: ConflictState) => void;
  resolveConflictLoadServer: () => void;
  resolveConflictKeepLocal: () => void;
  duplicateBlock: (id: string) => void;
  setPreviewMode: (mode: PreviewMode) => void;

  // Column-aware actions
  addBlockToColumn: (parentId: string, colIndex: number, type: BlockType) => void;
  removeBlockFromColumn: (parentId: string, blockId: string) => void;
  updateColumnBlockContent: (parentId: string, blockId: string, content: Partial<BlockContent>) => void;
  updateColumnBlockSettings: (parentId: string, blockId: string, settings: Partial<BlockSettings>) => void;
  moveBlockInColumn: (parentId: string, colIndex: number, fromIndex: number, toIndex: number) => void;

  copyBlock: (id: string) => void;
  pasteBlock: () => void;
  undo: () => void;
  redo: () => void;
}

function pushHistory(state: EditorState): Partial<EditorState> {
  const newHistory = state.history.slice(0, state.historyIndex + 1);
  newHistory.push({ blocks: structuredClone(state.blocks) });
  if (newHistory.length > 50) newHistory.shift();
  return {
    history: newHistory,
    historyIndex: newHistory.length - 1,
  };
}

const CONTENT_HISTORY_DEBOUNCE = 500;
let contentHistoryTimer: ReturnType<typeof setTimeout> | null = null;

// Track pending remove-block timers so undo/redo can cancel them
const pendingRemoveTimers = new Set<ReturnType<typeof setTimeout>>();

export type BlockLocation =
  | { level: "top"; index: number }
  | { level: "column"; parentId: string; colIndex: number; index: number };

export function findBlockLocation(blocks: EditorBlock[], blockId: string): BlockLocation | null {
  const topIndex = blocks.findIndex((b) => b.id === blockId);
  if (topIndex !== -1) return { level: "top", index: topIndex };

  for (const block of blocks) {
    if (block.type !== "columns") continue;
    const cols = (block.content as ColumnsContent).columns;
    for (let ci = 0; ci < cols.length; ci++) {
      const idx = cols[ci].blocks.findIndex((cb) => cb.id === blockId);
      if (idx !== -1) return { level: "column", parentId: block.id, colIndex: ci, index: idx };
    }
  }
  return null;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  blocks: [],
  selectedBlockId: null,
  isDirty: false,
  blocksDirty: false,
  isSaving: false,
  saveError: null,
  pageId: null,
  pageTitle: "",
  pageDescription: null,
  pageSlug: "",
  pageMetaTitle: null,
  pageOgImage: null,
  pageNoindex: false,
  lastSavedAt: null,
  conflict: null,
  exitingBlockIds: new Set(),
  settledBlockId: null,
  history: [],
  historyIndex: -1,
  previewMode: "desktop",

  setPage: (pageId, title, blocks, updatedAt, description, slug, meta) => {
    // Clear any pending content history timer to prevent stale closures
    // from corrupting the new page's history stack
    if (contentHistoryTimer) {
      clearTimeout(contentHistoryTimer);
      contentHistoryTimer = null;
    }
    set({
      pageId,
      pageTitle: title,
      pageDescription: description ?? null,
      pageSlug: slug ?? "",
      pageMetaTitle: meta?.metaTitle ?? null,
      pageOgImage: meta?.ogImage ?? null,
      pageNoindex: meta?.noindex ?? false,
      blocks,
      selectedBlockId: null,
      isDirty: false,
      blocksDirty: false,
      saveError: null,
      lastSavedAt: updatedAt,
      conflict: null,
      history: [{ blocks: structuredClone(blocks) }],
      historyIndex: 0,
    });
  },

  addBlock: (type, index) =>
    set((state) => {
      const block = createBlock(type);
      const newBlocks = [...state.blocks];
      const insertAt = index !== undefined ? index : newBlocks.length;
      newBlocks.splice(insertAt, 0, block);
      return {
        blocks: newBlocks,
        selectedBlockId: block.id,
        isDirty: true,
        blocksDirty: true,
        saveError: null,
        ...pushHistory({ ...state, blocks: newBlocks }),
      };
    }),

  removeBlock: (id) => {
    // Add to exitingBlockIds to trigger exit animation
    set((state) => {
      const newExiting = new Set(state.exitingBlockIds);
      newExiting.add(id);
      return {
        exitingBlockIds: newExiting,
        selectedBlockId:
          state.selectedBlockId === id ? null : state.selectedBlockId,
      };
    });
    // Actually remove after animation completes
    const timer = setTimeout(() => {
      pendingRemoveTimers.delete(timer);
      set((state) => {
        const newExiting = new Set(state.exitingBlockIds);
        newExiting.delete(id);
        const newBlocks = state.blocks.filter((b) => b.id !== id);
        return {
          blocks: newBlocks,
          exitingBlockIds: newExiting,
          isDirty: true,
          blocksDirty: true,
          saveError: null,
          ...pushHistory({ ...state, blocks: newBlocks }),
        };
      });
    }, 200);
    pendingRemoveTimers.add(timer);
  },

  updateBlockContent: (id, content) => {
    set((state) => {
      const newBlocks = state.blocks.map((b) =>
        b.id === id ? { ...b, content: { ...b.content, ...content } } : b
      );
      return {
        blocks: newBlocks,
        isDirty: true,
        blocksDirty: true,
        saveError: null,
      };
    });

    // Debounced history push for content edits
    if (contentHistoryTimer) clearTimeout(contentHistoryTimer);
    contentHistoryTimer = setTimeout(() => {
      const state = get();
      set(pushHistory(state));
    }, CONTENT_HISTORY_DEBOUNCE);
  },

  updateBlockSettings: (id, settings) =>
    set((state) => {
      const newBlocks = state.blocks.map((b) =>
        b.id === id ? { ...b, settings: { ...b.settings, ...settings } } : b
      );
      return {
        blocks: newBlocks,
        isDirty: true,
        blocksDirty: true,
        saveError: null,
        ...pushHistory({ ...state, blocks: newBlocks }),
      };
    }),

  moveBlock: (fromIndex, toIndex) => {
    set((state) => {
      if (fromIndex < 0 || fromIndex >= state.blocks.length || toIndex < 0 || toIndex >= state.blocks.length) {
        return state;
      }
      const newBlocks = [...state.blocks];
      const [moved] = newBlocks.splice(fromIndex, 1);
      newBlocks.splice(toIndex, 0, moved);
      return {
        blocks: newBlocks,
        settledBlockId: moved.id,
        isDirty: true,
        blocksDirty: true,
        saveError: null,
        ...pushHistory({ ...state, blocks: newBlocks }),
      };
    });
    setTimeout(() => {
      set({ settledBlockId: null });
    }, 300);
  },

  selectBlock: (id) => set({ selectedBlockId: id }),

  setBlocks: (blocks) =>
    set((state) => ({
      blocks,
      ...pushHistory({ ...state, blocks }),
    })),

  setDirty: (dirty) => set({ isDirty: dirty, ...(dirty ? { saveError: null } : {}) }),
  setBlocksDirty: (dirty) => set({ blocksDirty: dirty }),
  setSaving: (saving) => set({ isSaving: saving }),
  setSaveError: (error) => set({ saveError: error }),
  setPageTitle: (title) => set({ pageTitle: title, isDirty: true, blocksDirty: true, saveError: null }),
  setPageDescription: (description) => set({ pageDescription: description, isDirty: true, saveError: null }),
  setPageSlug: (slug) => set({ pageSlug: slug, isDirty: true, saveError: null }),
  setPageMetaTitle: (metaTitle) => set({ pageMetaTitle: metaTitle, isDirty: true, saveError: null }),
  setPageOgImage: (ogImage) => set({ pageOgImage: ogImage, isDirty: true, saveError: null }),
  setPageNoindex: (noindex) => set({ pageNoindex: noindex, isDirty: true, saveError: null }),
  setLastSavedAt: (updatedAt) => set({ lastSavedAt: updatedAt }),
  setConflict: (conflict) => set({ conflict }),

  resolveConflictLoadServer: () =>
    set((state) => {
      if (!state.conflict) return state;
      const blocks = state.conflict.serverBlocks as EditorBlock[];
      return {
        blocks,
        pageTitle: state.conflict.serverTitle,
        lastSavedAt: state.conflict.serverUpdatedAt,
        conflict: null,
        isDirty: false,
        blocksDirty: false,
        saveError: null,
        history: [{ blocks: structuredClone(blocks) }],
        historyIndex: 0,
      };
    }),

  resolveConflictKeepLocal: () =>
    set((state) => ({
      conflict: null,
      isDirty: true,
      blocksDirty: true,
      // Update lastSavedAt to server's version so the next save's
      // expectedUpdatedAt matches the current server state
      lastSavedAt: state.conflict?.serverUpdatedAt ?? state.lastSavedAt,
    })),

  duplicateBlock: (id) =>
    set((state) => {
      function cloneBlock(block: EditorBlock): EditorBlock {
        const cloned = structuredClone(block);
        cloned.id = generateId();
        if (cloned.type === "columns") {
          const cols = cloned.content as ColumnsContent;
          cols.columns = cols.columns.map((col) => ({
            blocks: col.blocks.map(cloneBlock),
          }));
        }
        return cloned;
      }

      // Try top-level first
      const topIndex = state.blocks.findIndex((b) => b.id === id);
      if (topIndex !== -1) {
        const duplicate = cloneBlock(state.blocks[topIndex]);
        const newBlocks = [...state.blocks];
        newBlocks.splice(topIndex + 1, 0, duplicate);
        return {
          blocks: newBlocks,
          selectedBlockId: duplicate.id,
          isDirty: true,
          blocksDirty: true,
          saveError: null,
          ...pushHistory({ ...state, blocks: newBlocks }),
        };
      }

      // Search inside column children
      for (const block of state.blocks) {
        if (block.type !== "columns") continue;
        const cols = (block.content as ColumnsContent).columns;
        for (let ci = 0; ci < cols.length; ci++) {
          const colBlocks = cols[ci].blocks;
          const idx = colBlocks.findIndex((cb) => cb.id === id);
          if (idx === -1) continue;
          const duplicate = cloneBlock(colBlocks[idx]);
          const newCols = structuredClone(cols);
          newCols[ci].blocks.splice(idx + 1, 0, duplicate);
          const newBlocks = state.blocks.map((b) =>
            b.id === block.id ? { ...b, content: { columns: newCols } } : b
          );
          return {
            blocks: newBlocks,
            selectedBlockId: duplicate.id,
            isDirty: true,
            blocksDirty: true,
            saveError: null,
            ...pushHistory({ ...state, blocks: newBlocks }),
          };
        }
      }

      return state;
    }),

  setPreviewMode: (mode) => set({ previewMode: mode }),

  copyBlock: (id) => {
    const state = get();
    // Find block at top level
    let block = state.blocks.find((b) => b.id === id);
    // Search inside columns if not found
    if (!block) {
      for (const b of state.blocks) {
        if (b.type !== "columns") continue;
        const cols = (b.content as ColumnsContent).columns;
        for (const col of cols) {
          const found = col.blocks.find((cb) => cb.id === id);
          if (found) { block = found; break; }
        }
        if (block) break;
      }
    }
    if (!block) return;
    try {
      localStorage.setItem("vellum-clipboard", JSON.stringify(structuredClone(block)));
    } catch {
      // localStorage full or unavailable — silently ignore
    }
  },

  pasteBlock: () =>
    set((state) => {
      let raw: string | null;
      try {
        raw = localStorage.getItem("vellum-clipboard");
      } catch {
        return state;
      }
      if (!raw) return state;

      let parsed: EditorBlock;
      try {
        parsed = JSON.parse(raw) as EditorBlock;
      } catch {
        return state;
      }
      if (!parsed || !parsed.type || !parsed.id) return state;

      // Clone with new IDs
      function cloneBlock(block: EditorBlock): EditorBlock {
        const cloned = structuredClone(block);
        cloned.id = generateId();
        if (cloned.type === "columns") {
          const cols = cloned.content as ColumnsContent;
          cols.columns = cols.columns.map((col) => ({
            blocks: col.blocks.map(cloneBlock),
          }));
        }
        return cloned;
      }

      const newBlock = cloneBlock(parsed);

      // Insert after selected block, or at end
      const newBlocks = [...state.blocks];
      if (state.selectedBlockId) {
        const idx = newBlocks.findIndex((b) => b.id === state.selectedBlockId);
        if (idx !== -1) {
          newBlocks.splice(idx + 1, 0, newBlock);
        } else {
          newBlocks.push(newBlock);
        }
      } else {
        newBlocks.push(newBlock);
      }

      return {
        blocks: newBlocks,
        selectedBlockId: newBlock.id,
        isDirty: true,
        blocksDirty: true,
        saveError: null,
        ...pushHistory({ ...state, blocks: newBlocks }),
      };
    }),

  // Column-aware actions
  addBlockToColumn: (parentId, colIndex, type) =>
    set((state) => {
      if (DISALLOWED_NESTED_TYPES.includes(type)) return state;
      const block = createBlock(type);
      const newBlocks = state.blocks.map((b) => {
        if (b.id !== parentId || b.type !== "columns") return b;
        const cols = structuredClone((b.content as ColumnsContent).columns);
        if (colIndex < 0 || colIndex >= cols.length) return b;
        cols[colIndex].blocks.push(block);
        return { ...b, content: { columns: cols } };
      });
      return {
        blocks: newBlocks,
        selectedBlockId: block.id,
        isDirty: true,
        blocksDirty: true,
        saveError: null,
        ...pushHistory({ ...state, blocks: newBlocks }),
      };
    }),

  removeBlockFromColumn: (parentId, blockId) => {
    // Add to exitingBlockIds to trigger exit animation
    set((state) => {
      const newExiting = new Set(state.exitingBlockIds);
      newExiting.add(blockId);
      return {
        exitingBlockIds: newExiting,
        selectedBlockId: state.selectedBlockId === blockId ? null : state.selectedBlockId,
      };
    });
    // Actually remove after animation completes
    const timer = setTimeout(() => {
      pendingRemoveTimers.delete(timer);
      set((state) => {
        const newExiting = new Set(state.exitingBlockIds);
        newExiting.delete(blockId);
        const newBlocks = state.blocks.map((b) => {
          if (b.id !== parentId || b.type !== "columns") return b;
          const cols = (b.content as ColumnsContent).columns.map((col) => ({
            blocks: col.blocks.filter((cb) => cb.id !== blockId),
          }));
          return { ...b, content: { columns: cols } };
        });
        return {
          blocks: newBlocks,
          exitingBlockIds: newExiting,
          isDirty: true,
          blocksDirty: true,
          saveError: null,
          ...pushHistory({ ...state, blocks: newBlocks }),
        };
      });
    }, 200);
    pendingRemoveTimers.add(timer);
  },

  updateColumnBlockContent: (parentId, blockId, content) => {
    set((state) => {
      const newBlocks = state.blocks.map((b) => {
        if (b.id !== parentId || b.type !== "columns") return b;
        const cols = (b.content as ColumnsContent).columns.map((col) => ({
          blocks: col.blocks.map((cb) =>
            cb.id === blockId ? { ...cb, content: { ...cb.content, ...content } } : cb
          ),
        }));
        return { ...b, content: { columns: cols } };
      });
      return { blocks: newBlocks, isDirty: true, blocksDirty: true, saveError: null };
    });
    if (contentHistoryTimer) clearTimeout(contentHistoryTimer);
    contentHistoryTimer = setTimeout(() => {
      const state = get();
      set(pushHistory(state));
    }, CONTENT_HISTORY_DEBOUNCE);
  },

  updateColumnBlockSettings: (parentId, blockId, settings) =>
    set((state) => {
      const newBlocks = state.blocks.map((b) => {
        if (b.id !== parentId || b.type !== "columns") return b;
        const cols = (b.content as ColumnsContent).columns.map((col) => ({
          blocks: col.blocks.map((cb) =>
            cb.id === blockId ? { ...cb, settings: { ...cb.settings, ...settings } } : cb
          ),
        }));
        return { ...b, content: { columns: cols } };
      });
      return {
        blocks: newBlocks,
        isDirty: true,
        blocksDirty: true,
        saveError: null,
        ...pushHistory({ ...state, blocks: newBlocks }),
      };
    }),

  moveBlockInColumn: (parentId, colIndex, fromIndex, toIndex) => {
    let movedBlockId: string | null = null;
    set((state) => {
      const newBlocks = state.blocks.map((b) => {
        if (b.id !== parentId || b.type !== "columns") return b;
        const cols = structuredClone((b.content as ColumnsContent).columns);
        if (colIndex < 0 || colIndex >= cols.length) return b;
        const colBlocks = cols[colIndex].blocks;
        if (fromIndex < 0 || fromIndex >= colBlocks.length || toIndex < 0 || toIndex >= colBlocks.length) return b;
        const [moved] = colBlocks.splice(fromIndex, 1);
        colBlocks.splice(toIndex, 0, moved);
        movedBlockId = moved.id;
        return { ...b, content: { columns: cols } };
      });
      return {
        blocks: newBlocks,
        settledBlockId: movedBlockId,
        isDirty: true,
        blocksDirty: true,
        saveError: null,
        ...pushHistory({ ...state, blocks: newBlocks }),
      };
    });
    if (movedBlockId) {
      setTimeout(() => {
        set({ settledBlockId: null });
      }, 300);
    }
  },

  undo: () => {
    // Cancel pending remove-block timers to prevent them from firing after undo
    for (const timer of pendingRemoveTimers) clearTimeout(timer);
    pendingRemoveTimers.clear();
    set((state) => {
      if (state.historyIndex <= 0) return state;
      const newIndex = state.historyIndex - 1;
      return {
        blocks: structuredClone(state.history[newIndex].blocks),
        historyIndex: newIndex,
        isDirty: true,
        blocksDirty: true,
        exitingBlockIds: new Set(),
      };
    });
  },

  redo: () => {
    // Cancel pending remove-block timers to prevent them from firing after redo
    for (const timer of pendingRemoveTimers) clearTimeout(timer);
    pendingRemoveTimers.clear();
    set((state) => {
      if (state.historyIndex >= state.history.length - 1) return state;
      const newIndex = state.historyIndex + 1;
      return {
        blocks: structuredClone(state.history[newIndex].blocks),
        historyIndex: newIndex,
        isDirty: true,
        blocksDirty: true,
        exitingBlockIds: new Set(),
      };
    });
  },
}));
