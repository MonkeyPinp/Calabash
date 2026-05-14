import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/db/schema';
import {
  createCharacter,
  getCharacter,
  listCharactersByBook,
  updateCharacter,
  deleteCharacter,
} from '@/db/characters';

const BOOK_ID = 'book-1';

describe('characters DAO', () => {
  beforeEach(async () => {
    await db.characters.clear();
  });

  it('createCharacter assigns a UUID, timestamps, and defaults', async () => {
    const c = await createCharacter({
      bookId: BOOK_ID,
      name: 'Hercule Poirot',
      role: 'detective',
      chapterIntroduced: 1,
    });
    expect(c.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(c.aliases).toEqual([{ name: 'Hercule Poirot', chapterRevealed: 1 }]);
    expect(c.position).toEqual({ x: 0, y: 0 });
    expect(c.createdAt).toBeGreaterThan(0);
  });

  it('createCharacter accepts custom aliases and position', async () => {
    const c = await createCharacter({
      bookId: BOOK_ID,
      name: 'the housekeeper',
      role: 'suspect',
      chapterIntroduced: 2,
      aliases: [
        { name: 'the housekeeper', chapterRevealed: 2 },
        { name: 'Mary Smith',      chapterRevealed: 12 },
      ],
      position: { x: 100, y: 50 },
    });
    expect(c.aliases).toHaveLength(2);
    expect(c.position).toEqual({ x: 100, y: 50 });
  });

  it('accepts custom and blank optional roles', async () => {
    const mentor = await createCharacter({
      bookId: BOOK_ID,
      name: 'Lady Vimes',
      role: 'mentor',
      chapterIntroduced: 1,
    });
    const untyped = await createCharacter({
      bookId: BOOK_ID,
      name: 'A stranger',
      role: '   ',
      chapterIntroduced: 1,
    });

    expect(mentor.role).toBe('mentor');
    expect(untyped.role).toBeUndefined();
  });

  it('listCharactersByBook returns only characters for that book', async () => {
    await createCharacter({ bookId: 'book-A', name: 'A', role: 'detective', chapterIntroduced: 1 });
    await createCharacter({ bookId: 'book-B', name: 'B', role: 'suspect',   chapterIntroduced: 1 });
    const aOnly = await listCharactersByBook('book-A');
    expect(aOnly).toHaveLength(1);
    expect(aOnly[0].name).toBe('A');
  });

  it('updateCharacter merges and bumps updatedAt', async () => {
    const c = await createCharacter({
      bookId: BOOK_ID, name: 'X', role: 'suspect', chapterIntroduced: 1,
    });
    await new Promise((r) => setTimeout(r, 2));
    const u = await updateCharacter(c.id, { notes: 'suspicious' });
    expect(u.notes).toBe('suspicious');
    expect(u.updatedAt).toBeGreaterThan(c.updatedAt);
  });

  it('deleteCharacter removes the row', async () => {
    const c = await createCharacter({
      bookId: BOOK_ID, name: 'X', role: 'suspect', chapterIntroduced: 1,
    });
    await deleteCharacter(c.id);
    expect(await getCharacter(c.id)).toBeUndefined();
  });
});
