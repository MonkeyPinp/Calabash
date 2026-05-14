import { describe, it, expect, beforeEach } from 'vitest';
import { useBookStore } from '@/stores/bookStore';

describe('bookStore', () => {
  beforeEach(() => {
    useBookStore.setState({
      activeBookId: null,
      currentChapter: 1,
      totalChapters: 30,
      spoilerShield: false,
      spoilerChapters: [],
      highlightedChapters: [],
    });
  });

  it('initial state', () => {
    const s = useBookStore.getState();
    expect(s.activeBookId).toBeNull();
    expect(s.currentChapter).toBe(1);
    expect(s.spoilerShield).toBe(false);
    expect(s.spoilerChapters).toEqual([]);
    expect(s.highlightedChapters).toEqual([]);
  });

  it('setActiveBook updates activeBookId', () => {
    useBookStore.getState().setActiveBook('book-1');
    expect(useBookStore.getState().activeBookId).toBe('book-1');
  });

  it('setCurrentChapter updates currentChapter', () => {
    useBookStore.getState().setCurrentChapter(7);
    expect(useBookStore.getState().currentChapter).toBe(7);
  });

  it('setSpoilerShield updates spoilerShield', () => {
    useBookStore.getState().setSpoilerShield(true);
    expect(useBookStore.getState().spoilerShield).toBe(true);
  });

  it('setSpoilerChapters updates manually protected chapters', () => {
    useBookStore.getState().setSpoilerChapters([2, 5]);
    expect(useBookStore.getState().spoilerChapters).toEqual([2, 5]);
  });

  it('setHighlightedChapters updates user-highlighted chapters', () => {
    useBookStore.getState().setHighlightedChapters([3, 8]);
    expect(useBookStore.getState().highlightedChapters).toEqual([3, 8]);
  });
});
