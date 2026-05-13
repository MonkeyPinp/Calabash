import { create } from 'zustand';
import type { Character, Relationship } from '@/types';

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
}

export const useGraphStore = create<GraphStoreState>((set) => ({
  characters: [],
  relationships: [],
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
}));
