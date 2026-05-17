import type { Alias, Character } from '@/types';

type CharacterNameFields = Pick<Character, 'name' | 'aliases' | 'chapterIntroduced'>;

export function syncPrimaryAliasForNameEdit(character: CharacterNameFields, nextName: string): Alias[] {
  const name = nextName.trim();
  const aliases = character.aliases ?? [];
  if (!name) return aliases;
  if (aliases.length === 0) {
    return [{ name, chapterRevealed: character.chapterIntroduced }];
  }

  const [primaryAlias, ...rest] = aliases;
  if (primaryAlias.name.trim() !== character.name.trim()) return aliases;
  return [{ ...primaryAlias, name }, ...rest];
}
