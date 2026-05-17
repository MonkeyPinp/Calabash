import { db } from './schema';
import type { Book } from '@/types';
import { createOpenClueDraft, normalizeOpenClues } from '@/lib/clues';

function normalizeBook(book: Book): Book {
  return {
    ...book,
    spoilerShield: book.spoilerShield ?? false,
    spoilerChapters: normalizeChapters(book.spoilerChapters),
    highlightedChapters: normalizeChapters(book.highlightedChapters),
    openClues: normalizeOpenClues(book.openClues),
  };
}

export async function createBook(input: {
  title: string;
  userId?: string;
  author?: string;
  totalChapters?: number;
  spoilerShield?: boolean;
  spoilerChapters?: number[];
  highlightedChapters?: number[];
  categoryId?: string;
}): Promise<Book> {
  const now = Date.now();
  const book: Book = {
    id: crypto.randomUUID(),
    userId: input.userId,
    categoryId: input.categoryId,
    title: input.title,
    author: input.author,
    totalChapters: input.totalChapters ?? 30,
    currentChapter: 1,
    spoilerShield: input.spoilerShield ?? false,
    spoilerChapters: normalizeChapters(input.spoilerChapters),
    highlightedChapters: normalizeChapters(input.highlightedChapters),
    openClues: [],
    createdAt: now,
    updatedAt: now,
  };
  await db.books.add(book);
  return book;
}

export async function getBook(id: string): Promise<Book | undefined> {
  const book = await db.books.get(id);
  return book ? normalizeBook(book) : undefined;
}

export async function listBooks(userId?: string): Promise<Book[]> {
  const all = userId
    ? await db.books.where('userId').equals(userId).toArray()
    : await db.books.toArray();
  return all.map(normalizeBook).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function updateBook(
  id: string,
  patch: Partial<Omit<Book, 'id' | 'createdAt'>>,
): Promise<Book> {
  const existing = await db.books.get(id);
  if (!existing) throw new Error(`Book ${id} not found`);
  const next: Book = { ...normalizeBook(existing), ...patch, updatedAt: Date.now() };
  if (patch.spoilerChapters) next.spoilerChapters = normalizeChapters(patch.spoilerChapters);
  if (patch.highlightedChapters) next.highlightedChapters = normalizeChapters(patch.highlightedChapters);
  if (patch.openClues) next.openClues = normalizeOpenClues(patch.openClues);
  await db.books.put(next);
  return next;
}

function normalizeChapters(chapters: number[] = []): number[] {
  return [...new Set(chapters.map((chapter) => Math.trunc(chapter)).filter((chapter) => chapter > 0))]
    .sort((a, b) => a - b);
}

export async function deleteBook(id: string): Promise<void> {
  await db.transaction(
    'rw',
    [db.books, db.characters, db.relationships, db.portraits, db.annotations, db.groupRanges, db.evidenceImages],
    async () => {
      await db.characters.where('bookId').equals(id).delete();
      await db.relationships.where('bookId').equals(id).delete();
      await db.portraits.where('bookId').equals(id).delete();
      await db.annotations.where('bookId').equals(id).delete();
      await db.groupRanges.where('bookId').equals(id).delete();
      await db.evidenceImages.where('bookId').equals(id).delete();
      await db.books.delete(id);
    },
  );
}

export async function listOpenClues(bookId: string) {
  const book = await getBook(bookId);
  return book?.openClues ?? [];
}

export async function createOpenClue(input: {
  bookId: string;
  text: string;
  chapterIntroduced: number;
}) {
  const book = await getBook(input.bookId);
  if (!book) throw new Error(`Book ${input.bookId} not found`);
  const text = input.text.trim();
  if (!text) throw new Error('Clue text is required');
  const clue = createOpenClueDraft(text, input.chapterIntroduced);
  await updateBook(input.bookId, { openClues: [...(book.openClues ?? []), clue] });
  return clue;
}

export async function updateOpenClue(
  bookId: string,
  clueId: string,
  patch: Partial<Omit<NonNullable<Book['openClues']>[number], 'id' | 'createdAt'>>,
) {
  const book = await getBook(bookId);
  if (!book) throw new Error(`Book ${bookId} not found`);
  const openClues = book.openClues ?? [];
  const existing = openClues.find((clue) => clue.id === clueId);
  if (!existing) throw new Error(`Clue ${clueId} not found`);
  const text = patch.text?.trim();
  if ('text' in patch && !text) throw new Error('Clue text is required');
  const nextClue = {
    ...existing,
    ...patch,
    text: text === undefined ? existing.text : text,
    updatedAt: Date.now(),
  };
  await updateBook(bookId, {
    openClues: openClues.map((clue) => clue.id === clueId ? nextClue : clue),
  });
  return nextClue;
}

export async function deleteOpenClue(bookId: string, clueId: string) {
  const book = await getBook(bookId);
  if (!book) throw new Error(`Book ${bookId} not found`);
  await updateBook(bookId, {
    openClues: (book.openClues ?? []).filter((clue) => clue.id !== clueId),
  });
}
