import { beforeEach, describe, expect, it } from 'vitest';
import { createBook, getBook } from '@/db/books';
import { createCategory, listCategories } from '@/db/categories';
import { createUser, deleteUser, ensureUsers, listUsers, storeActiveUserId, updateUser } from '@/db/users';
import { db } from '@/db/schema';

describe('users DAO', () => {
  beforeEach(async () => {
    localStorage.clear();
    await Promise.all([
      db.users.clear(),
      db.books.clear(),
      db.categories.clear(),
    ]);
  });

  it('creates a local library and migrates existing local data to it', async () => {
    const book = await createBook({ title: 'Legacy Book' });
    const category = await createCategory({ name: 'Legacy Category' });

    const { users, activeUserId } = await ensureUsers();

    expect(users).toHaveLength(1);
    expect(users[0].name).toBe('My Library');
    expect(activeUserId).toBe(users[0].id);
    expect((await getBook(book.id))?.userId).toBe(users[0].id);
    expect((await listCategories())[0].id).toBe(category.id);
    expect((await listCategories())[0].userId).toBe(users[0].id);
    expect(localStorage.getItem('calabash-active-user-id')).toBe(users[0].id);
  });

  it('does not create duplicate default readers during concurrent hydration', async () => {
    const [first, second] = await Promise.all([ensureUsers(), ensureUsers()]);

    expect(first.activeUserId).toBe(second.activeUserId);
    expect(await listUsers()).toHaveLength(1);
  });

  it('uses a stored active reader when it still exists', async () => {
    const first = await createUser({ name: 'Reader One' });
    const second = await createUser({ name: 'Reader Two' });
    storeActiveUserId(second.id);

    const result = await ensureUsers();

    expect(result.activeUserId).toBe(second.id);
    expect(result.users.map((user) => user.id)).toEqual([first.id, second.id]);
  });

  it('renames and deletes profiles while moving data to a fallback reader', async () => {
    const first = await createUser({ name: 'Reader One' });
    const second = await createUser({ name: 'Reader Two' });
    const book = await createBook({ title: 'Owned Book', userId: second.id });
    await updateUser(second.id, { name: 'Renamed Reader' });

    await deleteUser(second.id, first.id);

    expect((await listUsers()).map((user) => user.name)).toEqual(['Reader One']);
    expect((await getBook(book.id))?.userId).toBe(first.id);
  });
});
