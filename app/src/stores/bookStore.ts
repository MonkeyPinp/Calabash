import { create } from 'zustand';
import { updateBook } from '@/db/books';

interface BookStoreState {
  activeBookId: string | null;
  currentChapter: number;
  totalChapters: number;
  spoilerShield: boolean;
  spoilerChapters: number[];
  highlightedChapters: number[];
  setActiveBook: (id: string | null) => void;
  setCurrentChapter: (n: number) => void;
  setTotalChapters: (n: number) => void;
  setSpoilerShield: (enabled: boolean) => void;
  setSpoilerChapters: (chapters: number[]) => void;
  setHighlightedChapters: (chapters: number[]) => void;
  setCurrentChapterAndPersist: (bookId: string, chapter: number) => Promise<void>;
}

export const useBookStore = create<BookStoreState>((set) => ({
  activeBookId: null,
  currentChapter: 1,
  totalChapters: 30,
  spoilerShield: false,
  spoilerChapters: [],
  highlightedChapters: [],
  setActiveBook: (id) => set({ activeBookId: id }),
  setCurrentChapter: (n) => set({ currentChapter: n }),
  setTotalChapters: (n) => set({ totalChapters: n }),
  setSpoilerShield: (spoilerShield) => set({ spoilerShield }),
  setSpoilerChapters: (spoilerChapters) => set({ spoilerChapters }),
  setHighlightedChapters: (highlightedChapters) => set({ highlightedChapters }),
  setCurrentChapterAndPersist: async (bookId, chapter) => {
    await updateBook(bookId, { currentChapter: chapter });
    set({ currentChapter: chapter });
  },
}));
