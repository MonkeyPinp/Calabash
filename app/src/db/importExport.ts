import { db } from './schema';
import type { Book, Character, Relationship } from '@/types';

const CALABASH_VERSION = '0.1.0';

export interface PortraitExport {
  id: string;
  bookId: string;
  mimeType: string;
  dataUrl: string;
}

export interface CalabashExport {
  calabashVersion: string;
  book: Book;
  characters: Character[];
  relationships: Relationship[];
  portraits: PortraitExport[];
}

function bufferToDataUrl(buffer: ArrayBuffer, mimeType: string): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return `data:${mimeType};base64,${btoa(binary)}`;
}

function dataUrlToBuffer(dataUrl: string): { buffer: ArrayBuffer; mimeType: string } {
  const match = /^data:([^;]+);base64,(.*)$/.exec(dataUrl);
  if (!match) throw new Error('Invalid data URL');
  const [, mimeType, base64] = match;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return { buffer: bytes.buffer, mimeType };
}

export async function exportBookAsJson(bookId: string): Promise<CalabashExport> {
  const book = await db.books.get(bookId);
  if (!book) throw new Error(`Book ${bookId} not found`);
  const characters    = await db.characters.where('bookId').equals(bookId).toArray();
  const relationships = await db.relationships.where('bookId').equals(bookId).toArray();
  const portraitRows  = await db.portraits.where('bookId').equals(bookId).toArray();
  const portraits: PortraitExport[] = portraitRows.map((p) => ({
    id: p.id,
    bookId: p.bookId,
    mimeType: p.mimeType,
    dataUrl: bufferToDataUrl(p.blobBuffer, p.mimeType),
  }));
  return { calabashVersion: CALABASH_VERSION, book, characters, relationships, portraits };
}

export async function importBookFromJson(payload: CalabashExport): Promise<string> {
  const now = Date.now();
  const newBookId = crypto.randomUUID();
  const charIdMap = new Map<string, string>();
  const portraitIdMap = new Map<string, string>();

  const newPortraits = payload.portraits.map((p) => {
    const newId = crypto.randomUUID();
    portraitIdMap.set(p.id, newId);
    const { buffer, mimeType } = dataUrlToBuffer(p.dataUrl);
    return { id: newId, bookId: newBookId, blobBuffer: buffer, mimeType, createdAt: now };
  });

  const newCharacters = payload.characters.map((c) => {
    const newId = crypto.randomUUID();
    charIdMap.set(c.id, newId);
    return {
      ...c,
      id: newId,
      bookId: newBookId,
      portraitId: c.portraitId ? portraitIdMap.get(c.portraitId) : undefined,
      createdAt: now,
      updatedAt: now,
    };
  });

  const newRelationships = payload.relationships.map((r) => ({
    ...r,
    id: crypto.randomUUID(),
    bookId: newBookId,
    sourceId: charIdMap.get(r.sourceId) ?? r.sourceId,
    targetId: charIdMap.get(r.targetId) ?? r.targetId,
    createdAt: now,
    updatedAt: now,
  }));

  await db.transaction('rw', db.books, db.characters, db.relationships, db.portraits, async () => {
    await db.books.put({ ...payload.book, id: newBookId, createdAt: now, updatedAt: now });
    if (newPortraits.length)     await db.portraits.bulkAdd(newPortraits);
    if (newCharacters.length)    await db.characters.bulkAdd(newCharacters);
    if (newRelationships.length) await db.relationships.bulkAdd(newRelationships);
  });

  return newBookId;
}
