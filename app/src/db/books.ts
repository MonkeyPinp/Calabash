import { db } from './schema';
import type { Book } from '@/types';

export async function createBook(input: {
  title: string;
  author?: string;
  totalChapters?: number;
}): Promise<Book> {
  const now = Date.now();
  const book: Book = {
    id: crypto.randomUUID(),
    title: input.title,
    author: input.author,
    totalChapters: input.totalChapters ?? 30,
    currentChapter: 1,
    createdAt: now,
    updatedAt: now,
  };
  await db.books.add(book);
  return book;
}

export async function getBook(id: string): Promise<Book | undefined> {
  return db.books.get(id);
}

export async function listBooks(): Promise<Book[]> {
  const all = await db.books.toArray();
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function updateBook(
  id: string,
  patch: Partial<Omit<Book, 'id' | 'createdAt'>>,
): Promise<Book> {
  const existing = await db.books.get(id);
  if (!existing) throw new Error(`Book ${id} not found`);
  const next: Book = { ...existing, ...patch, updatedAt: Date.now() };
  await db.books.put(next);
  return next;
}

export async function deleteBook(id: string): Promise<void> {
  await db.books.delete(id);
}
