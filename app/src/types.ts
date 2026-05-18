export type CertaintyLevel = 'confirmed' | 'suspected' | 'disproven';

export type CharacterRole = string;

export type RelationshipType = string;

export type CharacterKind = 'character' | 'location' | 'room' | 'item' | 'testimony';

export type OpenClueStatus = 'open' | 'explained';

export interface Alias {
  name: string;
  chapterRevealed: number;
}

export interface RoleReveal {
  role: CharacterRole;
  chapterRevealed: number;
}

export interface TimeLayer {
  id: string;
  name: string;
  order: number;
  color?: string;
}

export interface Book {
  id: string;
  userId?: string;
  categoryId?: string;
  title: string;
  author?: string;
  totalChapters: number;
  currentChapter: number;
  spoilerShield: boolean;
  spoilerChapters: number[];
  highlightedChapters: number[];
  timeLayers?: TimeLayer[];
  defaultTimeLayerId?: string | null;
  openClues?: OpenClue[];
  createdAt: number;
  updatedAt: number;
}

export interface Category {
  id: string;
  userId?: string;
  name: string;
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface User {
  id: string;
  name: string;
  avatarId?: string;
  avatarColor: string;
  createdAt: number;
  updatedAt: number;
}

export interface Character {
  id: string;
  bookId: string;
  name: string;
  kind?: CharacterKind;
  aliases: Alias[];
  role?: CharacterRole;
  roleReveals?: RoleReveal[];
  profession?: string;
  socialPosition?: string;
  notes?: string;
  portraitId?: string;
  chapterIntroduced: number;
  position: { x: number; y: number };
  locked?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface OpenClue {
  id: string;
  text: string;
  status: OpenClueStatus;
  chapterIntroduced: number;
  createdAt: number;
  updatedAt: number;
}

export interface Relationship {
  id: string;
  bookId: string;
  sourceId: string;
  targetId: string;
  type?: RelationshipType;
  directed?: boolean;
  label?: string;
  notes?: string;
  chapterRevealed: number;
  timeLayerId?: string | null;
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

export type StickyNoteColor = 'yellow' | 'green' | 'blue' | 'pink' | 'purple';

export type GroupRangeColor = 'ochre' | 'blue' | 'green' | 'red' | 'violet';

export type EvidenceImageKind = string;

export type EvidenceImageLayer = 'board' | 'background';

export interface StickyNote {
  id: string;
  bookId: string;
  content: string;
  position: { x: number; y: number };
  width: number;
  height: number;
  color: StickyNoteColor;
  fontSize: number;
  chapterIntroduced: number;
  timeLayerId?: string | null;
  locked?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface GroupRange {
  id: string;
  bookId: string;
  label: string;
  position: { x: number; y: number };
  width: number;
  height: number;
  color: GroupRangeColor;
  labelFontSize: number;
  labelPosition: { x: number; y: number };
  chapterIntroduced: number;
  timeLayerId?: string | null;
  locked?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface EvidenceImage {
  id: string;
  bookId: string;
  title: string;
  notes?: string;
  kind: EvidenceImageKind;
  layer: EvidenceImageLayer;
  dataUrl: string;
  mimeType: string;
  position: { x: number; y: number };
  width: number;
  height: number;
  chapterIntroduced: number;
  timeLayerId?: string | null;
  locked?: boolean;
  createdAt: number;
  updatedAt: number;
}
