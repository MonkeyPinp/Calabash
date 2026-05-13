export type CertaintyLevel = 'confirmed' | 'suspected' | 'disproven';

export type CharacterRole =
  | 'detective'
  | 'suspect'
  | 'victim'
  | 'witness'
  | 'bystander'
  | 'other';

export type RelationshipType =
  | 'family'
  | 'professional'
  | 'romantic'
  | 'hostile'
  | 'suspicion'
  | 'other';

export interface Alias {
  name: string;
  chapterRevealed: number;
}

export interface Book {
  id: string;
  title: string;
  author?: string;
  totalChapters: number;
  currentChapter: number;
  createdAt: number;
  updatedAt: number;
}

export interface Character {
  id: string;
  bookId: string;
  name: string;
  aliases: Alias[];
  role: CharacterRole;
  profession?: string;
  socialPosition?: string;
  notes?: string;
  portraitId?: string;
  chapterIntroduced: number;
  position: { x: number; y: number };
  createdAt: number;
  updatedAt: number;
}

export type RelationshipDirection = 'forward' | 'backward' | 'both' | 'none';

export interface Relationship {
  id: string;
  bookId: string;
  sourceId: string;
  targetId: string;
  type: RelationshipType;
  direction?: RelationshipDirection;
  label?: string;
  notes?: string;
  chapterRevealed: number;
  certainty: CertaintyLevel;
  createdAt: number;
  updatedAt: number;
}

export interface Portrait {
  id: string;
  bookId: string;
  blob: Blob;
  mimeType: string;
  createdAt: number;
}
