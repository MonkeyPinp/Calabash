import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/db/schema';
import {
  createGroupRange,
  deleteGroupRange,
  listGroupRangesByBook,
  restoreGroupRange,
  updateGroupRange,
} from '@/db/groupRanges';

describe('groupRanges DAO', () => {
  beforeEach(async () => {
    await db.groupRanges.clear();
  });

  it('creates, updates, deletes, and restores group ranges', async () => {
    const range = await createGroupRange({
      bookId: 'book-1',
      label: 'Police',
      position: { x: 10, y: 20 },
      width: 420,
      height: 240,
      color: 'blue',
    });

    expect(range.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(await listGroupRangesByBook('book-1')).toHaveLength(1);

    const updated = await updateGroupRange(range.id, {
      label: 'Police station',
      width: 80,
      height: 90,
      color: 'green',
    });
    expect(updated).toMatchObject({
      label: 'Police station',
      width: 160,
      height: 120,
      color: 'green',
    });

    await deleteGroupRange(range.id);
    expect(await listGroupRangesByBook('book-1')).toEqual([]);

    await restoreGroupRange(updated);
    expect(await listGroupRangesByBook('book-1')).toHaveLength(1);
  });
});
