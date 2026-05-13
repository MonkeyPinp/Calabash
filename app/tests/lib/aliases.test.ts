import { describe, it, expect } from 'vitest';
import { resolveDisplayName } from '@/lib/aliases';

describe('resolveDisplayName', () => {
  it('returns the only alias when one exists and is visible', () => {
    expect(
      resolveDisplayName([{ name: 'Mary', chapterRevealed: 1 }], 5),
    ).toBe('Mary');
  });

  it('returns the latest revealed alias at or before currentChapter', () => {
    const aliases = [
      { name: 'the housekeeper', chapterRevealed: 2 },
      { name: 'Mary Smith',      chapterRevealed: 12 },
    ];
    expect(resolveDisplayName(aliases, 5)).toBe('the housekeeper');
    expect(resolveDisplayName(aliases, 12)).toBe('Mary Smith');
    expect(resolveDisplayName(aliases, 20)).toBe('Mary Smith');
  });

  it('returns the placeholder when no alias is visible yet', () => {
    expect(
      resolveDisplayName([{ name: 'Mary', chapterRevealed: 10 }], 5),
    ).toBe('???');
  });

  it('returns the placeholder for an empty alias list', () => {
    expect(resolveDisplayName([], 5)).toBe('???');
  });

  it('handles unsorted alias arrays', () => {
    const aliases = [
      { name: 'Mary Smith',      chapterRevealed: 12 },
      { name: 'the housekeeper', chapterRevealed: 2 },
    ];
    expect(resolveDisplayName(aliases, 5)).toBe('the housekeeper');
  });
});
