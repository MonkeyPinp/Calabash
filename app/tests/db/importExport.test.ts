import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { db } from '@/db/schema';
import { createBook } from '@/db/books';
import { createCategory } from '@/db/categories';
import { createCharacter, listCharactersByBook } from '@/db/characters';
import { createRelationship, listRelationshipsByBook } from '@/db/relationships';
import { savePortrait, getPortrait } from '@/db/portraits';
import { createAnnotation, listAnnotationsByBook } from '@/db/annotations';
import { createUser } from '@/db/users';
import {
  exportBookAsJson,
  exportLibraryAsJson,
  importBookFromJson,
  importLibraryFromJson,
  isLibraryExport,
  type CalabashLibraryExport,
} from '@/db/importExport';

describe('importExport', () => {
  beforeEach(async () => {
    await Promise.all([
      db.books.clear(),
      db.categories.clear(),
      db.characters.clear(),
      db.relationships.clear(),
      db.portraits.clear(),
      db.annotations.clear(),
      db.users.clear(),
    ]);
  });

  it('exports an empty book with no characters or portraits', async () => {
    const book = await createBook({ title: 'Empty' });
    const json = await exportBookAsJson(book.id);
    expect(json.calabashVersion).toBe('0.1.3');
    expect(json.book.title).toBe('Empty');
    expect(json.characters).toEqual([]);
    expect(json.relationships).toEqual([]);
    expect(json.portraits).toEqual([]);
  });

  it('round-trips a book with characters, relationships, and a portrait', async () => {
    const book = await createBook({ title: 'Murder of Roger Ackroyd', highlightedChapters: [3, 8] });
    const portrait = await savePortrait({
      bookId: book.id,
      blob: new Blob([new Uint8Array([200, 201, 202])], { type: 'image/png' }),
      mimeType: 'image/png',
    });
    const c1 = await createCharacter({
      bookId: book.id, name: 'Hercule Poirot', role: 'detective',
      chapterIntroduced: 1, portraitId: portrait.id,
    });
    const c2 = await createCharacter({
      bookId: book.id, name: 'James Sheppard', role: 'witness',
      roleReveals: [{ role: 'murderer', chapterRevealed: 27 }],
      chapterIntroduced: 1,
    });
    await createRelationship({
      bookId: book.id, sourceId: c1.id, targetId: c2.id,
      type: 'professional', chapterRevealed: 1, certainty: 'confirmed',
    });
    await createAnnotation({ bookId: book.id, content: 'check alibi', position: { x: 12, y: 24 }, chapterIntroduced: 7 });

    const exported = await exportBookAsJson(book.id);
    expect(exported.portraits).toHaveLength(1);
    expect(exported.book.highlightedChapters).toEqual([3, 8]);
    expect(exported.portraits[0].dataUrl).toMatch(/^data:image\/png;base64,/);
    expect(exported.annotations).toHaveLength(1);

    await Promise.all([
      db.books.clear(), db.characters.clear(), db.relationships.clear(), db.portraits.clear(), db.annotations.clear(),
    ]);

    const newBookId = await importBookFromJson(exported, 'reader-1');
    const reBook = await db.books.get(newBookId);
    expect(reBook?.title).toBe('Murder of Roger Ackroyd');
    expect(reBook?.highlightedChapters).toEqual([3, 8]);
    expect(reBook?.userId).toBe('reader-1');
    expect(reBook?.id).not.toBe(book.id);

    const reChars = await listCharactersByBook(newBookId);
    expect(reChars).toHaveLength(2);
    expect(reChars.find((c) => c.name === 'James Sheppard')?.role).toBe('witness');
    expect(reChars.find((c) => c.name === 'James Sheppard')?.roleReveals).toEqual([
      { role: 'murderer', chapterRevealed: 27 },
    ]);

    const reRels = await listRelationshipsByBook(newBookId);
    expect(reRels).toHaveLength(1);

    const rePortraitId = reChars.find((c) => c.name === 'Hercule Poirot')?.portraitId;
    expect(rePortraitId).toBeDefined();
    const rePortrait = await getPortrait(rePortraitId!);
    expect(rePortrait).toBeDefined();
    const reBytes = new Uint8Array(await rePortrait!.blob.arrayBuffer());
    expect(Array.from(reBytes)).toEqual([200, 201, 202]);

    const reNotes = await listAnnotationsByBook(newBookId);
    expect(reNotes).toHaveLength(1);
    expect(reNotes[0].content).toBe('check alibi');
    expect(reNotes[0].chapterIntroduced).toBe(7);
  });

  it('exports and imports the whole local library as collection JSON', async () => {
    const user = await createUser({ name: 'Reader One', avatarColor: '#8a3320' });
    const category = await createCategory({ name: 'Kindaichi', userId: user.id });
    const book = await createBook({
      userId: user.id,
      categoryId: category.id,
      title: 'Hida Trick House Murder Case',
      totalChapters: 3,
      spoilerShield: true,
      highlightedChapters: [2],
    });
    const portrait = await savePortrait({
      bookId: book.id,
      blob: new Blob([new Uint8Array([20, 21, 22])], { type: 'image/png' }),
      mimeType: 'image/png',
    });
    const c1 = await createCharacter({
      bookId: book.id,
      name: 'Hajime Kindaichi',
      role: 'detective',
      chapterIntroduced: 1,
      portraitId: portrait.id,
    });
    const c2 = await createCharacter({
      bookId: book.id,
      name: 'The Headless Samurai',
      role: 'other',
      roleReveals: [{ role: 'murderer', chapterRevealed: 3 }],
      chapterIntroduced: 1,
    });
    await createRelationship({
      bookId: book.id,
      sourceId: c1.id,
      targetId: c2.id,
      type: 'suspicion',
      chapterRevealed: 3,
      certainty: 'suspected',
      label: 'tracks the mask',
    });
    await createAnnotation({ bookId: book.id, content: 'TV 18 note', position: { x: 0, y: 0 } });

    const exported = await exportLibraryAsJson();
    expect(isLibraryExport(exported)).toBe(true);
    expect(exported.exportType).toBe('library');
    expect(exported.users).toHaveLength(1);
    expect(exported.categories).toHaveLength(1);
    expect(exported.books).toHaveLength(1);
    expect(exported.books[0].highlightedChapters).toEqual([2]);
    expect(exported.characters).toHaveLength(2);
    expect(exported.relationships).toHaveLength(1);
    expect(exported.annotations).toHaveLength(1);
    expect(exported.portraits[0].dataUrl).toMatch(/^data:image\/png;base64,/);

    await Promise.all([
      db.users.clear(),
      db.books.clear(),
      db.categories.clear(),
      db.characters.clear(),
      db.relationships.clear(),
      db.portraits.clear(),
      db.annotations.clear(),
    ]);

    const result = await importLibraryFromJson(exported);
    expect(result.activeUserId).toBe(user.id);
    expect(result.activeBookId).toBe(book.id);
    expect(await db.users.count()).toBe(1);
    expect(await db.categories.count()).toBe(1);
    expect(await db.books.get(book.id)).toMatchObject({ categoryId: category.id, userId: user.id, highlightedChapters: [2] });

    const reChars = await listCharactersByBook(book.id);
    expect(reChars.map((character) => character.name)).toContain('The Headless Samurai');
    expect(reChars.find((character) => character.name === 'The Headless Samurai')?.roleReveals).toEqual([
      { role: 'murderer', chapterRevealed: 3 },
    ]);

    const rePortrait = await getPortrait(portrait.id);
    expect(rePortrait).toBeDefined();
    expect(Array.from(new Uint8Array(await rePortrait!.blob.arrayBuffer()))).toEqual([20, 21, 22]);
  });

  it('imports the beta library fixture and re-exports it with the current version', async () => {
    const fixture = JSON.parse(
      readFileSync(path.join(process.cwd(), 'tests', 'fixtures', 'beta-library-export-0.1.3.json'), 'utf8'),
    ) as CalabashLibraryExport;

    const result = await importLibraryFromJson(fixture);
    expect(result).toEqual({ activeUserId: 'reader-beta-1', activeBookId: 'book-beta-case' });
    expect(await db.books.count()).toBe(1);
    expect(await db.characters.count()).toBe(3);
    expect(await db.relationships.count()).toBe(2);
    expect(await db.annotations.count()).toBe(1);
    const reNotes = await listAnnotationsByBook('book-beta-case');
    expect(reNotes[0].chapterIntroduced).toBe(1);

    const exported = await exportLibraryAsJson();
    expect(exported.calabashVersion).toBe('0.1.3');
    expect(exported.books[0]).toMatchObject({
      id: 'book-beta-case',
      spoilerShield: true,
      spoilerChapters: [12],
      highlightedChapters: [3, 9],
    });
    expect(exported.characters.find((character) => character.id === 'char-beta-sheppard')?.roleReveals).toEqual([
      { role: 'murderer', chapterRevealed: 12 },
    ]);
    expect(exported.portraits[0].dataUrl).toBe('data:image/png;base64,AAECAwQ=');
  });

  it('throws when exporting an unknown book id', async () => {
    await expect(exportBookAsJson('nope')).rejects.toThrow(/not found/);
  });
});
