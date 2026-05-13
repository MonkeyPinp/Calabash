import { describe, expect, it } from 'vitest';
import type { Character } from '@/types';
import { hasSpoilerSensitiveRoleAtChapter, resolveCharacterRole } from '@/lib/roles';

const sheppard: Character = {
  id: 'sheppard',
  bookId: 'ackroyd',
  name: 'Dr. James Sheppard',
  aliases: [{ name: 'Dr. James Sheppard', chapterRevealed: 1 }],
  role: 'witness',
  roleReveals: [{ role: 'murderer', chapterRevealed: 27 }],
  chapterIntroduced: 1,
  position: { x: 0, y: 0 },
  createdAt: 0,
  updatedAt: 0,
};

describe('roles', () => {
  it('resolves chapter-aware character roles', () => {
    expect(resolveCharacterRole(sheppard, 1)).toBe('witness');
    expect(resolveCharacterRole(sheppard, 26)).toBe('witness');
    expect(resolveCharacterRole(sheppard, 27)).toBe('murderer');
  });

  it('detects spoiler-sensitive roles only after their reveal chapter', () => {
    expect(hasSpoilerSensitiveRoleAtChapter([sheppard], 1)).toBe(false);
    expect(hasSpoilerSensitiveRoleAtChapter([sheppard], 27)).toBe(true);
  });
});
