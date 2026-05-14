import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/schema';
import { createBook, getBook } from '@/db/books';
import { createCategory, deleteCategory, findOrCreateCategory, listCategories, updateCategory } from '@/db/categories';

describe('categories DAO', () => {
  beforeEach(async () => {
    await Promise.all([
      db.books.clear(),
      db.categories.clear(),
      db.users.clear(),
    ]);
  });

  it('creates and lists categories by order', async () => {
    const first = await createCategory({ name: 'Agatha Christie' });
    const second = await createCategory({ name: 'Higashino Keigo' });

    expect(first.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(second.order).toBe(first.order + 1);
    expect((await listCategories()).map((category) => category.name)).toEqual([
      'Agatha Christie',
      'Higashino Keigo',
    ]);
  });

  it('updates category fields', async () => {
    const category = await createCategory({ name: 'Mystery' });
    const updated = await updateCategory(category.id, { name: 'Golden Age' });
    expect(updated.name).toBe('Golden Age');
    expect(updated.updatedAt).toBeGreaterThanOrEqual(category.updatedAt);
  });

  it('findOrCreateCategory reuses an existing category by name', async () => {
    const first = await findOrCreateCategory({ name: 'Agatha Christie' });
    const second = await findOrCreateCategory({ name: 'Agatha Christie' });

    expect(second.id).toBe(first.id);
    expect(await listCategories()).toHaveLength(1);
  });

  it('scopes category ordering and listing by reader profile', async () => {
    const first = await createCategory({ name: 'Mystery', userId: 'reader-a' });
    const second = await createCategory({ name: 'Mystery', userId: 'reader-b' });

    expect(first.order).toBe(0);
    expect(second.order).toBe(0);
    expect((await listCategories('reader-a')).map((category) => category.id)).toEqual([first.id]);
    expect((await listCategories('reader-b')).map((category) => category.id)).toEqual([second.id]);
  });

  it('deleting a category moves its books to Uncategorized', async () => {
    const category = await createCategory({ name: 'Agatha Christie' });
    const book = await createBook({ title: 'The Murder of Roger Ackroyd', categoryId: category.id });

    await deleteCategory(category.id);

    expect(await listCategories()).toEqual([]);
    expect((await getBook(book.id))?.categoryId).toBeUndefined();
  });
});
