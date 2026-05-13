import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/db/schema';
import { createBook, getBook, listBooks, updateBook, deleteBook } from '@/db/books';

describe('books DAO', () => {
  beforeEach(async () => {
    await db.books.clear();
  });

  it('createBook returns a Book with a UUID, timestamps, and default totalChapters', async () => {
    const book = await createBook({ title: 'And Then There Were None' });
    expect(book.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(book.title).toBe('And Then There Were None');
    expect(book.totalChapters).toBe(30);
    expect(book.currentChapter).toBe(1);
    expect(book.createdAt).toBeGreaterThan(0);
    expect(book.updatedAt).toBe(book.createdAt);
  });

  it('getBook retrieves by id', async () => {
    const created = await createBook({ title: 'X' });
    const fetched = await getBook(created.id);
    expect(fetched?.title).toBe('X');
  });

  it('getBook returns undefined for unknown id', async () => {
    expect(await getBook('nope')).toBeUndefined();
  });

  it('listBooks returns all books ordered by updatedAt descending', async () => {
    const a = await createBook({ title: 'A' });
    await new Promise((r) => setTimeout(r, 2));
    const b = await createBook({ title: 'B' });
    const books = await listBooks();
    expect(books.map((x) => x.id)).toEqual([b.id, a.id]);
  });

  it('updateBook merges fields and bumps updatedAt', async () => {
    const book = await createBook({ title: 'X' });
    await new Promise((r) => setTimeout(r, 2));
    const updated = await updateBook(book.id, { title: 'Y', currentChapter: 5 });
    expect(updated.title).toBe('Y');
    expect(updated.currentChapter).toBe(5);
    expect(updated.updatedAt).toBeGreaterThan(book.updatedAt);
  });

  it('deleteBook removes the row', async () => {
    const book = await createBook({ title: 'X' });
    await deleteBook(book.id);
    expect(await getBook(book.id)).toBeUndefined();
  });
});
