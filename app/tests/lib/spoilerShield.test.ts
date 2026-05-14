import { describe, expect, it } from 'vitest';
import { addSpoilerChapter, getSpoilerShieldToolbarAction, removeSpoilerChapter } from '@/lib/spoilerShield';

describe('getSpoilerShieldToolbarAction', () => {
  it('does nothing without an active book', () => {
    expect(getSpoilerShieldToolbarAction({
      activeBookId: null,
      spoilerShield: false,
      spoilerShieldCoverActive: false,
      currentSpoilerKey: null,
      revealedSpoilerKey: null,
      chapterProtected: false,
    })).toBe('none');
  });

  it('opens the reveal prompt when the current chapter is covered', () => {
    expect(getSpoilerShieldToolbarAction({
      activeBookId: 'book-1',
      spoilerShield: true,
      spoilerShieldCoverActive: true,
      currentSpoilerKey: 'book-1:27',
      revealedSpoilerKey: null,
      chapterProtected: true,
    })).toBe('prompt-reveal');
  });

  it('covers the current spoiler chapter again after it has been revealed', () => {
    expect(getSpoilerShieldToolbarAction({
      activeBookId: 'book-1',
      spoilerShield: true,
      spoilerShieldCoverActive: false,
      currentSpoilerKey: 'book-1:27',
      revealedSpoilerKey: 'book-1:27',
      chapterProtected: true,
    })).toBe('cover-current-reveal');
  });

  it('enables the shield when a protected chapter is reached while the book-level shield is off', () => {
    expect(getSpoilerShieldToolbarAction({
      activeBookId: 'book-1',
      spoilerShield: false,
      spoilerShieldCoverActive: false,
      currentSpoilerKey: 'book-1:27',
      revealedSpoilerKey: null,
      chapterProtected: true,
    })).toBe('enable-shield');
  });

  it('protects the current chapter when no automatic reveal exists', () => {
    expect(getSpoilerShieldToolbarAction({
      activeBookId: 'book-1',
      spoilerShield: true,
      spoilerShieldCoverActive: false,
      currentSpoilerKey: null,
      revealedSpoilerKey: null,
      chapterProtected: false,
    })).toBe('protect-current-chapter');
  });

  it('adds and removes manually protected chapters', () => {
    expect(addSpoilerChapter([5, 2, 5], 3)).toEqual([2, 3, 5]);
    expect(addSpoilerChapter([2], -1)).toEqual([2]);
    expect(removeSpoilerChapter([2, 3, 5], 3)).toEqual([2, 5]);
  });
});
