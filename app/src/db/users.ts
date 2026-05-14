import { db } from './schema';
import type { User } from '@/types';

const ACTIVE_USER_KEY = 'calabash-active-user-id';
const DEFAULT_LIBRARY_NAME = 'My Library';
const LEGACY_DEFAULT_READER_NAME = 'Default Reader';
const AVATAR_COLORS = ['#8a3320', '#2c4d70', '#8a6a24', '#5e574d', '#9a2e6a', '#2f6b52'];
let ensureUsersPromise: Promise<{ users: User[]; activeUserId: string }> | null = null;

function colorForName(name: string) {
  const sum = [...name].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

function readStoredActiveUserId() {
  try { return localStorage.getItem(ACTIVE_USER_KEY); } catch { return null; }
}

export function storeActiveUserId(id: string) {
  try { localStorage.setItem(ACTIVE_USER_KEY, id); } catch { /* test env */ }
}

export async function createUser(input: { name: string; avatarColor?: string }): Promise<User> {
  const name = input.name.trim();
  if (!name) throw new Error('Profile name is required');
  const now = Date.now();
  const user: User = {
    id: crypto.randomUUID(),
    name,
    avatarColor: input.avatarColor ?? colorForName(name),
    createdAt: now,
    updatedAt: now,
  };
  await db.users.add(user);
  return user;
}

export async function listUsers(): Promise<User[]> {
  return (await db.users.toArray()).sort((a, b) => a.createdAt - b.createdAt || a.name.localeCompare(b.name));
}

export async function updateUser(id: string, patch: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User> {
  const existing = await db.users.get(id);
  if (!existing) throw new Error(`Profile ${id} not found`);
  const next: User = { ...existing, ...patch, updatedAt: Date.now() };
  await db.users.put(next);
  return next;
}

export async function deleteUser(id: string, fallbackUserId: string): Promise<void> {
  if (id === fallbackUserId) throw new Error('Cannot delete the fallback profile');
  await db.transaction('rw', [db.users, db.books, db.categories], async () => {
    await db.books.where('userId').equals(id).modify({ userId: fallbackUserId });
    await db.categories.where('userId').equals(id).modify({ userId: fallbackUserId });
    await db.users.delete(id);
  });
}

async function removeEmptyDuplicateDefaultReaders(users: User[]): Promise<User[]> {
  const defaults = users.filter((user) => user.name === DEFAULT_LIBRARY_NAME || user.name === LEGACY_DEFAULT_READER_NAME);
  if (defaults.length <= 1) return users;

  const storedId = readStoredActiveUserId();
  const keep = defaults.find((user) => user.id === storedId) ?? defaults[0];
  for (const user of defaults) {
    if (user.id === keep.id) continue;
    const [bookCount, categoryCount] = await Promise.all([
      db.books.where('userId').equals(user.id).count(),
      db.categories.where('userId').equals(user.id).count(),
    ]);
    if (bookCount === 0 && categoryCount === 0) await db.users.delete(user.id);
  }
  return listUsers();
}

async function ensureUsersInner(): Promise<{ users: User[]; activeUserId: string }> {
  let users = await listUsers();
  if (users.length === 0) {
    const defaultUser = await createUser({ name: DEFAULT_LIBRARY_NAME, avatarColor: '#8a3320' });
    users = [defaultUser];
  }
  users = await removeEmptyDuplicateDefaultReaders(users);
  if (users.length === 1 && users[0].name === LEGACY_DEFAULT_READER_NAME) {
    await updateUser(users[0].id, { name: DEFAULT_LIBRARY_NAME });
    users = await listUsers();
  }

  const fallback = users[0];
  await db.transaction('rw', [db.books, db.categories], async () => {
    await db.books.filter((book) => !book.userId).modify({ userId: fallback.id });
    await db.categories.filter((category) => !category.userId).modify({ userId: fallback.id });
  });

  const refreshed = await listUsers();
  const storedId = readStoredActiveUserId();
  const activeUserId = refreshed.some((user) => user.id === storedId) ? storedId! : fallback.id;
  storeActiveUserId(activeUserId);
  return { users: refreshed, activeUserId };
}

export async function ensureUsers(): Promise<{ users: User[]; activeUserId: string }> {
  ensureUsersPromise ??= ensureUsersInner().finally(() => {
    ensureUsersPromise = null;
  });
  return ensureUsersPromise;
}
