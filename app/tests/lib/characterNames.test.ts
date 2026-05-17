import { describe, expect, it } from 'vitest';
import { syncPrimaryAliasForNameEdit } from '@/lib/characterNames';

describe('syncPrimaryAliasForNameEdit', () => {
  it('renames the primary alias when it mirrors the node name', () => {
    expect(syncPrimaryAliasForNameEdit({
      name: 'Smoke Node',
      aliases: [{ name: 'Smoke Node', chapterRevealed: 1 }],
      chapterIntroduced: 1,
    }, 'Smoke Node Updated')).toEqual([
      { name: 'Smoke Node Updated', chapterRevealed: 1 },
    ]);
  });

  it('creates a visible alias when old data has none', () => {
    expect(syncPrimaryAliasForNameEdit({
      name: 'Old Node',
      aliases: [],
      chapterIntroduced: 3,
    }, 'New Node')).toEqual([
      { name: 'New Node', chapterRevealed: 3 },
    ]);
  });

  it('keeps deliberate aliases intact when the first alias is not the node name', () => {
    const aliases = [
      { name: 'the masked guest', chapterRevealed: 1 },
      { name: 'Ada Vale', chapterRevealed: 8 },
    ];
    expect(syncPrimaryAliasForNameEdit({
      name: 'Ada Vale',
      aliases,
      chapterIntroduced: 1,
    }, 'Ada Vale Revised')).toBe(aliases);
  });
});
