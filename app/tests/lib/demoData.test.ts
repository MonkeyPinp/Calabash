import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/db/schema';
import { getBook } from '@/db/books';
import { listCategories } from '@/db/categories';
import { listCharactersByBook } from '@/db/characters';
import { listRelationshipsByBook } from '@/db/relationships';
import { listAnnotationsByBook } from '@/db/annotations';
import { listGroupRangesByBook } from '@/db/groupRanges';
import { getPortrait } from '@/db/portraits';
import { getTutorialDefaultViewMode, seedRogerAckroyd, seedTutorialBook } from '@/lib/demoData';
import { getMinimumLayoutNodeDistance, MIN_LAYOUT_NODE_DISTANCE } from '@/lib/layout';

describe('Ackroyd demo data', () => {
  beforeEach(async () => {
    await Promise.all([
      db.books.clear(),
      db.categories.clear(),
      db.characters.clear(),
      db.relationships.clear(),
      db.annotations.clear(),
      db.groupRanges.clear(),
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

  it('keeps Ackroyd narrative milestones chapter-accurate', async () => {
    const bookId = await seedRogerAckroyd();
    const book = await getBook(bookId);
    const characters = await listCharactersByBook(bookId);
    const relationships = await listRelationshipsByBook(bookId);
    const ackroyd = characters.find((character) => character.name === 'Roger Ackroyd');
    const sheppard = characters.find((character) => character.name === 'Dr. James Sheppard');
    const ursula = characters.find((character) => character.name === 'the parlour maid');
    const poirot = characters.find((character) => character.name === 'Hercule Poirot');
    const ralph = characters.find((character) => character.name === 'Ralph Paton');
    const flora = characters.find((character) => character.name === 'Flora Ackroyd');
    const blunt = characters.find((character) => character.name === 'Major Hector Blunt');

    expect(book?.highlightedChapters).toEqual([2, 5, 10, 21]);
    expect(book?.spoilerChapters).toEqual([25, 27]);
    expect(ackroyd?.role).toBe('other');
    expect(ackroyd?.roleReveals).toEqual([{ role: 'victim', chapterRevealed: 5 }]);
    expect(ackroyd?.notes).toContain('chapter 5');
    expect(sheppard?.roleReveals).toEqual([{ role: 'murderer', chapterRevealed: 25 }]);
    expect(ursula?.aliases).toEqual([
      { name: 'the parlour maid', chapterRevealed: 2 },
      { name: 'Ursula Bourne', chapterRevealed: 10 },
      { name: 'Ursula Paton', chapterRevealed: 21 },
    ]);
    expect(relationships).toEqual(expect.arrayContaining([
      expect.objectContaining({
        sourceId: ralph?.id,
        targetId: flora?.id,
        chapterRevealed: 4,
        label: 'engaged',
      }),
      expect.objectContaining({
        sourceId: ralph?.id,
        targetId: ursula?.id,
        chapterRevealed: 21,
        label: 'secretly married',
      }),
      expect.objectContaining({
        sourceId: blunt?.id,
        targetId: flora?.id,
        chapterRevealed: 19,
        label: 'loves',
      }),
      expect.objectContaining({
        sourceId: poirot?.id,
        targetId: sheppard?.id,
        chapterRevealed: 25,
        label: 'unmasks',
      }),
    ]));
  });

  it('can create Ackroyd through the tutorial selector', async () => {
    const bookId = await seedTutorialBook({ userId: 'reader-1', language: 'pt-BR', kind: 'ackroyd' });
    const book = await getBook(bookId);
    const notes = await listAnnotationsByBook(bookId);
    const groups = await listGroupRangesByBook(bookId);

    expect(book?.userId).toBe('reader-1');
    expect(book?.title).toBe('The Murder of Roger Ackroyd');
    expect(book?.totalChapters).toBe(27);
    expect(book?.currentChapter).toBe(2);
    expect(book?.highlightedChapters).toEqual([2, 5, 10, 21]);
    expect(book?.spoilerChapters).toEqual([25, 27]);
    expect(notes).toHaveLength(3);
    expect(groups).toHaveLength(3);
    expect(groups.map((group) => group.chapterIntroduced).sort((a, b) => a - b)).toEqual([1, 2, 21]);
    expect(notes.map((note) => note.content).join(' ')).toContain('Exporte a biblioteca');
  });

  it('recommends contrasting default board styles for the two tutorials', () => {
    expect(getTutorialDefaultViewMode('ackroyd')).toBe('portrait');
    expect(getTutorialDefaultViewMode('hida')).toBe('text');
  });

  it('creates a localized tutorial book for the current reader', async () => {
    const bookId = await seedTutorialBook({ userId: 'reader-1', language: 'zh-CN' });
    const book = await getBook(bookId);
    const characters = await listCharactersByBook(bookId);
    const relationships = await listRelationshipsByBook(bookId);
    const notes = await listAnnotationsByBook(bookId);
    const groups = await listGroupRangesByBook(bookId);
    const shino = characters.find((character) => character.name === '巽紫乃');
    const ayako = characters.find((character) => character.name === '巽绫子');
    const seimaru = characters.find((character) => character.name === '巽征丸');
    const ryunosuke = characters.find((character) => character.name === '巽龙之介');
    const hayato = characters.find((character) => character.name === '巽隼人');
    const moegi = characters.find((character) => character.name === '巽萌黄');
    const headless = characters.find((character) => character.name === '首狩武者');
    const senda = characters.find((character) => character.name === '仙田猿彦');
    const kenmochi = characters.find((character) => character.name === '剑持勇');

    expect(book?.userId).toBe('reader-1');
    expect(book?.title).toBe('飞驒机关宅邸杀人事件');
    expect(book?.totalChapters).toBe(3);
    expect(characters.map((character) => character.name)).toContain('金田一一');
    expect(characters.map((character) => character.name)).toContain('首狩武者');
    expect(ayako?.profession).toBe('巽家已故先妻');
    expect(seimaru?.profession).toBe('紫乃名义上的儿子');
    expect(ryunosuke?.profession).toBe('巽家名义长子');
    expect(shino?.roleReveals).toEqual([
      { role: 'murderer', chapterRevealed: 3 },
    ]);
    expect(headless?.roleReveals).toBeUndefined();
    expect(headless?.aliases).toEqual([
      { name: '首狩武者', chapterRevealed: 1 },
      { name: '巽紫乃（首狩武者）', chapterRevealed: 3 },
    ]);
    expect(kenmochi?.notes).toContain('巽紫乃');
    expect(relationships).toEqual(expect.arrayContaining([
      expect.objectContaining({
        sourceId: shino?.id,
        targetId: seimaru?.id,
        chapterRevealed: 1,
        label: '名义母子',
      }),
      expect.objectContaining({
        sourceId: shino?.id,
        targetId: ryunosuke?.id,
        chapterRevealed: 1,
        label: '继母/继子',
      }),
      expect.objectContaining({
        sourceId: ayako?.id,
        targetId: hayato?.id,
        chapterRevealed: 1,
        label: '亲生母子',
      }),
      expect.objectContaining({
        sourceId: ayako?.id,
        targetId: moegi?.id,
        chapterRevealed: 1,
        label: '亲生母女',
      }),
      expect.objectContaining({
        sourceId: shino?.id,
        targetId: ryunosuke?.id,
        chapterRevealed: 3,
        label: '亲生母子',
      }),
      expect.objectContaining({
        sourceId: ayako?.id,
        targetId: seimaru?.id,
        chapterRevealed: 3,
        label: '亲生母子',
      }),
      expect.objectContaining({
        sourceId: senda?.id,
        targetId: ryunosuke?.id,
        chapterRevealed: 3,
        label: '亲生父子',
      }),
      expect.objectContaining({
        sourceId: shino?.id,
        targetId: headless?.id,
        chapterRevealed: 3,
        label: '真实身份',
        notes: '第 3 集揭示：首狩武者的真实身份是巽紫乃。',
      }),
      expect.objectContaining({
        sourceId: kenmochi?.id,
        targetId: shino?.id,
        chapterRevealed: 2,
        label: '儿时好友',
      }),
      expect.objectContaining({
        sourceId: shino?.id,
        targetId: senda?.id,
        chapterRevealed: 3,
        label: '共犯',
      }),
    ]));
    expect(groups).toHaveLength(2);
    expect(groups.map((group) => group.label)).toEqual(expect.arrayContaining(['调查组', '巽家成员']));
    expect(groups.map((group) => group.label)).not.toContain('假面威胁');
    expect(notes[0].content).toContain('按 E');
    expect(notes[0].content).not.toContain('假面威胁');
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
