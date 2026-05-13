import type { Alias } from '@/types';

export const UNKNOWN_NAME = '???';

export function resolveDisplayName(aliases: Alias[], currentChapter: number): string {
  let best: Alias | undefined;
  for (const alias of aliases) {
    if (alias.chapterRevealed <= currentChapter) {
      if (!best || alias.chapterRevealed > best.chapterRevealed) {
        best = alias;
      }
    }
  }
  return best?.name ?? UNKNOWN_NAME;
}
