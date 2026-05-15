import { describe, it, expect, beforeEach } from 'vitest';
import type { Character, Relationship } from '@/types';
import { useGraphStore } from '@/stores/graphStore';

const c: Character = {
  id: 'c1', bookId: 'b', name: 'A', aliases: [{ name: 'A', chapterRevealed: 1 }],
  role: 'suspect', chapterIntroduced: 1, position: { x: 0, y: 0 },
  createdAt: 0, updatedAt: 0,
};
const r: Relationship = {
  id: 'r1', bookId: 'b', sourceId: 'c1', targetId: 'c2',
  type: 'family', chapterRevealed: 1, certainty: 'confirmed',
  createdAt: 0, updatedAt: 0,
};

describe('graphStore', () => {
  beforeEach(() => {
    useGraphStore.setState({ characters: [], relationships: [], stickyNotes: [], groupRanges: [], evidenceImages: [] });
  });

  it('initial state is empty', () => {
    const s = useGraphStore.getState();
    expect(s.characters).toEqual([]);
    expect(s.relationships).toEqual([]);
  });

  it('setCharacters replaces the list', () => {
    useGraphStore.getState().setCharacters([c]);
    expect(useGraphStore.getState().characters).toHaveLength(1);
  });

  it('setRelationships replaces the list', () => {
    useGraphStore.getState().setRelationships([r]);
    expect(useGraphStore.getState().relationships).toHaveLength(1);
  });
});
