import { create } from 'zustand';
import type { Character, Relationship } from '@/types';

const MAX_UNDO = 100;

interface UndoEntry {
  undo: () => Promise<void>;
  redo: () => Promise<void>;
}

interface GraphStoreState {
  characters: Character[];
  relationships: Relationship[];
  setCharacters: (cs: Character[]) => void;
  setRelationships: (rs: Relationship[]) => void;
  addCharacter: (char: Character) => void;
  removeCharacter: (id: string) => void;
  updateCharacterInStore: (char: Character) => void;
  addRelationship: (rel: Relationship) => void;
  removeRelationship: (id: string) => void;
  updateRelationshipInStore: (rel: Relationship) => void;

  undoStack: UndoEntry[];
  redoStack: UndoEntry[];
  pushUndo: (undoFn: () => Promise<void>, redoFn: () => Promise<void>) => void;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
}

export const useGraphStore = create<GraphStoreState>((set, get) => ({
  characters: [],
  relationships: [],
  undoStack: [],
  redoStack: [],

  setCharacters: (characters) => set({ characters }),
  setRelationships: (relationships) => set({ relationships }),
  addCharacter: (char) =>
    set((state) => ({ characters: [...state.characters, char] })),
  removeCharacter: (id) =>
    set((state) => ({
      characters: state.characters.filter((c) => c.id !== id),
      relationships: state.relationships.filter(
        (r) => r.sourceId !== id && r.targetId !== id,
      ),
    })),
  updateCharacterInStore: (char) =>
    set((state) => ({
      characters: state.characters.map((c) => (c.id === char.id ? char : c)),
    })),
  addRelationship: (rel) =>
    set((state) => ({ relationships: [...state.relationships, rel] })),
  removeRelationship: (id) =>
    set((state) => ({
      relationships: state.relationships.filter((r) => r.id !== id),
    })),
  updateRelationshipInStore: (rel) =>
    set((state) => ({
      relationships: state.relationships.map((r) => (r.id === rel.id ? rel : r)),
    })),

  pushUndo: (undoFn, redoFn) =>
    set((state) => {
      const entry: UndoEntry = { undo: undoFn, redo: redoFn };
      const newStack = [...state.undoStack, entry];
      if (newStack.length > MAX_UNDO) newStack.shift();
      return { undoStack: newStack, redoStack: [] };
    }),

  undo: async () => {
    const { undoStack, redoStack } = get();
    if (undoStack.length === 0) return;
    const entry = undoStack[undoStack.length - 1];
    set({ undoStack: undoStack.slice(0, -1), redoStack: [...redoStack, entry] });
    await entry.undo();
  },

  redo: async () => {
    const { redoStack, undoStack } = get();
    if (redoStack.length === 0) return;
    const entry = redoStack[redoStack.length - 1];
    set({ redoStack: redoStack.slice(0, -1), undoStack: [...undoStack, entry] });
    await entry.redo();
  },
}));
