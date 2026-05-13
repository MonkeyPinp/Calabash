import { describe, expect, it } from 'vitest';
import { getSpoilerShieldToolbarAction } from '@/lib/spoilerShield';

describe('getSpoilerShieldToolbarAction', () => {
  it('does nothing without an active book', () => {
    expect(getSpoilerShieldToolbarAction({
      activeBookId: null,
      spoilerShield: false,
      spoilerShieldCoverActive: false,
      currentSpoilerKey: null,
      revealedSpoilerKey: null,
    })).toBe('none');
  });

  it('opens the reveal prompt when the current chapter is covered', () => {
    expect(getSpoilerShieldToolbarAction({
      activeBookId: 'book-1',
      spoilerShield: true,
      spoilerShieldCoverActive: true,
      currentSpoilerKey: 'book-1:27',
      revealedSpoilerKey: null,
    })).toBe('prompt-reveal');
  });

  it('covers the current spoiler chapter again after it has been revealed', () => {
    expect(getSpoilerShieldToolbarAction({
      activeBookId: 'book-1',
      spoilerShield: true,
      spoilerShieldCoverActive: false,
      currentSpoilerKey: 'book-1:27',
      revealedSpoilerKey: 'book-1:27',
    })).toBe('cover-current-reveal');
  });

  it('uses normal book-level toggle behavior away from a revealed spoiler chapter', () => {
    expect(getSpoilerShieldToolbarAction({
      activeBookId: 'book-1',
      spoilerShield: false,
      spoilerShieldCoverActive: false,
      currentSpoilerKey: null,
      revealedSpoilerKey: null,
    })).toBe('enable-shield');

    expect(getSpoilerShieldToolbarAction({
      activeBookId: 'book-1',
      spoilerShield: true,
      spoilerShieldCoverActive: false,
      currentSpoilerKey: null,
      revealedSpoilerKey: null,
    })).toBe('disable-shield');
  });
});
