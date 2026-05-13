import { describe, it, expect, beforeEach } from 'vitest';
import { useBookStore } from '@/stores/bookStore';

describe('bookStore', () => {
  beforeEach(() => {
    useBookStore.setState({ activeBookId: null, currentChapter: 1 });
  });

  it('initial state', () => {
    const s = useBookStore.getState();
    expect(s.activeBookId).toBeNull();
    expect(s.currentChapter).toBe(1);
  });

  it('setActiveBook updates activeBookId', () => {
    useBookStore.getState().setActiveBook('book-1');
    expect(useBookStore.getState().activeBookId).toBe('book-1');
  });

  it('setCurrentChapter updates currentChapter', () => {
    useBookStore.getState().setCurrentChapter(7);
    expect(useBookStore.getState().currentChapter).toBe(7);
  });
});
