import type { OpenClue, OpenClueStatus } from '@/types';

export const OPEN_CLUE_STATUSES: OpenClueStatus[] = ['open', 'explained'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function positiveInt(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.trunc(parsed));
}

function normalizeStatus(value: unknown): OpenClueStatus {
  return OPEN_CLUE_STATUSES.includes(value as OpenClueStatus) ? value as OpenClueStatus : 'open';
}

export function createOpenClueDraft(
  text: string,
  chapterIntroduced: number,
  now = Date.now(),
): OpenClue {
  return {
    id: crypto.randomUUID(),
    text: text.trim(),
    status: 'open',
    chapterIntroduced: Math.max(1, Math.trunc(chapterIntroduced)),
    createdAt: now,
    updatedAt: now,
  };
}

export function normalizeOpenClue(value: unknown, fallbackChapter = 1): OpenClue | null {
  if (!isRecord(value)) return null;
  const text = stringValue(value.text) ?? stringValue(value.content) ?? stringValue(value.label);
  if (!text) return null;
  const now = Date.now();
  return {
    id: stringValue(value.id) ?? crypto.randomUUID(),
    text,
    status: normalizeStatus(value.status),
    chapterIntroduced: positiveInt(value.chapterIntroduced ?? value.chapter, fallbackChapter),
    createdAt: positiveInt(value.createdAt, now),
    updatedAt: positiveInt(value.updatedAt, now),
  };
}

export function normalizeOpenClues(clues: unknown, fallbackChapter = 1): OpenClue[] {
  if (!Array.isArray(clues)) return [];
  return clues
    .map((clue) => normalizeOpenClue(clue, fallbackChapter))
    .filter((clue): clue is OpenClue => Boolean(clue))
    .sort((a, b) => a.chapterIntroduced - b.chapterIntroduced || a.createdAt - b.createdAt);
}

export function isOpenClueVisibleAtChapter(clue: OpenClue, currentChapter: number): boolean {
  return clue.chapterIntroduced <= currentChapter;
}
