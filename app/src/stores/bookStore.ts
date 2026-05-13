import { create } from 'zustand';
import { updateBook } from '@/db/books';

interface BookStoreState {
  activeBookId: string | null;
  currentChapter: number;
  totalChapters: number;
  setActiveBook: (id: string | null) => void;
  setCurrentChapter: (n: number) => void;
  setTotalChapters: (n: number) => void;
  setCurrentChapterAndPersist: (bookId: string, chapter: number) => Promise<void>;
}

export const useBookStore = create<BookStoreState>((set) => ({
  activeBookId: null,
  currentChapter: 1,
  totalChapters: 30,
  setActiveBook: (id) => set({ activeBookId: id }),
  setCurrentChapter: (n) => set({ currentChapter: n }),
  setTotalChapters: (n) => set({ totalChapters: n }),
  setCurrentChapterAndPersist: async (bookId, chapter) => {
    await updateBook(bookId, { currentChapter: chapter });
    set({ currentChapter: chapter });
  },
}));
