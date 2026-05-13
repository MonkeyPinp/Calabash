import { db } from './schema';
import type { Portrait } from '@/types';

export interface SavePortraitInput {
  bookId: string;
  blob: Blob;
  mimeType: string;
}

export async function savePortrait(input: SavePortraitInput): Promise<Portrait> {
  const blobBuffer = await input.blob.arrayBuffer();
  const row = {
    id: crypto.randomUUID(),
    bookId: input.bookId,
    blobBuffer,
    mimeType: input.mimeType,
    createdAt: Date.now(),
  };
  await db.portraits.add(row);
  return {
    id: row.id,
    bookId: row.bookId,
    blob: new Blob([blobBuffer], { type: input.mimeType }),
    mimeType: row.mimeType,
    createdAt: row.createdAt,
  };
}

export async function getPortrait(id: string): Promise<Portrait | undefined> {
  const row = await db.portraits.get(id);
  if (!row) return undefined;
  return {
    id: row.id,
    bookId: row.bookId,
    blob: new Blob([row.blobBuffer], { type: row.mimeType }),
    mimeType: row.mimeType,
    createdAt: row.createdAt,
  };
}

export async function deletePortrait(id: string): Promise<void> {
  await db.portraits.delete(id);
}
