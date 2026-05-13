import { db } from './schema';
import type { Relationship, RelationshipType, CertaintyLevel } from '@/types';

export interface CreateRelationshipInput {
  bookId: string;
  sourceId: string;
  targetId: string;
  type: RelationshipType;
  chapterRevealed: number;
  label?: string;
  notes?: string;
  certainty?: CertaintyLevel;
}

export async function createRelationship(input: CreateRelationshipInput): Promise<Relationship> {
  const now = Date.now();
  const rel: Relationship = {
    id: crypto.randomUUID(),
    bookId: input.bookId,
    sourceId: input.sourceId,
    targetId: input.targetId,
    type: input.type,
    label: input.label,
    notes: input.notes,
    chapterRevealed: input.chapterRevealed,
    certainty: input.certainty ?? 'suspected',
    createdAt: now,
    updatedAt: now,
  };
  await db.relationships.add(rel);
  return rel;
}

export async function getRelationship(id: string): Promise<Relationship | undefined> {
  return db.relationships.get(id);
}

export async function listRelationshipsByBook(bookId: string): Promise<Relationship[]> {
  return db.relationships.where('bookId').equals(bookId).toArray();
}

export async function updateRelationship(
  id: string,
  patch: Partial<Omit<Relationship, 'id' | 'bookId' | 'createdAt'>>,
): Promise<Relationship> {
  const existing = await db.relationships.get(id);
  if (!existing) throw new Error(`Relationship ${id} not found`);
  const next: Relationship = { ...existing, ...patch, updatedAt: Date.now() };
  await db.relationships.put(next);
  return next;
}

export async function deleteRelationship(id: string): Promise<void> {
  await db.relationships.delete(id);
}
