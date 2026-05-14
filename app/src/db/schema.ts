import Dexie, { type Table } from 'dexie';
import type { Book, Category, Character, GroupRange, Relationship, StickyNote, User } from '@/types';
import { normalizeStickyNote } from '@/lib/stickyNotes';
import { normalizeGroupRange } from '@/lib/groupRanges';

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
  users!:         Table<User, string>;
  books!:         Table<Book, string>;
  categories!:    Table<Category, string>;
  characters!:    Table<Character, string>;
  relationships!: Table<Relationship, string>;
  portraits!:     Table<PortraitRow, string>;
  annotations!:   Table<StickyNote, string>;
  groupRanges!:   Table<GroupRange, string>;

  constructor() {
    super('calabash');
    this.version(1).stores({
      books:         'id, updatedAt',
      characters:    'id, bookId, chapterIntroduced',
      relationships: 'id, bookId, sourceId, targetId, chapterRevealed',
      portraits:     'id, bookId',
    });
    this.version(2).stores({
      books:         'id, updatedAt',
      characters:    'id, bookId, chapterIntroduced',
      relationships: 'id, bookId, sourceId, targetId, chapterRevealed',
      portraits:     'id, bookId',
      annotations:   'id, bookId',
    });
    this.version(3).stores({
      books:         'id, updatedAt, categoryId',
      categories:    'id, userId, order',
      characters:    'id, bookId, chapterIntroduced',
      relationships: 'id, bookId, sourceId, targetId, chapterRevealed',
      portraits:     'id, bookId',
      annotations:   'id, bookId',
    });
    this.version(4).stores({
      users:         'id, updatedAt',
      books:         'id, userId, updatedAt, categoryId',
      categories:    'id, userId, order',
      characters:    'id, bookId, chapterIntroduced',
      relationships: 'id, bookId, sourceId, targetId, chapterRevealed',
      portraits:     'id, bookId',
      annotations:   'id, bookId',
    });
    this.version(5).stores({
      users:         'id, updatedAt',
      books:         'id, userId, updatedAt, categoryId',
      categories:    'id, userId, order',
      characters:    'id, bookId, chapterIntroduced',
      relationships: 'id, bookId, sourceId, targetId, chapterRevealed',
      portraits:     'id, bookId',
      annotations:   'id, bookId, chapterIntroduced',
    }).upgrade((tx) =>
      tx.table('annotations').toCollection().modify((note: StickyNote) => {
        Object.assign(note, normalizeStickyNote(note));
      }),
    );
    this.version(6).stores({
      users:         'id, updatedAt',
      books:         'id, userId, updatedAt, categoryId',
      categories:    'id, userId, order',
      characters:    'id, bookId, chapterIntroduced',
      relationships: 'id, bookId, sourceId, targetId, chapterRevealed',
      portraits:     'id, bookId',
      annotations:   'id, bookId, chapterIntroduced',
      groupRanges:   'id, bookId',
    });
    this.version(7).stores({
      users:         'id, updatedAt',
      books:         'id, userId, updatedAt, categoryId',
      categories:    'id, userId, order',
      characters:    'id, bookId, chapterIntroduced',
      relationships: 'id, bookId, sourceId, targetId, chapterRevealed',
      portraits:     'id, bookId',
      annotations:   'id, bookId, chapterIntroduced',
      groupRanges:   'id, bookId, chapterIntroduced',
    }).upgrade((tx) =>
      tx.table('groupRanges').toCollection().modify((range: GroupRange) => {
        Object.assign(range, normalizeGroupRange(range));
      }),
    );
  }
}

export const db = new CalabashDB();
