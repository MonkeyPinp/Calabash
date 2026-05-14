export type SpoilerShieldToolbarAction =
  | 'none'
  | 'enable-shield'
  | 'protect-current-chapter'
  | 'prompt-reveal'
  | 'cover-current-reveal';

export interface SpoilerShieldToolbarState {
  activeBookId: string | null;
  spoilerShield: boolean;
  spoilerShieldCoverActive: boolean;
  currentSpoilerKey: string | null;
  revealedSpoilerKey: string | null;
  chapterProtected: boolean;
}

export function getSpoilerShieldToolbarAction({
  activeBookId,
  spoilerShield,
  spoilerShieldCoverActive,
  currentSpoilerKey,
  revealedSpoilerKey,
  chapterProtected,
}: SpoilerShieldToolbarState): SpoilerShieldToolbarAction {
  if (!activeBookId) return 'none';
  if (spoilerShieldCoverActive) return 'prompt-reveal';
  if (spoilerShield && currentSpoilerKey !== null && revealedSpoilerKey === currentSpoilerKey) {
    return 'cover-current-reveal';
  }
  if (chapterProtected) return 'enable-shield';
  return 'protect-current-chapter';
}

export function addSpoilerChapter(chapters: number[], chapter: number): number[] {
  return [...new Set([...chapters, chapter].map((item) => Math.trunc(item)).filter((item) => item > 0))]
    .sort((a, b) => a - b);
}

export function removeSpoilerChapter(chapters: number[], chapter: number): number[] {
  return chapters.filter((item) => item !== chapter);
}
