import { create } from "zustand";
import { type EditorBlock, type BlockContent, type BlockSettings, type ColumnsContent } from "@/types/blocks";
import { createBlock } from "@/lib/blocks";
import { generateId } from "@/lib/utils";
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
  isSaving: boolean;
  saveError: string | null;
  pageId: string | null;
  pageTitle: string;
  pageDescription: string | null;
  pageSlug: string;
  lastSavedAt: string | null;
  conflict: ConflictState | null;
  previewMode: PreviewMode;

  // History
  history: HistoryEntry[];
  historyIndex: number;

  // Actions
  setPage: (pageId: string, title: string, blocks: EditorBlock[], updatedAt: string, description?: string | null, slug?: string) => void;
  addBlock: (type: BlockType, index?: number) => void;
  removeBlock: (id: string) => void;
  updateBlockContent: (id: string, content: Partial<BlockContent>) => void;
  updateBlockSettings: (id: string, settings: Partial<BlockSettings>) => void;
  moveBlock: (fromIndex: number, toIndex: number) => void;
  selectBlock: (id: string | null) => void;
  setBlocks: (blocks: EditorBlock[]) => void;
  setDirty: (dirty: boolean) => void;
  setSaving: (saving: boolean) => void;
  setSaveError: (error: string | null) => void;
  setPageTitle: (title: string) => void;
  setPageDescription: (description: string | null) => void;
  setPageSlug: (slug: string) => void;
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

export const useEditorStore = create<EditorState>((set, get) => ({
  blocks: [],
  selectedBlockId: null,
  isDirty: false,
  isSaving: false,
  saveError: null,
  pageId: null,
  pageTitle: "",
  pageDescription: null,
  pageSlug: "",
  lastSavedAt: null,
  conflict: null,
  history: [],
  historyIndex: -1,
  previewMode: "desktop",

  setPage: (pageId, title, blocks, updatedAt, description, slug) => {
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
      blocks,
      selectedBlockId: null,
      isDirty: false,
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
        saveError: null,
        ...pushHistory({ ...state, blocks: newBlocks }),
      };
    }),

  removeBlock: (id) =>
    set((state) => {
      const newBlocks = state.blocks.filter((b) => b.id !== id);
      return {
        blocks: newBlocks,
        selectedBlockId:
          state.selectedBlockId === id ? null : state.selectedBlockId,
        isDirty: true,
        saveError: null,
        ...pushHistory({ ...state, blocks: newBlocks }),
      };
    }),

  updateBlockContent: (id, content) => {
    set((state) => {
      const newBlocks = state.blocks.map((b) =>
        b.id === id ? { ...b, content: { ...b.content, ...content } } : b
      );
      return {
        blocks: newBlocks,
        isDirty: true,
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
        saveError: null,
        ...pushHistory({ ...state, blocks: newBlocks }),
      };
    }),

  moveBlock: (fromIndex, toIndex) =>
    set((state) => {
      const newBlocks = [...state.blocks];
      const [moved] = newBlocks.splice(fromIndex, 1);
      newBlocks.splice(toIndex, 0, moved);
      return {
        blocks: newBlocks,
        isDirty: true,
        saveError: null,
        ...pushHistory({ ...state, blocks: newBlocks }),
      };
    }),

  selectBlock: (id) => set({ selectedBlockId: id }),

  setBlocks: (blocks) =>
    set((state) => ({
      blocks,
      ...pushHistory({ ...state, blocks }),
    })),

  setDirty: (dirty) => set({ isDirty: dirty, ...(dirty ? { saveError: null } : {}) }),
  setSaving: (saving) => set({ isSaving: saving }),
  setSaveError: (error) => set({ saveError: error }),
  setPageTitle: (title) => set({ pageTitle: title, isDirty: true, saveError: null }),
  setPageDescription: (description) => set({ pageDescription: description, isDirty: true, saveError: null }),
  setPageSlug: (slug) => set({ pageSlug: slug, isDirty: true, saveError: null }),
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
        saveError: null,
        history: [{ blocks: structuredClone(blocks) }],
        historyIndex: 0,
      };
    }),

  resolveConflictKeepLocal: () =>
    set({
      conflict: null,
      isDirty: true,
    }),

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
            saveError: null,
            ...pushHistory({ ...state, blocks: newBlocks }),
          };
        }
      }

      return state;
    }),

  setPreviewMode: (mode) => set({ previewMode: mode }),

  // Column-aware actions
  addBlockToColumn: (parentId, colIndex, type) =>
    set((state) => {
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
        saveError: null,
        ...pushHistory({ ...state, blocks: newBlocks }),
      };
    }),

  removeBlockFromColumn: (parentId, blockId) =>
    set((state) => {
      const newBlocks = state.blocks.map((b) => {
        if (b.id !== parentId || b.type !== "columns") return b;
        const cols = (b.content as ColumnsContent).columns.map((col) => ({
          blocks: col.blocks.filter((cb) => cb.id !== blockId),
        }));
        return { ...b, content: { columns: cols } };
      });
      return {
        blocks: newBlocks,
        selectedBlockId: state.selectedBlockId === blockId ? null : state.selectedBlockId,
        isDirty: true,
        saveError: null,
        ...pushHistory({ ...state, blocks: newBlocks }),
      };
    }),

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
      return { blocks: newBlocks, isDirty: true, saveError: null };
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
        saveError: null,
        ...pushHistory({ ...state, blocks: newBlocks }),
      };
    }),

  moveBlockInColumn: (parentId, colIndex, fromIndex, toIndex) =>
    set((state) => {
      const newBlocks = state.blocks.map((b) => {
        if (b.id !== parentId || b.type !== "columns") return b;
        const cols = structuredClone((b.content as ColumnsContent).columns);
        if (colIndex < 0 || colIndex >= cols.length) return b;
        const colBlocks = cols[colIndex].blocks;
        if (fromIndex < 0 || fromIndex >= colBlocks.length || toIndex < 0 || toIndex >= colBlocks.length) return b;
        const [moved] = colBlocks.splice(fromIndex, 1);
        colBlocks.splice(toIndex, 0, moved);
        return { ...b, content: { columns: cols } };
      });
      return {
        blocks: newBlocks,
        isDirty: true,
        saveError: null,
        ...pushHistory({ ...state, blocks: newBlocks }),
      };
    }),

  undo: () =>
    set((state) => {
      if (state.historyIndex <= 0) return state;
      const newIndex = state.historyIndex - 1;
      return {
        blocks: structuredClone(state.history[newIndex].blocks),
        historyIndex: newIndex,
        isDirty: true,
      };
    }),

  redo: () =>
    set((state) => {
      if (state.historyIndex >= state.history.length - 1) return state;
      const newIndex = state.historyIndex + 1;
      return {
        blocks: structuredClone(state.history[newIndex].blocks),
        historyIndex: newIndex,
        isDirty: true,
      };
    }),
}));
