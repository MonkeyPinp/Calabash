import { db } from './schema';
import type { Book } from '@/types';

function normalizeBook(book: Book): Book {
  return {
    ...book,
    spoilerShield: book.spoilerShield ?? false,
  };
}

export async function createBook(input: {
  title: string;
  author?: string;
  totalChapters?: number;
  spoilerShield?: boolean;
  categoryId?: string;
}): Promise<Book> {
  const now = Date.now();
  const book: Book = {
    id: crypto.randomUUID(),
    categoryId: input.categoryId,
    title: input.title,
    author: input.author,
    totalChapters: input.totalChapters ?? 30,
    currentChapter: 1,
    spoilerShield: input.spoilerShield ?? false,
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

export async function listBooks(): Promise<Book[]> {
  const all = await db.books.toArray();
  return all.map(normalizeBook).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function updateBook(
  id: string,
  patch: Partial<Omit<Book, 'id' | 'createdAt'>>,
): Promise<Book> {
  const existing = await db.books.get(id);
  if (!existing) throw new Error(`Book ${id} not found`);
  const next: Book = { ...normalizeBook(existing), ...patch, updatedAt: Date.now() };
  await db.books.put(next);
  return next;
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
