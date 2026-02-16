import { create } from "zustand";
import { type EditorBlock, type BlockContent, type BlockSettings } from "@/types/blocks";
import { createBlock } from "@/lib/blocks";
import type { BlockType } from "@/types/blocks";

interface HistoryEntry {
  blocks: EditorBlock[];
}

interface EditorState {
  blocks: EditorBlock[];
  selectedBlockId: string | null;
  isDirty: boolean;
  isSaving: boolean;
  pageId: string | null;
  pageTitle: string;

  // History
  history: HistoryEntry[];
  historyIndex: number;

  // Actions
  setPage: (pageId: string, title: string, blocks: EditorBlock[]) => void;
  addBlock: (type: BlockType, index?: number) => void;
  removeBlock: (id: string) => void;
  updateBlockContent: (id: string, content: Partial<BlockContent>) => void;
  updateBlockSettings: (id: string, settings: Partial<BlockSettings>) => void;
  moveBlock: (fromIndex: number, toIndex: number) => void;
  selectBlock: (id: string | null) => void;
  setBlocks: (blocks: EditorBlock[]) => void;
  setDirty: (dirty: boolean) => void;
  setSaving: (saving: boolean) => void;
  setPageTitle: (title: string) => void;
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

export const useEditorStore = create<EditorState>((set, get) => ({
  blocks: [],
  selectedBlockId: null,
  isDirty: false,
  isSaving: false,
  pageId: null,
  pageTitle: "",
  history: [],
  historyIndex: -1,

  setPage: (pageId, title, blocks) =>
    set({
      pageId,
      pageTitle: title,
      blocks,
      selectedBlockId: null,
      isDirty: false,
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
        ...pushHistory({ ...state, blocks: newBlocks }),
      };
    }),

  updateBlockContent: (id, content) =>
    set((state) => {
      const newBlocks = state.blocks.map((b) =>
        b.id === id ? { ...b, content: { ...b.content, ...content } } : b
      );
      return {
        blocks: newBlocks,
        isDirty: true,
      };
    }),

  updateBlockSettings: (id, settings) =>
    set((state) => {
      const newBlocks = state.blocks.map((b) =>
        b.id === id ? { ...b, settings: { ...b.settings, ...settings } } : b
      );
      return {
        blocks: newBlocks,
        isDirty: true,
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
        ...pushHistory({ ...state, blocks: newBlocks }),
      };
    }),

  selectBlock: (id) => set({ selectedBlockId: id }),

  setBlocks: (blocks) =>
    set((state) => ({
      blocks,
      ...pushHistory({ ...state, blocks }),
    })),

  setDirty: (dirty) => set({ isDirty: dirty }),
  setSaving: (saving) => set({ isSaving: saving }),
  setPageTitle: (title) => set({ pageTitle: title, isDirty: true }),

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
