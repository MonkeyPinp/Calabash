import { create } from 'zustand';
import { updateBook } from '@/db/books';
import type { TimeLayer } from '@/types';
import { ALL_TIME_LAYERS_ID, normalizeTimeLayers } from '@/lib/timeLayers';

interface BookStoreState {
  activeBookId: string | null;
  currentChapter: number;
  totalChapters: number;
  spoilerShield: boolean;
  spoilerChapters: number[];
  highlightedChapters: number[];
  timeLayers: TimeLayer[];
  currentTimeLayerId: string;
  setActiveBook: (id: string | null) => void;
  setCurrentChapter: (n: number) => void;
  setTotalChapters: (n: number) => void;
  setSpoilerShield: (enabled: boolean) => void;
  setSpoilerChapters: (chapters: number[]) => void;
  setHighlightedChapters: (chapters: number[]) => void;
  setTimeLayers: (layers: TimeLayer[]) => void;
  setCurrentTimeLayerId: (id: string) => void;
  setCurrentChapterAndPersist: (bookId: string, chapter: number) => Promise<void>;
}

export const useBookStore = create<BookStoreState>((set) => ({
  activeBookId: null,
  currentChapter: 1,
  totalChapters: 30,
  spoilerShield: false,
  spoilerChapters: [],
  highlightedChapters: [],
  timeLayers: [],
  currentTimeLayerId: ALL_TIME_LAYERS_ID,
  setActiveBook: (id) => set({ activeBookId: id }),
  setCurrentChapter: (n) => set({ currentChapter: n }),
  setTotalChapters: (n) => set({ totalChapters: n }),
  setSpoilerShield: (spoilerShield) => set({ spoilerShield }),
  setSpoilerChapters: (spoilerChapters) => set({ spoilerChapters }),
  setHighlightedChapters: (highlightedChapters) => set({ highlightedChapters }),
  setTimeLayers: (timeLayers) => set({ timeLayers: normalizeTimeLayers(timeLayers) }),
  setCurrentTimeLayerId: (currentTimeLayerId) => set({ currentTimeLayerId }),
  setCurrentChapterAndPersist: async (bookId, chapter) => {
    await updateBook(bookId, { currentChapter: chapter });
    set({ currentChapter: chapter });
  },
}));
