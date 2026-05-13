import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/db/schema';
import { savePortrait, getPortrait, deletePortrait } from '@/db/portraits';

describe('portraits DAO', () => {
  beforeEach(async () => {
    await db.portraits.clear();
  });

  it('savePortrait stores a Blob and returns a Portrait with a UUID id', async () => {
    const blob = new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'image/png' });
    const p = await savePortrait({ bookId: 'b', blob, mimeType: 'image/png' });
    expect(p.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(p.mimeType).toBe('image/png');
  });

  it('getPortrait retrieves the stored Blob with correct byte length', async () => {
    const bytes = new Uint8Array([10, 20, 30, 40, 50]);
    const blob = new Blob([bytes], { type: 'image/jpeg' });
    const saved = await savePortrait({ bookId: 'b', blob, mimeType: 'image/jpeg' });

    const fetched = await getPortrait(saved.id);
    expect(fetched).toBeDefined();
    expect(fetched!.mimeType).toBe('image/jpeg');
    const arr = new Uint8Array(await fetched!.blob.arrayBuffer());
    expect(Array.from(arr)).toEqual([10, 20, 30, 40, 50]);
  });

  it('deletePortrait removes the row', async () => {
    const p = await savePortrait({
      bookId: 'b', blob: new Blob([]), mimeType: 'image/png',
    });
    await deletePortrait(p.id);
    expect(await getPortrait(p.id)).toBeUndefined();
  });
});
