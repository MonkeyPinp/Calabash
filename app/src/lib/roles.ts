import type { Character, CharacterRole } from '@/types';

export const SPOILER_SENSITIVE_ROLES = new Set<CharacterRole>(['murderer']);

export function resolveCharacterRole(character: Character, currentChapter: number): CharacterRole {
  const reveals = character.roleReveals ?? [];
  let role = character.role;
  let latestChapter = 0;

  for (const reveal of reveals) {
    if (reveal.chapterRevealed <= currentChapter && reveal.chapterRevealed >= latestChapter) {
      role = reveal.role;
      latestChapter = reveal.chapterRevealed;
    }
  }

  return role;
}

export function hasSpoilerSensitiveRoleAtChapter(
  characters: Character[],
  currentChapter: number,
): boolean {
  return characters.some(
    (character) =>
      character.chapterIntroduced <= currentChapter &&
      SPOILER_SENSITIVE_ROLES.has(resolveCharacterRole(character, currentChapter)),
  );
}
