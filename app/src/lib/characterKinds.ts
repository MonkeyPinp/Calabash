import type { Character, CharacterKind } from '@/types';

export const CHARACTER_KIND_PRESETS: CharacterKind[] = [
  'character',
  'location',
  'room',
  'item',
  'testimony',
];

const CHARACTER_KIND_SET = new Set<string>(CHARACTER_KIND_PRESETS);

export function normalizeCharacterKind(kind?: string | null): CharacterKind {
  const cleaned = kind?.trim();
  return cleaned && CHARACTER_KIND_SET.has(cleaned) ? cleaned as CharacterKind : 'character';
}

export function normalizeCharacter<T extends Character>(character: T): T & { kind: CharacterKind } {
  return {
    ...character,
    kind: normalizeCharacterKind(character.kind),
    locked: character.locked === true,
  };
}

export function formatCharacterKind(
  kind: CharacterKind | undefined,
  translate: (key: string) => string,
): string {
  return translate(`nodeKind.${normalizeCharacterKind(kind)}`);
}

export function formatNonCharacterKind(
  kind: CharacterKind | undefined,
  translate: (key: string) => string,
): string {
  const normalized = normalizeCharacterKind(kind);
  return normalized === 'character' ? '' : formatCharacterKind(normalized, translate);
}
