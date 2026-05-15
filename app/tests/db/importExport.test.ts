import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { db } from '@/db/schema';
import { createBook, createOpenClue, listOpenClues } from '@/db/books';
import { createCategory } from '@/db/categories';
import { createCharacter, listCharactersByBook } from '@/db/characters';
import { createRelationship, listRelationshipsByBook } from '@/db/relationships';
import { savePortrait, getPortrait } from '@/db/portraits';
import { createAnnotation, listAnnotationsByBook } from '@/db/annotations';
import { createGroupRange, listGroupRangesByBook } from '@/db/groupRanges';
import { createEvidenceImage, listEvidenceImagesByBook } from '@/db/evidenceImages';
import { createUser } from '@/db/users';
import {
  exportBookAsJson,
  exportLibraryAsJson,
  importBookFromJson,
  importLibraryFromJson,
  isLibraryExport,
  normalizeBookImportPayload,
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
      db.groupRanges.clear(),
      db.evidenceImages.clear(),
      db.users.clear(),
    ]);
  });

  it('exports an empty book with no characters or portraits', async () => {
    const book = await createBook({ title: 'Empty' });
    const json = await exportBookAsJson(book.id);
    expect(json.calabashVersion).toBe('0.3.1');
    expect(json.book.title).toBe('Empty');
    expect(json.book.openClues).toEqual([]);
    expect(json.characters).toEqual([]);
    expect(json.relationships).toEqual([]);
    expect(json.portraits).toEqual([]);
    expect(json.illustrations).toEqual([]);
    expect(json.attachments).toBeUndefined();
    expect(json.evidenceImages).toBeUndefined();
  });

  it('round-trips a book with characters, relationships, a portrait, notes, ranges, and illustrations', async () => {
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
    await createOpenClue({ bookId: book.id, text: 'Who had the key to the study?', chapterIntroduced: 5 });
    await createGroupRange({
      bookId: book.id,
      label: 'Village circle',
      position: { x: -80, y: -40 },
      width: 420,
      height: 260,
      color: 'green',
      chapterIntroduced: 5,
    });
    await createEvidenceImage({
      bookId: book.id,
      title: 'Study floor plan',
      kind: 'floorPlan',
      layer: 'background',
      dataUrl: 'data:image/png;base64,AAECAw==',
      mimeType: 'image/png',
      position: { x: 40, y: 60 },
      width: 420,
      height: 280,
      chapterIntroduced: 6,
    });

    const exported = await exportBookAsJson(book.id);
    expect(exported.portraits).toHaveLength(1);
    expect(exported.book.highlightedChapters).toEqual([3, 8]);
    expect(exported.portraits[0].dataUrl).toMatch(/^data:image\/png;base64,/);
    expect(exported.annotations).toHaveLength(1);
    expect(exported.book.openClues).toMatchObject([{ text: 'Who had the key to the study?', chapterIntroduced: 5 }]);
    expect(exported.groupRanges).toHaveLength(1);
    expect(exported.illustrations).toHaveLength(1);
    expect(exported.illustrations?.[0]).toMatchObject({ title: 'Study floor plan', kind: 'floorPlan', layer: 'background', chapterIntroduced: 6 });
    expect(exported.attachments).toBeUndefined();
    expect(exported.evidenceImages).toBeUndefined();

    await Promise.all([
      db.books.clear(), db.characters.clear(), db.relationships.clear(), db.portraits.clear(), db.annotations.clear(), db.groupRanges.clear(), db.evidenceImages.clear(),
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
    expect(await listOpenClues(newBookId)).toMatchObject([
      { text: 'Who had the key to the study?', chapterIntroduced: 5, status: 'open' },
    ]);

    const reRanges = await listGroupRangesByBook(newBookId);
    expect(reRanges).toHaveLength(1);
    expect(reRanges[0]).toMatchObject({ label: 'Village circle', color: 'green', width: 420, height: 260, chapterIntroduced: 5 });
    expect(reRanges[0].id).not.toBe(exported.groupRanges?.[0].id);

    const reImages = await listEvidenceImagesByBook(newBookId);
    expect(reImages).toHaveLength(1);
    expect(reImages[0]).toMatchObject({ title: 'Study floor plan', kind: 'floorPlan', layer: 'background', width: 420, height: 280, chapterIntroduced: 6 });
    expect(reImages[0].id).not.toBe(exported.illustrations?.[0].id);
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
    await createGroupRange({ bookId: book.id, label: 'Samurai inn', position: { x: -20, y: 40 }, color: 'red' });
    await createEvidenceImage({
      bookId: book.id,
      title: 'Trick house plan',
      kind: 'floorPlan',
      layer: 'background',
      dataUrl: 'data:image/png;base64,AQIDBA==',
      mimeType: 'image/png',
    });

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
    expect(exported.groupRanges).toHaveLength(1);
    expect(exported.illustrations).toHaveLength(1);
    expect(exported.attachments).toBeUndefined();
    expect(exported.evidenceImages).toBeUndefined();
    expect(exported.portraits[0].dataUrl).toMatch(/^data:image\/png;base64,/);

    await Promise.all([
      db.users.clear(),
      db.books.clear(),
      db.categories.clear(),
      db.characters.clear(),
      db.relationships.clear(),
      db.portraits.clear(),
      db.annotations.clear(),
      db.groupRanges.clear(),
      db.evidenceImages.clear(),
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
    expect(await listGroupRangesByBook(book.id)).toHaveLength(1);
    expect(await listEvidenceImagesByBook(book.id)).toHaveLength(1);

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
    expect(await db.groupRanges.count()).toBe(0);
    expect(await db.evidenceImages.count()).toBe(0);
    const reNotes = await listAnnotationsByBook('book-beta-case');
    expect(reNotes[0].chapterIntroduced).toBe(1);

    const exported = await exportLibraryAsJson();
    expect(exported.calabashVersion).toBe('0.3.1');
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

  it('imports an LLM-friendly single-book template', async () => {
    const template = JSON.parse(
      readFileSync(path.join(process.cwd(), '..', 'docs', 'examples', 'book-import-template.calabash.json'), 'utf8'),
    ) as unknown;

    const normalized = normalizeBookImportPayload(template);
    expect(normalized.book.title).toBe('Example Mystery Night');
    expect(normalized.characters.map((character) => character.name)).toEqual([
      'Detective Lin',
      'Morgan Vale',
      'Ada Vale',
    ]);
    expect(normalized.relationships[0]).toMatchObject({
      sourceId: 'detective',
      targetId: 'host',
      certainty: 'confirmed',
    });
    expect(normalized.annotations).toHaveLength(1);
    expect(normalized.book.openClues).toHaveLength(2);
    expect(normalized.groupRanges).toHaveLength(1);
    expect(normalized.illustrations).toHaveLength(1);
    expect(normalized.attachments).toBeUndefined();
    expect(normalized.evidenceImages).toBeUndefined();

    const newBookId = await importBookFromJson(template, 'reader-1');
    const book = await db.books.get(newBookId);
    expect(book).toMatchObject({ title: 'Example Mystery Night', userId: 'reader-1', totalChapters: 6 });
    expect(book?.openClues).toHaveLength(2);

    const characters = await listCharactersByBook(newBookId);
    expect(characters).toHaveLength(3);
    expect(characters.every((character) => character.kind === 'character')).toBe(true);
    expect(characters.find((character) => character.name === 'Ada Vale')?.aliases).toEqual([
      { name: 'The Nightingale', chapterRevealed: 2 },
    ]);

    const relationships = await listRelationshipsByBook(newBookId);
    expect(relationships).toHaveLength(2);
    expect(relationships[0].sourceId).not.toBe('detective');
    expect(await listAnnotationsByBook(newBookId)).toHaveLength(1);
    expect(await listGroupRangesByBook(newBookId)).toHaveLength(1);
    expect(await listEvidenceImagesByBook(newBookId)).toHaveLength(1);
  });

  it('imports legacy evidenceImages as illustrations', async () => {
    const legacyPayload = {
      calabashVersion: '0.2.2',
      importType: 'book',
      book: { id: 'legacy-book', title: 'Legacy Case' },
      characters: [],
      relationships: [],
      portraits: [],
      evidenceImages: [
        {
          id: 'legacy-image',
          bookId: 'legacy-book',
          title: 'Old floor plan',
          kind: 'floorPlan',
          layer: 'background',
          dataUrl: 'data:image/png;base64,AAECAw==',
          mimeType: 'image/png',
          position: { x: 10, y: 20 },
          width: 300,
          height: 180,
          chapterIntroduced: 1,
        },
      ],
    };

    const normalized = normalizeBookImportPayload(legacyPayload);
    expect(normalized.illustrations).toHaveLength(1);
    expect(normalized.attachments).toBeUndefined();
    expect(normalized.evidenceImages).toBeUndefined();

    const newBookId = await importBookFromJson(legacyPayload, 'reader-1');
    const importedIllustrations = await listEvidenceImagesByBook(newBookId);
    expect(importedIllustrations).toHaveLength(1);
    expect(importedIllustrations[0]).toMatchObject({ title: 'Old floor plan', layer: 'background' });
  });

  it('skips template relationships that reference unknown characters', () => {
    const normalized = normalizeBookImportPayload({
      book: { title: 'Broken Link Case' },
      characters: [{ key: 'known', name: 'Known Person' }],
      relationships: [
        { source: 'known', target: 'missing', type: 'suspicion' },
        { source: 'missing', target: 'known', type: 'suspicion' },
      ],
    });

    expect(normalized.relationships).toEqual([]);
  });

  it('throws when exporting an unknown book id', async () => {
    await expect(exportBookAsJson('nope')).rejects.toThrow(/not found/);
  });

  it('rejects whole-library exports in the single-book importer', async () => {
    await expect(importBookFromJson({
      calabashVersion: '0.3.1',
      exportType: 'library',
      exportedAt: Date.now(),
      users: [],
      categories: [],
      books: [],
      characters: [],
      relationships: [],
      annotations: [],
      groupRanges: [],
      illustrations: [],
      attachments: [],
      evidenceImages: [],
      portraits: [],
    })).rejects.toThrow(/Invalid Calabash book import/);
  });
});
