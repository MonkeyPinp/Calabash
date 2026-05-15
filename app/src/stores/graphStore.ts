import { create } from 'zustand';
import type { Character, EvidenceImage, GroupRange, Relationship, StickyNote } from '@/types';

const MAX_UNDO = 100;

interface UndoEntry {
  undo: () => Promise<void>;
  redo: () => Promise<void>;
}

interface GraphStoreState {
  characters: Character[];
  relationships: Relationship[];
  stickyNotes: StickyNote[];
  groupRanges: GroupRange[];
  evidenceImages: EvidenceImage[];
  setCharacters: (cs: Character[]) => void;
  setRelationships: (rs: Relationship[]) => void;
  setStickyNotes: (notes: StickyNote[]) => void;
  setGroupRanges: (ranges: GroupRange[]) => void;
  setEvidenceImages: (images: EvidenceImage[]) => void;
  addCharacter: (char: Character) => void;
  removeCharacter: (id: string) => void;
  updateCharacterInStore: (char: Character) => void;
  addRelationship: (rel: Relationship) => void;
  removeRelationship: (id: string) => void;
  updateRelationshipInStore: (rel: Relationship) => void;
  addStickyNote: (note: StickyNote) => void;
  removeStickyNote: (id: string) => void;
  updateStickyNoteInStore: (note: StickyNote) => void;
  addGroupRange: (range: GroupRange) => void;
  removeGroupRange: (id: string) => void;
  updateGroupRangeInStore: (range: GroupRange) => void;
  addEvidenceImage: (image: EvidenceImage) => void;
  removeEvidenceImage: (id: string) => void;
  updateEvidenceImageInStore: (image: EvidenceImage) => void;

  undoStack: UndoEntry[];
  redoStack: UndoEntry[];
  pushUndo: (undoFn: () => Promise<void>, redoFn: () => Promise<void>) => void;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
}

export const useGraphStore = create<GraphStoreState>((set, get) => ({
  characters: [],
  relationships: [],
  stickyNotes: [],
  groupRanges: [],
  evidenceImages: [],
  undoStack: [],
  redoStack: [],

  setCharacters: (characters) => set({ characters }),
  setRelationships: (relationships) => set({ relationships }),
  setStickyNotes: (stickyNotes) => set({ stickyNotes }),
  setGroupRanges: (groupRanges) => set({ groupRanges }),
  setEvidenceImages: (evidenceImages) => set({ evidenceImages }),
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
  addStickyNote: (note) =>
    set((state) => ({ stickyNotes: [...state.stickyNotes, note] })),
  removeStickyNote: (id) =>
    set((state) => ({ stickyNotes: state.stickyNotes.filter((n) => n.id !== id) })),
  updateStickyNoteInStore: (note) =>
    set((state) => ({
      stickyNotes: state.stickyNotes.map((n) => (n.id === note.id ? note : n)),
    })),
  addGroupRange: (range) =>
    set((state) => ({ groupRanges: [...state.groupRanges, range] })),
  removeGroupRange: (id) =>
    set((state) => ({ groupRanges: state.groupRanges.filter((r) => r.id !== id) })),
  updateGroupRangeInStore: (range) =>
    set((state) => ({
      groupRanges: state.groupRanges.map((r) => (r.id === range.id ? range : r)),
    })),
  addEvidenceImage: (image) =>
    set((state) => ({ evidenceImages: [...state.evidenceImages, image] })),
  removeEvidenceImage: (id) =>
    set((state) => ({ evidenceImages: state.evidenceImages.filter((image) => image.id !== id) })),
  updateEvidenceImageInStore: (image) =>
    set((state) => ({
      evidenceImages: state.evidenceImages.map((item) => (item.id === image.id ? image : item)),
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
