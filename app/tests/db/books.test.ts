import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/db/schema';
import {
  createBook,
  createOpenClue,
  deleteBook,
  deleteOpenClue,
  getBook,
  listBooks,
  listOpenClues,
  updateBook,
  updateOpenClue,
} from '@/db/books';
import { createCharacter, listCharactersByBook } from '@/db/characters';
import { createRelationship, listRelationshipsByBook } from '@/db/relationships';
import { savePortrait } from '@/db/portraits';
import { createAnnotation, listAnnotationsByBook } from '@/db/annotations';
import { createGroupRange, listGroupRangesByBook } from '@/db/groupRanges';

describe('books DAO', () => {
  beforeEach(async () => {
    await Promise.all([
      db.books.clear(),
      db.categories.clear(),
      db.characters.clear(),
      db.relationships.clear(),
      db.portraits.clear(),
      db.annotations.clear(),
      db.groupRanges.clear(),
      db.users.clear(),
    ]);
  });

  it('createBook returns a Book with a UUID, timestamps, and default totalChapters', async () => {
    const book = await createBook({ title: 'And Then There Were None' });
    expect(book.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(book.title).toBe('And Then There Were None');
    expect(book.totalChapters).toBe(30);
    expect(book.currentChapter).toBe(1);
    expect(book.spoilerShield).toBe(false);
    expect(book.spoilerChapters).toEqual([]);
    expect(book.highlightedChapters).toEqual([]);
    expect(book.openClues).toEqual([]);
    expect(book.createdAt).toBeGreaterThan(0);
    expect(book.updatedAt).toBe(book.createdAt);
  });

  it('getBook retrieves by id', async () => {
    const created = await createBook({ title: 'X' });
    const fetched = await getBook(created.id);
    expect(fetched?.title).toBe('X');
  });

  it('createBook can enable Spoiler Shield', async () => {
    const created = await createBook({ title: 'Spoiler Book', spoilerShield: true });
    const fetched = await getBook(created.id);
    expect(fetched?.spoilerShield).toBe(true);
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

  it('listBooks can filter by local reader profile', async () => {
    const a = await createBook({ title: 'A', userId: 'reader-a' });
    const b = await createBook({ title: 'B', userId: 'reader-b' });

    expect((await listBooks('reader-a')).map((book) => book.id)).toEqual([a.id]);
    expect((await listBooks('reader-b')).map((book) => book.id)).toEqual([b.id]);
  });

  it('updateBook merges fields and bumps updatedAt', async () => {
    const book = await createBook({ title: 'X' });
    await new Promise((r) => setTimeout(r, 2));
    const updated = await updateBook(book.id, {
      title: 'Y',
      currentChapter: 5,
      spoilerShield: true,
      spoilerChapters: [5, 2, 5],
      highlightedChapters: [8, 3, 3],
    });
    expect(updated.title).toBe('Y');
    expect(updated.currentChapter).toBe(5);
    expect(updated.spoilerShield).toBe(true);
    expect(updated.spoilerChapters).toEqual([2, 5]);
    expect(updated.highlightedChapters).toEqual([3, 8]);
    expect(updated.updatedAt).toBeGreaterThan(book.updatedAt);
  });

  it('stores open clues on the book row as a pure list', async () => {
    const book = await createBook({ title: 'X' });
    const clue = await createOpenClue({
      bookId: book.id,
      text: 'Why was the study locked?',
      chapterIntroduced: 2,
    });

    expect(await listOpenClues(book.id)).toMatchObject([
      { id: clue.id, text: 'Why was the study locked?', status: 'open', chapterIntroduced: 2 },
    ]);

    const explained = await updateOpenClue(book.id, clue.id, { status: 'explained' });
    expect(explained.status).toBe('explained');

    await deleteOpenClue(book.id, clue.id);
    expect(await listOpenClues(book.id)).toEqual([]);
  });

  it('rejects blank open clue text instead of storing an invisible clue', async () => {
    const book = await createBook({ title: 'X' });

    await expect(createOpenClue({ bookId: book.id, text: '   ', chapterIntroduced: 1 })).rejects.toThrow(/required/);
    expect(await listOpenClues(book.id)).toEqual([]);
  });

  it('deleteBook removes the row', async () => {
    const book = await createBook({ title: 'X' });
    await deleteBook(book.id);
    expect(await getBook(book.id)).toBeUndefined();
  });

  it('deleteBook removes the book graph, portraits, and annotations', async () => {
    const book = await createBook({ title: 'X' });
    const other = await createBook({ title: 'Other' });
    const portrait = await savePortrait({
      bookId: book.id,
      blob: new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' }),
      mimeType: 'image/png',
    });
    const a = await createCharacter({
      bookId: book.id,
      name: 'A',
      role: 'suspect',
      chapterIntroduced: 1,
      portraitId: portrait.id,
    });
    const b = await createCharacter({
      bookId: book.id,
      name: 'B',
      role: 'witness',
      chapterIntroduced: 1,
    });
    await createRelationship({
      bookId: book.id,
      sourceId: a.id,
      targetId: b.id,
      type: 'suspicion',
      chapterRevealed: 1,
    });
    await createAnnotation({ bookId: book.id, content: 'case note' });
    await createGroupRange({ bookId: book.id, label: 'Club', position: { x: 0, y: 0 } });
    await createCharacter({
      bookId: other.id,
      name: 'Other character',
      role: 'other',
      chapterIntroduced: 1,
    });

    await deleteBook(book.id);

    expect(await getBook(book.id)).toBeUndefined();
    expect(await listCharactersByBook(book.id)).toEqual([]);
    expect(await listRelationshipsByBook(book.id)).toEqual([]);
    expect(await db.portraits.where('bookId').equals(book.id).count()).toBe(0);
    expect(await listAnnotationsByBook(book.id)).toEqual([]);
    expect(await listGroupRangesByBook(book.id)).toEqual([]);
    expect(await getBook(other.id)).toBeDefined();
    expect(await listCharactersByBook(other.id)).toHaveLength(1);
  });
});
