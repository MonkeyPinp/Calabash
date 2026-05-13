import { create } from 'zustand';

interface BookStoreState {
  activeBookId: string | null;
  currentChapter: number;
  setActiveBook: (id: string | null) => void;
  setCurrentChapter: (n: number) => void;
}

export const useBookStore = create<BookStoreState>((set) => ({
  activeBookId: null,
  currentChapter: 1,
  setActiveBook: (id) => set({ activeBookId: id }),
  setCurrentChapter: (n) => set({ currentChapter: n }),
}));
