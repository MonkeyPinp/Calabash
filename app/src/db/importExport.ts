import { db, type PortraitRow } from './schema';
import type { Book, Category, Character, Relationship, StickyNote, User } from '@/types';

const CALABASH_VERSION = '0.1.1';

export interface PortraitExport {
  id: string;
  bookId: string;
  mimeType: string;
  dataUrl: string;
  createdAt?: number;
}

export interface CalabashExport {
  calabashVersion: string;
  book: Book;
  characters: Character[];
  relationships: Relationship[];
  portraits: PortraitExport[];
  annotations?: StickyNote[];
}

export interface CalabashLibraryExport {
  calabashVersion: string;
  exportType: 'library';
  exportedAt: number;
  users: User[];
  categories: Category[];
  books: Book[];
  characters: Character[];
  relationships: Relationship[];
  annotations: StickyNote[];
  portraits: PortraitExport[];
}

export interface ImportLibraryResult {
  activeUserId?: string;
  activeBookId?: string;
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

function normalizeBookForPortableData(book: Book): Book {
  return {
    ...book,
    spoilerShield: book.spoilerShield ?? false,
    spoilerChapters: book.spoilerChapters ?? [],
    highlightedChapters: book.highlightedChapters ?? [],
  };
}

export function isLibraryExport(payload: unknown): payload is CalabashLibraryExport {
  return Boolean(
    payload &&
    typeof payload === 'object' &&
    (payload as { exportType?: unknown }).exportType === 'library',
  );
}

export async function exportBookAsJson(bookId: string): Promise<CalabashExport> {
  const book = await db.books.get(bookId);
  if (!book) throw new Error(`Book ${bookId} not found`);
  const characters    = await db.characters.where('bookId').equals(bookId).toArray();
  const relationships = await db.relationships.where('bookId').equals(bookId).toArray();
  const portraitRows  = await db.portraits.where('bookId').equals(bookId).toArray();
  const annotations   = await db.annotations.where('bookId').equals(bookId).toArray();
  const portraits: PortraitExport[] = portraitRows.map((p) => ({
    id: p.id,
    bookId: p.bookId,
    mimeType: p.mimeType,
    dataUrl: bufferToDataUrl(p.blobBuffer, p.mimeType),
    createdAt: p.createdAt,
  }));
  return { calabashVersion: CALABASH_VERSION, book: normalizeBookForPortableData(book), characters, relationships, portraits, annotations };
}

export async function exportLibraryAsJson(): Promise<CalabashLibraryExport> {
  const [users, categories, books, characters, relationships, portraitRows, annotations] = await Promise.all([
    db.users.toArray(),
    db.categories.toArray(),
    db.books.toArray(),
    db.characters.toArray(),
    db.relationships.toArray(),
    db.portraits.toArray(),
    db.annotations.toArray(),
  ]);
  const portraits: PortraitExport[] = portraitRows.map((p) => ({
    id: p.id,
    bookId: p.bookId,
    mimeType: p.mimeType,
    dataUrl: bufferToDataUrl(p.blobBuffer, p.mimeType),
    createdAt: p.createdAt,
  }));
  return {
    calabashVersion: CALABASH_VERSION,
    exportType: 'library',
    exportedAt: Date.now(),
    users,
    categories,
    books: books.map(normalizeBookForPortableData),
    characters,
    relationships,
    annotations,
    portraits,
  };
}

export async function importBookFromJson(payload: CalabashExport, userId?: string): Promise<string> {
  const now = Date.now();
  const newBookId = crypto.randomUUID();
  const charIdMap = new Map<string, string>();
  const portraitIdMap = new Map<string, string>();

  const newPortraits = (payload.portraits ?? []).map((p) => {
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

  const newAnnotations = (payload.annotations ?? []).map((annotation) => ({
    ...annotation,
    id: crypto.randomUUID(),
    bookId: newBookId,
    createdAt: now,
    updatedAt: now,
  }));

  await db.transaction('rw', [db.books, db.characters, db.relationships, db.portraits, db.annotations], async () => {
    await db.books.put({
      ...payload.book,
      id: newBookId,
      userId,
      categoryId: undefined,
      spoilerShield: payload.book.spoilerShield ?? false,
      spoilerChapters: payload.book.spoilerChapters ?? [],
      highlightedChapters: payload.book.highlightedChapters ?? [],
      createdAt: now,
      updatedAt: now,
    });
    if (newPortraits.length)     await db.portraits.bulkAdd(newPortraits);
    if (newCharacters.length)    await db.characters.bulkAdd(newCharacters);
    if (newRelationships.length) await db.relationships.bulkAdd(newRelationships);
    if (newAnnotations.length)   await db.annotations.bulkAdd(newAnnotations);
  });

  return newBookId;
}

export async function importLibraryFromJson(payload: CalabashLibraryExport): Promise<ImportLibraryResult> {
  if (!isLibraryExport(payload)) throw new Error('Invalid Calabash library export');

  const portraits: PortraitRow[] = (payload.portraits ?? []).map((p) => {
    const { buffer, mimeType } = dataUrlToBuffer(p.dataUrl);
    return {
      id: p.id,
      bookId: p.bookId,
      blobBuffer: buffer,
      mimeType: p.mimeType || mimeType,
      createdAt: p.createdAt ?? Date.now(),
    };
  });
  const books = (payload.books ?? []).map(normalizeBookForPortableData);

  await db.transaction(
    'rw',
    [db.users, db.categories, db.books, db.characters, db.relationships, db.portraits, db.annotations],
    async () => {
      if (payload.users?.length) await db.users.bulkPut(payload.users);
      if (payload.categories?.length) await db.categories.bulkPut(payload.categories);
      if (books.length) await db.books.bulkPut(books);
      if (payload.characters?.length) await db.characters.bulkPut(payload.characters);
      if (payload.relationships?.length) await db.relationships.bulkPut(payload.relationships);
      if (payload.annotations?.length) await db.annotations.bulkPut(payload.annotations);
      if (portraits.length) await db.portraits.bulkPut(portraits);
    },
  );

  const activeBook = books[0];
  const activeUserId = activeBook?.userId ?? payload.users?.[0]?.id;
  return { activeUserId, activeBookId: activeBook?.id };
}
