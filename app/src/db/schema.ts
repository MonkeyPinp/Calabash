import Dexie, { type Table } from 'dexie';
import type { Book, Character, Relationship } from '@/types';

// Internal DB row: stores blobBuffer (ArrayBuffer) instead of Blob
// so fake-indexeddb can serialize it in tests. The DAO converts at the boundary.
export interface PortraitRow {
  id: string;
  bookId: string;
  blobBuffer: ArrayBuffer;
  mimeType: string;
  createdAt: number;
}

export class CalabashDB extends Dexie {
  books!:         Table<Book, string>;
  characters!:    Table<Character, string>;
  relationships!: Table<Relationship, string>;
  portraits!:     Table<PortraitRow, string>;

  constructor() {
    super('calabash');
    this.version(1).stores({
      books:         'id, updatedAt',
      characters:    'id, bookId, chapterIntroduced',
      relationships: 'id, bookId, sourceId, targetId, chapterRevealed',
      portraits:     'id, bookId',
    });
  }
}

export const db = new CalabashDB();
