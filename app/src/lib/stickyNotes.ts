import type { StickyNote } from '@/types';

export function normalizeStickyNoteChapter(value: unknown, fallback = 1): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.trunc(parsed));
}

export function inferStickyNoteChapter(content?: string): number | undefined {
  const text = content?.trim();
  if (!text) return undefined;

  const chineseRange = /^第\s*(\d+)\s*(?:[-–—~至到]\s*\d+)?\s*(?:集|章|话|回)/.exec(text);
  if (chineseRange) return normalizeStickyNoteChapter(chineseRange[1]);

  const englishRange = /^(?:ep(?:isode)?|ch(?:apter)?)\.?\s*(\d+)(?:\s*[-–—~]\s*\d+)?/i.exec(text);
  if (englishRange) return normalizeStickyNoteChapter(englishRange[1]);

  return undefined;
}

export function normalizeStickyNote(note: StickyNote): StickyNote {
  return {
    ...note,
    chapterIntroduced: normalizeStickyNoteChapter(
      note.chapterIntroduced,
      inferStickyNoteChapter(note.content) ?? 1,
    ),
  };
}

export function isStickyNoteVisibleAtChapter(note: StickyNote, currentChapter: number): boolean {
  return normalizeStickyNote(note).chapterIntroduced <= currentChapter;
}

export function getStickyNoteDisplayTag(note: StickyNote): string {
  const text = note.content.trim();
  const chineseRange = /^(第\s*\d+\s*(?:[-–—~至到]\s*\d+)?\s*(?:集|章|话|回))/.exec(text);
  if (chineseRange) return chineseRange[1].replace(/\s+/g, '');

  const englishRange = /^((?:ep(?:isode)?|ch(?:apter)?)\.?\s*\d+(?:\s*[-–—~]\s*\d+)?)/i.exec(text);
  if (englishRange) return englishRange[1].replace(/\s+/g, ' ');

  return `CH.${String(normalizeStickyNote(note).chapterIntroduced).padStart(2, '0')}`;
}
