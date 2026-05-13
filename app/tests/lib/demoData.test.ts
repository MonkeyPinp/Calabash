import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/schema';
import { getBook } from '@/db/books';
import { listCategories } from '@/db/categories';
import { listCharactersByBook } from '@/db/characters';
import { seedRogerAckroyd } from '@/lib/demoData';
import { getMinimumLayoutNodeDistance, MIN_LAYOUT_NODE_DISTANCE } from '@/lib/layout';

describe('Ackroyd demo data', () => {
  beforeEach(async () => {
    await Promise.all([
      db.books.clear(),
      db.categories.clear(),
      db.characters.clear(),
      db.relationships.clear(),
      db.annotations.clear(),
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
});
