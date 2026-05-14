import { describe, expect, it } from 'vitest';
import {
  getStickyNoteDisplayTag,
  inferStickyNoteChapter,
  isStickyNoteVisibleAtChapter,
  normalizeStickyNote,
} from '@/lib/stickyNotes';
import type { StickyNote } from '@/types';

const baseNote: StickyNote = {
  id: 'note',
  bookId: 'book',
  content: '第5-9集：later case notes',
  position: { x: 0, y: 0 },
  width: 220,
  height: 120,
  color: 'green',
  chapterIntroduced: 5,
  createdAt: 0,
  updatedAt: 0,
};

describe('sticky note chapter tags', () => {
  it('infers display chapters from episode range prefixes', () => {
    expect(inferStickyNoteChapter('第5-9集：周荣线打开')).toBe(5);
    expect(inferStickyNoteChapter('Episode 10-13: new thread')).toBe(10);
  });

  it('uses the episode range as the visible note tag', () => {
    expect(getStickyNoteDisplayTag(baseNote)).toBe('第5-9集');
  });

  it('falls back to a chapter tag when note content has no range prefix', () => {
    expect(getStickyNoteDisplayTag({ ...baseNote, content: 'Check the alibi', chapterIntroduced: 12 })).toBe('CH.12');
  });

  it('normalizes legacy notes and hides them until the display chapter', () => {
    const legacyNote = { ...baseNote, chapterIntroduced: undefined } as unknown as StickyNote;
    const normalized = normalizeStickyNote(legacyNote);

    expect(normalized.chapterIntroduced).toBe(5);
    expect(isStickyNoteVisibleAtChapter(normalized, 4)).toBe(false);
    expect(isStickyNoteVisibleAtChapter(normalized, 5)).toBe(true);
  });
});
