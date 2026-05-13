import { db } from './schema';
import type { Category } from '@/types';

export interface CreateCategoryInput {
  name: string;
  userId?: string;
}

export async function createCategory(input: CreateCategoryInput): Promise<Category> {
  const name = input.name.trim();
  if (!name) throw new Error('Category name is required');

  const now = Date.now();
  const existing = await db.categories.toArray();
  const maxOrder = existing.reduce((max, category) => Math.max(max, category.order), -1);
  const category: Category = {
    id: crypto.randomUUID(),
    userId: input.userId,
    name,
    order: maxOrder + 1,
    createdAt: now,
    updatedAt: now,
  };
  await db.categories.add(category);
  return category;
}

export async function findOrCreateCategory(input: CreateCategoryInput): Promise<Category> {
  const name = input.name.trim();
  if (!name) throw new Error('Category name is required');

  const existing = await db.categories
    .filter((category) =>
      category.name.localeCompare(name, undefined, { sensitivity: 'accent' }) === 0 &&
      category.userId === input.userId
    )
    .first();
  return existing ?? createCategory({ name, userId: input.userId });
}

export async function listCategories(): Promise<Category[]> {
  const categories = await db.categories.toArray();
  return categories.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}

export async function updateCategory(
  id: string,
  patch: Partial<Omit<Category, 'id' | 'createdAt'>>,
): Promise<Category> {
  const existing = await db.categories.get(id);
  if (!existing) throw new Error(`Category ${id} not found`);
  const next: Category = { ...existing, ...patch, updatedAt: Date.now() };
  await db.categories.put(next);
  return next;
}

export async function deleteCategory(id: string): Promise<void> {
  await db.transaction('rw', [db.categories, db.books], async () => {
    await db.books.where('categoryId').equals(id).modify({ categoryId: undefined });
    await db.categories.delete(id);
  });
}
