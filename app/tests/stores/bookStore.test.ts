import { describe, it, expect, beforeEach } from 'vitest';
import { useBookStore } from '@/stores/bookStore';

describe('bookStore', () => {
  beforeEach(() => {
    useBookStore.setState({ activeBookId: null, currentChapter: 1, totalChapters: 30, spoilerShield: false });
  });

  it('initial state', () => {
    const s = useBookStore.getState();
    expect(s.activeBookId).toBeNull();
    expect(s.currentChapter).toBe(1);
    expect(s.spoilerShield).toBe(false);
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
});
