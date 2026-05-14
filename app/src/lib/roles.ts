import type { Character, CharacterRole } from '@/types';

export const CHARACTER_ROLE_PRESETS = [
  'detective',
  'suspect',
  'victim',
  'witness',
  'bystander',
  'murderer',
  'other',
] as const;

export type PresetCharacterRole = typeof CHARACTER_ROLE_PRESETS[number];

const CHARACTER_ROLE_SET = new Set<string>(CHARACTER_ROLE_PRESETS);

export const SPOILER_SENSITIVE_ROLES = new Set<CharacterRole>(['murderer']);

export function normalizeCharacterRole(role?: string | null): CharacterRole | undefined {
  const cleaned = role?.trim();
  return cleaned || undefined;
}

export function isPresetCharacterRole(role?: CharacterRole): role is PresetCharacterRole {
  return Boolean(role && CHARACTER_ROLE_SET.has(role));
}

export function getCharacterRoleVisualKey(role?: CharacterRole): PresetCharacterRole {
  return isPresetCharacterRole(role) ? role : 'other';
}

export function getCharacterRoleCssVar(role?: CharacterRole): string {
  return `var(--node-${getCharacterRoleVisualKey(role)})`;
}

export function formatCharacterRole(
  role: CharacterRole | undefined,
  translate: (key: string) => string,
): string {
  if (!role) return '';
  return isPresetCharacterRole(role) ? translate(`role.${role}`) : role;
}

export function resolveCharacterRole(character: Character, currentChapter: number): CharacterRole | undefined {
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
    (character) => {
      const role = resolveCharacterRole(character, currentChapter);
      return character.chapterIntroduced <= currentChapter && Boolean(role && SPOILER_SENSITIVE_ROLES.has(role));
    },
  );
}
