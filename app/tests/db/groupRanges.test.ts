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
      labelFontSize: 18,
      labelPosition: { x: 0.38, y: 0.32 },
      chapterIntroduced: 4,
    });

    expect(range.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(range.chapterIntroduced).toBe(4);
    expect(range.labelFontSize).toBe(18);
    expect(range.labelPosition).toEqual({ x: 0.38, y: 0.32 });
    expect(await listGroupRangesByBook('book-1')).toHaveLength(1);

    const updated = await updateGroupRange(range.id, {
      label: 'Police station',
      width: 80,
      height: 90,
      color: 'green',
      labelFontSize: 99,
      labelPosition: { x: 2, y: 2 },
      chapterIntroduced: 6,
    });
    expect(updated).toMatchObject({
      label: 'Police station',
      width: 160,
      height: 120,
      color: 'green',
      labelFontSize: 30,
      chapterIntroduced: 6,
    });
    expect(updated.labelPosition.x).toBeGreaterThanOrEqual(0.08);
    expect(updated.labelPosition.x).toBeLessThanOrEqual(0.92);
    expect(updated.labelPosition.y).toBeGreaterThanOrEqual(0.12);
    expect(updated.labelPosition.y).toBeLessThanOrEqual(0.88);

    await deleteGroupRange(range.id);
    expect(await listGroupRangesByBook('book-1')).toEqual([]);

    await restoreGroupRange(updated);
    expect(await listGroupRangesByBook('book-1')).toHaveLength(1);
  });
});
