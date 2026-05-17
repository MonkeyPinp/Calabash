import { describe, expect, it } from 'vitest';
import { deserializePortraitFromSqlite, serializePortraitForSqlite } from '@/db/sqlite';
import type { PortraitRow } from '@/db/schema';

describe('SQLite serialization helpers', () => {
  it('round-trips portrait ArrayBuffers through JSON payloads', () => {
    const row: PortraitRow = {
      id: 'portrait-1',
      bookId: 'book-1',
      blobBuffer: new Uint8Array([0, 1, 2, 253, 254, 255]).buffer,
      mimeType: 'image/png',
      createdAt: 123,
    };

    const restored = deserializePortraitFromSqlite(serializePortraitForSqlite(row));

    expect(restored).toMatchObject({
      id: row.id,
      bookId: row.bookId,
      mimeType: row.mimeType,
      createdAt: row.createdAt,
    });
    expect(Array.from(new Uint8Array(restored.blobBuffer))).toEqual([0, 1, 2, 253, 254, 255]);
  });
});
