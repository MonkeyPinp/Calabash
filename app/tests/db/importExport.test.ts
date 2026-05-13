import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/db/schema';
import { createBook } from '@/db/books';
import { createCharacter, listCharactersByBook } from '@/db/characters';
import { createRelationship, listRelationshipsByBook } from '@/db/relationships';
import { savePortrait, getPortrait } from '@/db/portraits';
import { exportBookAsJson, importBookFromJson } from '@/db/importExport';

describe('importExport', () => {
  beforeEach(async () => {
    await Promise.all([
      db.books.clear(),
      db.characters.clear(),
      db.relationships.clear(),
      db.portraits.clear(),
    ]);
  });

  it('exports an empty book with no characters or portraits', async () => {
    const book = await createBook({ title: 'Empty' });
    const json = await exportBookAsJson(book.id);
    expect(json.calabashVersion).toBe('0.1.0');
    expect(json.book.title).toBe('Empty');
    expect(json.characters).toEqual([]);
    expect(json.relationships).toEqual([]);
    expect(json.portraits).toEqual([]);
  });

  it('round-trips a book with characters, relationships, and a portrait', async () => {
    const book = await createBook({ title: 'Murder of Roger Ackroyd' });
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

    const exported = await exportBookAsJson(book.id);
    expect(exported.portraits).toHaveLength(1);
    expect(exported.portraits[0].dataUrl).toMatch(/^data:image\/png;base64,/);

    await Promise.all([
      db.books.clear(), db.characters.clear(), db.relationships.clear(), db.portraits.clear(),
    ]);

    const newBookId = await importBookFromJson(exported);
    const reBook = await db.books.get(newBookId);
    expect(reBook?.title).toBe('Murder of Roger Ackroyd');
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
  });

  it('throws when exporting an unknown book id', async () => {
    await expect(exportBookAsJson('nope')).rejects.toThrow(/not found/);
  });
});
