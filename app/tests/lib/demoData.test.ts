import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/db/schema';
import { getBook } from '@/db/books';
import { listCategories } from '@/db/categories';
import { listCharactersByBook } from '@/db/characters';
import { listRelationshipsByBook } from '@/db/relationships';
import { listAnnotationsByBook } from '@/db/annotations';
import { getPortrait } from '@/db/portraits';
import { seedRogerAckroyd, seedTutorialBook } from '@/lib/demoData';
import { getMinimumLayoutNodeDistance, MIN_LAYOUT_NODE_DISTANCE } from '@/lib/layout';

describe('Ackroyd demo data', () => {
  beforeEach(async () => {
    await Promise.all([
      db.books.clear(),
      db.categories.clear(),
      db.characters.clear(),
      db.relationships.clear(),
      db.annotations.clear(),
      db.portraits.clear(),
      db.users.clear(),
    ]);
  });

  it('places the demo book under the Agatha Christie category', async () => {
    const bookId = await seedRogerAckroyd();
    const book = await getBook(bookId);
    const categories = await listCategories();
    const category = categories.find((item) => item.name === 'Agatha Christie');

    expect(category).toBeDefined();
    expect(book?.categoryId).toBe(category?.id);
  });

  it('pre-layouts demo characters with readable spacing', async () => {
    const bookId = await seedRogerAckroyd();
    const characters = await listCharactersByBook(bookId);
    const positions = new Map(characters.map((character) => [character.id, character.position]));

    expect(characters).toHaveLength(10);
    expect(getMinimumLayoutNodeDistance(positions)).toBeGreaterThanOrEqual(MIN_LAYOUT_NODE_DISTANCE - 1);
  });

  it('adds generated portrait avatars to the Ackroyd tutorial', async () => {
    const bookId = await seedRogerAckroyd();
    const characters = await listCharactersByBook(bookId);
    const poirot = characters.find((character) => character.name === 'Hercule Poirot');

    expect(characters.every((character) => character.portraitId)).toBe(true);
    expect(poirot?.portraitId).toBeDefined();
    await expect(getPortrait(poirot!.portraitId!)).resolves.toMatchObject({ mimeType: 'image/svg+xml' });
  });

  it('can create Ackroyd through the tutorial selector', async () => {
    const bookId = await seedTutorialBook({ userId: 'reader-1', language: 'pt-BR', kind: 'ackroyd' });
    const book = await getBook(bookId);
    const notes = await listAnnotationsByBook(bookId);

    expect(book?.userId).toBe('reader-1');
    expect(book?.title).toBe('The Murder of Roger Ackroyd');
    expect(book?.totalChapters).toBe(27);
    expect(book?.currentChapter).toBe(2);
    expect(book?.highlightedChapters).toEqual([2, 10, 17]);
    expect(book?.spoilerChapters).toEqual([27]);
    expect(notes).toHaveLength(3);
    expect(notes.map((note) => note.content).join(' ')).toContain('Exporte a biblioteca');
  });

  it('creates a localized tutorial book for the current reader', async () => {
    const bookId = await seedTutorialBook({ userId: 'reader-1', language: 'zh-CN' });
    const book = await getBook(bookId);
    const characters = await listCharactersByBook(bookId);
    const relationships = await listRelationshipsByBook(bookId);
    const notes = await listAnnotationsByBook(bookId);
    const shino = characters.find((character) => character.name === '巽紫乃');
    const headless = characters.find((character) => character.name === '首狩武者');
    const senda = characters.find((character) => character.name === '仙田猿彦');

    expect(book?.userId).toBe('reader-1');
    expect(book?.title).toBe('飞驒机关宅邸杀人事件');
    expect(book?.totalChapters).toBe(3);
    expect(characters.map((character) => character.name)).toContain('金田一一');
    expect(characters.map((character) => character.name)).toContain('首狩武者');
    expect(shino?.roleReveals).toEqual([
      { role: 'murderer', chapterRevealed: 3 },
    ]);
    expect(headless?.roleReveals).toBeUndefined();
    expect(relationships).toEqual(expect.arrayContaining([
      expect.objectContaining({
        sourceId: shino?.id,
        targetId: headless?.id,
        chapterRevealed: 3,
        label: '真实身份',
      }),
      expect.objectContaining({
        sourceId: shino?.id,
        targetId: senda?.id,
        chapterRevealed: 3,
        label: '共犯',
      }),
    ]));
    expect(notes[0].content).toContain('按 E');
  });

  it('attaches optional local portrait assets to the tutorial when available', async () => {
    const originalFetch = globalThis.fetch;
    const fetchMock = vi.fn(async () => new Response(
      new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' }),
      { status: 200 },
    ));
    globalThis.fetch = fetchMock as typeof fetch;

    try {
      const bookId = await seedTutorialBook({ userId: 'reader-1', language: 'en' });
      const characters = await listCharactersByBook(bookId);
      const hajime = characters.find((character) => character.name === 'Hajime Kindaichi');

      expect(fetchMock).toHaveBeenCalledWith('/demo-portraits/kindaichi/hajime-kindaichi.png', { cache: 'force-cache' });
      expect(hajime?.portraitId).toBeDefined();
      await expect(getPortrait(hajime!.portraitId!)).resolves.toBeDefined();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
