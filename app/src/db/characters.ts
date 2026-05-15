import { db } from './schema';
import type { Character, Alias, CharacterKind, CharacterRole, RoleReveal } from '@/types';
import { normalizeCharacter, normalizeCharacterKind } from '@/lib/characterKinds';
import { normalizeCharacterRole } from '@/lib/roles';

export interface CreateCharacterInput {
  bookId: string;
  name: string;
  kind?: CharacterKind;
  role?: CharacterRole;
  roleReveals?: RoleReveal[];
  chapterIntroduced: number;
  aliases?: Alias[];
  profession?: string;
  socialPosition?: string;
  notes?: string;
  portraitId?: string;
  position?: { x: number; y: number };
}

export async function createCharacter(input: CreateCharacterInput): Promise<Character> {
  const now = Date.now();
  const character: Character = {
    id: crypto.randomUUID(),
    bookId: input.bookId,
    name: input.name,
    kind: normalizeCharacterKind(input.kind),
    aliases: input.aliases ?? [{ name: input.name, chapterRevealed: input.chapterIntroduced }],
    role: normalizeCharacterRole(input.role),
    roleReveals: input.roleReveals,
    profession: input.profession,
    socialPosition: input.socialPosition,
    notes: input.notes,
    portraitId: input.portraitId,
    chapterIntroduced: input.chapterIntroduced,
    position: input.position ?? { x: 0, y: 0 },
    createdAt: now,
    updatedAt: now,
  };
  await db.characters.add(character);
  return character;
}

export async function getCharacter(id: string): Promise<Character | undefined> {
  const character = await db.characters.get(id);
  return character ? normalizeCharacter(character) : undefined;
}

export async function listCharactersByBook(bookId: string): Promise<Character[]> {
  const characters = await db.characters.where('bookId').equals(bookId).toArray();
  return characters.map(normalizeCharacter);
}

export async function updateCharacter(
  id: string,
  patch: Partial<Omit<Character, 'id' | 'bookId' | 'createdAt'>>,
): Promise<Character> {
  const existing = await db.characters.get(id);
  if (!existing) throw new Error(`Character ${id} not found`);
  const normalizedPatch = {
    ...patch,
    ...('role' in patch ? { role: normalizeCharacterRole(patch.role) } : {}),
    ...('kind' in patch ? { kind: normalizeCharacterKind(patch.kind) } : {}),
  };
  const next: Character = normalizeCharacter({ ...existing, ...normalizedPatch, updatedAt: Date.now() });
  await db.characters.put(next);
  return next;
}

export async function deleteCharacter(id: string): Promise<void> {
  await db.characters.delete(id);
}

export async function restoreCharacter(char: Character): Promise<void> {
  await db.characters.put(normalizeCharacter(char));
}
