import { create } from "zustand";
import { type EditorBlock, type BlockContent, type BlockSettings } from "@/types/blocks";
import { createBlock } from "@/lib/blocks";
import type { BlockType } from "@/types/blocks";

interface HistoryEntry {
  blocks: EditorBlock[];
}

interface ConflictState {
  serverBlocks: EditorBlock[];
  serverTitle: string;
  serverUpdatedAt: string;
}

interface EditorState {
  blocks: EditorBlock[];
  selectedBlockId: string | null;
  isDirty: boolean;
  isSaving: boolean;
  saveError: string | null;
  pageId: string | null;
  pageTitle: string;
  lastSavedAt: string | null;
  conflict: ConflictState | null;

  // History
  history: HistoryEntry[];
  historyIndex: number;

  // Actions
  setPage: (pageId: string, title: string, blocks: EditorBlock[], updatedAt: string) => void;
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
  setLastSavedAt: (updatedAt: string) => void;
  setConflict: (conflict: ConflictState) => void;
  resolveConflictLoadServer: () => void;
  resolveConflictKeepLocal: () => void;
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
  lastSavedAt: null,
  conflict: null,
  history: [],
  historyIndex: -1,

  setPage: (pageId, title, blocks, updatedAt) =>
    set({
      pageId,
      pageTitle: title,
      blocks,
      selectedBlockId: null,
      isDirty: false,
      saveError: null,
      lastSavedAt: updatedAt,
      conflict: null,
      history: [{ blocks: structuredClone(blocks) }],
      historyIndex: 0,
    }),

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
