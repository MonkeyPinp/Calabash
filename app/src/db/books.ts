import { db } from './schema';
import type { Book } from '@/types';

function normalizeBook(book: Book): Book {
  return {
    ...book,
    spoilerShield: book.spoilerShield ?? false,
    spoilerChapters: normalizeChapters(book.spoilerChapters),
    highlightedChapters: normalizeChapters(book.highlightedChapters),
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
    [db.books, db.characters, db.relationships, db.portraits, db.annotations],
    async () => {
      await Promise.all([
        db.characters.where('bookId').equals(id).delete(),
        db.relationships.where('bookId').equals(id).delete(),
        db.portraits.where('bookId').equals(id).delete(),
        db.annotations.where('bookId').equals(id).delete(),
      ]);
      await db.books.delete(id);
    },
  );
}
