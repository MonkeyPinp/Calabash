import { create } from 'zustand';
import type { Character, Relationship } from '@/types';

interface GraphStoreState {
  characters: Character[];
  relationships: Relationship[];
  setCharacters: (cs: Character[]) => void;
  setRelationships: (rs: Relationship[]) => void;
}

export const useGraphStore = create<GraphStoreState>((set) => ({
  characters: [],
  relationships: [],
  setCharacters: (characters) => set({ characters }),
  setRelationships: (relationships) => set({ relationships }),
}));
