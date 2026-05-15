import { db, type PortraitRow } from './schema';
import type {
  Alias,
  Book,
  Category,
  CertaintyLevel,
  Character,
  EvidenceImage,
  EvidenceImageKind,
  EvidenceImageLayer,
  GroupRange,
  GroupRangeColor,
  Relationship,
  StickyNote,
  StickyNoteColor,
  User,
} from '@/types';
import { APP_VERSION } from '@/version';
import { normalizeCharacter, normalizeCharacterKind } from '@/lib/characterKinds';
import { normalizeOpenClues } from '@/lib/clues';
import { normalizeStickyNote, STICKY_NOTE_DEFAULT_FONT_SIZE } from '@/lib/stickyNotes';
import {
  GROUP_RANGE_DEFAULT_LABEL_FONT_SIZE,
  GROUP_RANGE_DEFAULT_LABEL_POSITION,
  normalizeGroupRange,
} from '@/lib/groupRanges';
import {
  EVIDENCE_IMAGE_DEFAULT_HEIGHT,
  EVIDENCE_IMAGE_DEFAULT_WIDTH,
  EVIDENCE_IMAGE_LAYERS,
  isValidEvidenceImageDataUrl,
  mimeTypeFromDataUrl,
  normalizeEvidenceImage,
} from '@/lib/evidenceImages';

const CALABASH_VERSION = APP_VERSION;

export interface PortraitExport {
  id: string;
  bookId: string;
  mimeType: string;
  dataUrl: string;
  createdAt?: number;
}

export interface CalabashExport {
  calabashVersion: string;
  importType?: 'book';
  book: Book;
  characters: Character[];
  relationships: Relationship[];
  portraits: PortraitExport[];
  annotations?: StickyNote[];
  groupRanges?: GroupRange[];
  illustrations?: EvidenceImage[];
  attachments?: EvidenceImage[];
  evidenceImages?: EvidenceImage[];
}

export interface CalabashBookImportTemplate {
  calabashVersion?: string;
  importType?: 'book';
  book: {
    id?: string;
    title: string;
    author?: string;
    totalChapters?: number;
    currentChapter?: number;
    spoilerShield?: boolean;
    spoilerChapters?: number[];
    highlightedChapters?: number[];
    openClues?: Array<Record<string, unknown> | string>;
  };
  characters?: Array<Record<string, unknown>>;
  relationships?: Array<Record<string, unknown>>;
  clues?: Array<Record<string, unknown> | string>;
  notes?: Array<Record<string, unknown>>;
  annotations?: Array<Record<string, unknown>>;
  groups?: Array<Record<string, unknown>>;
  groupRanges?: Array<Record<string, unknown>>;
  illustrations?: Array<Record<string, unknown>>;
  attachments?: Array<Record<string, unknown>>;
  images?: Array<Record<string, unknown>>;
  assets?: Array<Record<string, unknown>>;
  evidenceImages?: Array<Record<string, unknown>>;
}

export interface CalabashLibraryExport {
  calabashVersion: string;
  exportType: 'library';
  exportedAt: number;
  users: User[];
  categories: Category[];
  books: Book[];
  characters: Character[];
  relationships: Relationship[];
  annotations: StickyNote[];
  groupRanges: GroupRange[];
  illustrations?: EvidenceImage[];
  attachments?: EvidenceImage[];
  evidenceImages?: EvidenceImage[];
  portraits: PortraitExport[];
}

export interface ImportLibraryResult {
  activeUserId?: string;
  activeBookId?: string;
}

function bufferToDataUrl(buffer: ArrayBuffer, mimeType: string): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return `data:${mimeType};base64,${btoa(binary)}`;
}

function dataUrlToBuffer(dataUrl: string): { buffer: ArrayBuffer; mimeType: string } {
  const match = /^data:([^;]+);base64,(.*)$/.exec(dataUrl);
  if (!match) throw new Error('Invalid data URL');
  const [, mimeType, base64] = match;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return { buffer: bytes.buffer, mimeType };
}

function normalizeBookForPortableData(book: Book): Book {
  return {
    ...book,
    spoilerShield: book.spoilerShield ?? false,
    spoilerChapters: book.spoilerChapters ?? [],
    highlightedChapters: book.highlightedChapters ?? [],
    openClues: normalizeOpenClues(book.openClues),
  };
}

export function isLibraryExport(payload: unknown): payload is CalabashLibraryExport {
  return Boolean(
    payload &&
    typeof payload === 'object' &&
    (payload as { exportType?: unknown }).exportType === 'library',
  );
}

export function normalizeBookImportPayload(payload: unknown): CalabashExport {
  if (!isRecord(payload) || isLibraryExport(payload)) throw new Error('Invalid Calabash book import');
  if (isCalabashBookExport(payload)) return normalizeFullBookExport(payload);
  return normalizeBookTemplate(payload);
}

const STICKY_NOTE_COLORS: StickyNoteColor[] = ['yellow', 'green', 'blue', 'pink', 'purple'];
const GROUP_RANGE_COLORS: GroupRangeColor[] = ['ochre', 'blue', 'green', 'red', 'violet'];
const CERTAINTY_LEVELS: CertaintyLevel[] = ['confirmed', 'suspected', 'disproven'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function isCalabashBookExport(payload: unknown): payload is CalabashExport {
  if (!isRecord(payload)) return false;
  const characters = payload.characters;
  const relationships = payload.relationships;
  return Boolean(
    isRecord(payload.book) &&
    typeof payload.book.id === 'string' &&
    typeof payload.book.title === 'string' &&
    Array.isArray(characters) &&
    Array.isArray(relationships) &&
    characters.every((character) => (
      isRecord(character) &&
      typeof character.id === 'string' &&
      typeof character.bookId === 'string' &&
      typeof character.name === 'string' &&
      Array.isArray(character.aliases) &&
      isRecord(character.position)
    )) &&
    relationships.every((relationship) => (
      isRecord(relationship) &&
      typeof relationship.id === 'string' &&
      typeof relationship.bookId === 'string' &&
      typeof relationship.sourceId === 'string' &&
      typeof relationship.targetId === 'string'
    )),
  );
}

function normalizeFullBookExport(payload: CalabashExport): CalabashExport {
  const illustrations = (payload.illustrations ?? payload.attachments ?? payload.evidenceImages ?? []).map(normalizeEvidenceImage);
  return {
    calabashVersion: payload.calabashVersion || CALABASH_VERSION,
    importType: 'book',
    book: normalizeBookForPortableData(payload.book),
    characters: (payload.characters ?? []).map(normalizeCharacter),
    relationships: payload.relationships ?? [],
    portraits: payload.portraits ?? [],
    annotations: (payload.annotations ?? []).map(normalizeStickyNote),
    groupRanges: (payload.groupRanges ?? []).map(normalizeGroupRange),
    illustrations,
  };
}

function normalizeBookTemplate(payload: Record<string, unknown>): CalabashExport {
  const bookInput = payload.book;
  if (!isRecord(bookInput)) throw new Error('Invalid Calabash book import');

  const title = stringValue(bookInput.title);
  if (!title) throw new Error('Invalid Calabash book import');

  const templateBookId = uniqueId(stringValue(bookInput.id) ?? slugify(title) ?? 'imported-book', new Set());
  const characterIds = new Set<string>();
  const characterLookup = new Map<string, string>();
  const rawCharacters = arrayOfRecords(payload.characters);
  const openClues = normalizeOpenClues([
    ...arrayOfClueInputs(bookInput.openClues),
    ...arrayOfClueInputs(payload.clues),
  ]);

  const characters: Character[] = rawCharacters.map((raw, index) => {
    const name = stringValue(raw.name) ?? stringValue(raw.label) ?? `Character ${index + 1}`;
    const id = uniqueId(stringValue(raw.id) ?? stringValue(raw.key) ?? slugify(name) ?? `character-${index + 1}`, characterIds);
    const chapterIntroduced = positiveInt(raw.chapterIntroduced ?? raw.chapter ?? raw.firstChapter, 1);
    const aliases = normalizeAliases(raw.aliases, name, chapterIntroduced);
    for (const ref of [raw.id, raw.key, raw.name, raw.label, name, id]) {
      const normalized = stringValue(ref);
      if (normalized) characterLookup.set(normalized, id);
    }
    return {
      id,
      bookId: templateBookId,
      name,
      kind: normalizeCharacterKind(stringValue(raw.kind ?? raw.nodeKind ?? raw.category)),
      aliases,
      role: stringValue(raw.role),
      roleReveals: normalizeRoleReveals(raw.roleReveals),
      profession: stringValue(raw.profession),
      socialPosition: stringValue(raw.socialPosition),
      notes: stringValue(raw.notes),
      chapterIntroduced,
      position: normalizePoint(raw.position, defaultCharacterPosition(index)),
      createdAt: 0,
      updatedAt: 0,
    };
  });

  const relationshipIds = new Set<string>();
  const relationships = arrayOfRecords(payload.relationships).flatMap((raw, index): Relationship[] => {
    const source = resolveCharacterRef(raw.sourceId ?? raw.source ?? raw.from, characterLookup);
    const target = resolveCharacterRef(raw.targetId ?? raw.target ?? raw.to, characterLookup);
    if (!source || !target) return [];
    return [{
      id: uniqueId(stringValue(raw.id) ?? `relationship-${index + 1}`, relationshipIds),
      bookId: templateBookId,
      sourceId: source,
      targetId: target,
      type: stringValue(raw.type),
      directed: typeof raw.directed === 'boolean' ? raw.directed : undefined,
      label: stringValue(raw.label),
      notes: stringValue(raw.notes),
      chapterRevealed: positiveInt(raw.chapterRevealed ?? raw.chapter ?? raw.chapterIntroduced, 1),
      certainty: normalizeCertainty(raw.certainty),
      createdAt: 0,
      updatedAt: 0,
    }];
  });

  const noteIds = new Set<string>();
  const annotations = [
    ...arrayOfRecords(payload.notes),
    ...arrayOfRecords(payload.annotations),
  ].map((raw, index): StickyNote => ({
    id: uniqueId(stringValue(raw.id) ?? `note-${index + 1}`, noteIds),
    bookId: templateBookId,
    content: stringValue(raw.content) ?? stringValue(raw.text) ?? '',
    position: normalizePoint(raw.position, defaultNotePosition(index)),
    width: positiveNumber(raw.width, 280),
    height: positiveNumber(raw.height, 160),
    color: normalizeStickyNoteColor(raw.color),
    fontSize: positiveInt(raw.fontSize, STICKY_NOTE_DEFAULT_FONT_SIZE),
    chapterIntroduced: positiveInt(raw.chapterIntroduced ?? raw.chapter, 1),
    createdAt: 0,
    updatedAt: 0,
  })).map(normalizeStickyNote);

  const groupIds = new Set<string>();
  const groupRanges = [
    ...arrayOfRecords(payload.groups),
    ...arrayOfRecords(payload.groupRanges),
  ].map((raw, index): GroupRange => ({
    id: uniqueId(stringValue(raw.id) ?? `group-${index + 1}`, groupIds),
    bookId: templateBookId,
    label: stringValue(raw.label) ?? stringValue(raw.name) ?? `Group ${index + 1}`,
    position: normalizePoint(raw.position, defaultGroupPosition(index)),
    width: positiveNumber(raw.width, 520),
    height: positiveNumber(raw.height, 320),
    color: normalizeGroupRangeColor(raw.color),
    labelFontSize: positiveInt(raw.labelFontSize ?? raw.fontSize, GROUP_RANGE_DEFAULT_LABEL_FONT_SIZE),
    labelPosition: normalizePoint(raw.labelPosition, GROUP_RANGE_DEFAULT_LABEL_POSITION),
    chapterIntroduced: positiveInt(raw.chapterIntroduced ?? raw.chapter, 1),
    createdAt: 0,
    updatedAt: 0,
  })).map(normalizeGroupRange);

  const imageIds = new Set<string>();
  const evidenceImages = [
    ...arrayOfRecords(payload.illustrations),
    ...arrayOfRecords(payload.attachments),
    ...arrayOfRecords(payload.images),
    ...arrayOfRecords(payload.assets),
    ...arrayOfRecords(payload.evidenceImages),
  ].flatMap((raw, index): EvidenceImage[] => {
    const dataUrl = stringValue(raw.dataUrl ?? raw.src ?? raw.image);
    if (!isValidEvidenceImageDataUrl(dataUrl)) return [];
    return [normalizeEvidenceImage({
      id: uniqueId(stringValue(raw.id) ?? `image-${index + 1}`, imageIds),
      bookId: templateBookId,
      title: stringValue(raw.title ?? raw.label ?? raw.name) ?? `Illustration ${index + 1}`,
      notes: stringValue(raw.notes),
      kind: normalizeEvidenceImageKind(raw.kind ?? raw.type),
      layer: normalizeEvidenceImageLayer(raw.layer),
      dataUrl,
      mimeType: stringValue(raw.mimeType) ?? mimeTypeFromDataUrl(dataUrl) ?? 'image/png',
      position: normalizePoint(raw.position, defaultImagePosition(index)),
      width: positiveNumber(raw.width, EVIDENCE_IMAGE_DEFAULT_WIDTH),
      height: positiveNumber(raw.height, EVIDENCE_IMAGE_DEFAULT_HEIGHT),
      chapterIntroduced: positiveInt(raw.chapterIntroduced ?? raw.chapter, 1),
      createdAt: 0,
      updatedAt: 0,
    })];
  });

  const maxMentionedChapter = Math.max(
    1,
    ...characters.map((character) => character.chapterIntroduced),
    ...relationships.map((relationship) => relationship.chapterRevealed),
    ...openClues.map((clue) => clue.chapterIntroduced),
    ...annotations.map((note) => note.chapterIntroduced),
    ...groupRanges.map((group) => group.chapterIntroduced),
    ...evidenceImages.map((image) => image.chapterIntroduced),
  );
  const totalChapters = positiveInt(bookInput.totalChapters, maxMentionedChapter);

  return {
    calabashVersion: stringValue(payload.calabashVersion) ?? CALABASH_VERSION,
    importType: 'book',
    book: {
      id: templateBookId,
      title,
      author: stringValue(bookInput.author),
      totalChapters,
      currentChapter: Math.min(totalChapters, positiveInt(bookInput.currentChapter, 1)),
      spoilerShield: typeof bookInput.spoilerShield === 'boolean' ? bookInput.spoilerShield : false,
      spoilerChapters: numberArray(bookInput.spoilerChapters),
      highlightedChapters: numberArray(bookInput.highlightedChapters),
      openClues,
      createdAt: 0,
      updatedAt: 0,
    },
    characters,
    relationships,
    portraits: [],
    annotations,
    groupRanges,
    illustrations: evidenceImages,
  };
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function positiveInt(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.trunc(parsed));
}

function positiveNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function numberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const parsed = typeof item === 'number' ? item : Number.parseInt(String(item ?? ''), 10);
    return Number.isFinite(parsed) && parsed > 0 ? [Math.trunc(parsed)] : [];
  });
}

function arrayOfRecords(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function arrayOfClueInputs(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item === 'string' && item.trim()) return [{ text: item.trim() }];
    return isRecord(item) ? [item] : [];
  });
}

function normalizePoint(value: unknown, fallback: { x: number; y: number }): { x: number; y: number } {
  if (!isRecord(value)) return fallback;
  const x = typeof value.x === 'number' ? value.x : Number(value.x);
  const y = typeof value.y === 'number' ? value.y : Number(value.y);
  return {
    x: Number.isFinite(x) ? x : fallback.x,
    y: Number.isFinite(y) ? y : fallback.y,
  };
}

function normalizeAliases(value: unknown, name: string, chapterIntroduced: number): Alias[] {
  const aliases = Array.isArray(value)
    ? value.flatMap((item): Alias[] => {
      if (typeof item === 'string' && item.trim()) {
        return [{ name: item.trim(), chapterRevealed: chapterIntroduced }];
      }
      if (isRecord(item)) {
        const alias = stringValue(item.name);
        if (alias) return [{ name: alias, chapterRevealed: positiveInt(item.chapterRevealed ?? item.chapter, chapterIntroduced) }];
      }
      return [];
    })
    : [];
  return aliases.length ? aliases : [{ name, chapterRevealed: chapterIntroduced }];
}

function normalizeRoleReveals(value: unknown): Character['roleReveals'] {
  const reveals = arrayOfRecords(value).flatMap((item) => {
    const role = stringValue(item.role);
    if (!role) return [];
    return [{ role, chapterRevealed: positiveInt(item.chapterRevealed ?? item.chapter, 1) }];
  });
  return reveals.length ? reveals : undefined;
}

function normalizeCertainty(value: unknown): CertaintyLevel {
  const normalized = stringValue(value);
  return normalized && CERTAINTY_LEVELS.includes(normalized as CertaintyLevel)
    ? normalized as CertaintyLevel
    : 'suspected';
}

function normalizeStickyNoteColor(value: unknown): StickyNoteColor {
  const normalized = stringValue(value);
  return normalized && STICKY_NOTE_COLORS.includes(normalized as StickyNoteColor)
    ? normalized as StickyNoteColor
    : 'yellow';
}

function normalizeGroupRangeColor(value: unknown): GroupRangeColor {
  const normalized = stringValue(value);
  return normalized && GROUP_RANGE_COLORS.includes(normalized as GroupRangeColor)
    ? normalized as GroupRangeColor
    : 'blue';
}

function normalizeEvidenceImageKind(value: unknown): EvidenceImageKind {
  const normalized = stringValue(value);
  if (!normalized) return 'general';
  if (normalized === 'image') return 'general';
  if (normalized === 'table' || normalized === 'document') return 'screenshot';
  return normalized;
}

function normalizeEvidenceImageLayer(value: unknown): EvidenceImageLayer {
  const normalized = stringValue(value);
  return normalized && EVIDENCE_IMAGE_LAYERS.includes(normalized as EvidenceImageLayer)
    ? normalized as EvidenceImageLayer
    : 'board';
}

function resolveCharacterRef(value: unknown, lookup: Map<string, string>): string | undefined {
  const ref = stringValue(value);
  return ref ? lookup.get(ref) : undefined;
}

function uniqueId(value: string, used: Set<string>): string {
  const base = slugify(value) ?? 'item';
  let candidate = base;
  let index = 2;
  while (used.has(candidate)) {
    candidate = `${base}-${index}`;
    index++;
  }
  used.add(candidate);
  return candidate;
}

function slugify(value: string): string | undefined {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || undefined;
}

function defaultCharacterPosition(index: number): { x: number; y: number } {
  return { x: (index % 4) * 260, y: Math.floor(index / 4) * 190 };
}

function defaultNotePosition(index: number): { x: number; y: number } {
  return { x: 40 + (index % 2) * 320, y: 360 + Math.floor(index / 2) * 190 };
}

function defaultGroupPosition(index: number): { x: number; y: number } {
  return { x: -60 + (index % 2) * 580, y: -70 + Math.floor(index / 2) * 380 };
}

function defaultImagePosition(index: number): { x: number; y: number } {
  return { x: -220 + (index % 2) * 440, y: 540 + Math.floor(index / 2) * 300 };
}

export async function exportBookAsJson(bookId: string): Promise<CalabashExport> {
  const book = await db.books.get(bookId);
  if (!book) throw new Error(`Book ${bookId} not found`);
  const characters    = (await db.characters.where('bookId').equals(bookId).toArray()).map(normalizeCharacter);
  const relationships = await db.relationships.where('bookId').equals(bookId).toArray();
  const portraitRows  = await db.portraits.where('bookId').equals(bookId).toArray();
  const annotations   = (await db.annotations.where('bookId').equals(bookId).toArray()).map(normalizeStickyNote);
  const groupRanges   = (await db.groupRanges.where('bookId').equals(bookId).toArray()).map(normalizeGroupRange);
  const evidenceImages = (await db.evidenceImages.where('bookId').equals(bookId).toArray()).map(normalizeEvidenceImage);
  const portraits: PortraitExport[] = portraitRows.map((p) => ({
    id: p.id,
    bookId: p.bookId,
    mimeType: p.mimeType,
    dataUrl: bufferToDataUrl(p.blobBuffer, p.mimeType),
    createdAt: p.createdAt,
  }));
  return {
    calabashVersion: CALABASH_VERSION,
    book: normalizeBookForPortableData(book),
    characters,
    relationships,
    portraits,
    annotations,
    groupRanges,
    illustrations: evidenceImages,
  };
}

export async function exportLibraryAsJson(): Promise<CalabashLibraryExport> {
  const [users, categories, books, characters, relationships, portraitRows, annotations, groupRanges, evidenceImages] = await Promise.all([
    db.users.toArray(),
    db.categories.toArray(),
    db.books.toArray(),
    db.characters.toArray(),
    db.relationships.toArray(),
    db.portraits.toArray(),
    db.annotations.toArray(),
    db.groupRanges.toArray(),
    db.evidenceImages.toArray(),
  ]);
  const portraits: PortraitExport[] = portraitRows.map((p) => ({
    id: p.id,
    bookId: p.bookId,
    mimeType: p.mimeType,
    dataUrl: bufferToDataUrl(p.blobBuffer, p.mimeType),
    createdAt: p.createdAt,
  }));
  const illustrations = evidenceImages.map(normalizeEvidenceImage);
  return {
    calabashVersion: CALABASH_VERSION,
    exportType: 'library',
    exportedAt: Date.now(),
    users,
    categories,
    books: books.map(normalizeBookForPortableData),
    characters: characters.map(normalizeCharacter),
    relationships,
    annotations: annotations.map(normalizeStickyNote),
    groupRanges: groupRanges.map(normalizeGroupRange),
    illustrations,
    portraits,
  };
}

export async function importBookFromJson(payload: unknown, userId?: string): Promise<string> {
  const portablePayload = normalizeBookImportPayload(payload);
  const now = Date.now();
  const newBookId = crypto.randomUUID();
  const charIdMap = new Map<string, string>();
  const portraitIdMap = new Map<string, string>();

  const newPortraits = (portablePayload.portraits ?? []).map((p) => {
    const newId = crypto.randomUUID();
    portraitIdMap.set(p.id, newId);
    const { buffer, mimeType } = dataUrlToBuffer(p.dataUrl);
    return { id: newId, bookId: newBookId, blobBuffer: buffer, mimeType, createdAt: now };
  });

  const newCharacters = portablePayload.characters.map((c) => {
    const newId = crypto.randomUUID();
    charIdMap.set(c.id, newId);
    return {
      ...normalizeCharacter(c),
      id: newId,
      bookId: newBookId,
      portraitId: c.portraitId ? portraitIdMap.get(c.portraitId) : undefined,
      createdAt: now,
      updatedAt: now,
    };
  });

  const newRelationships = portablePayload.relationships.map((r) => ({
    ...r,
    id: crypto.randomUUID(),
    bookId: newBookId,
    sourceId: charIdMap.get(r.sourceId) ?? r.sourceId,
    targetId: charIdMap.get(r.targetId) ?? r.targetId,
    createdAt: now,
    updatedAt: now,
  }));

  const newAnnotations = (portablePayload.annotations ?? []).map((annotation) => ({
    ...normalizeStickyNote(annotation),
    id: crypto.randomUUID(),
    bookId: newBookId,
    createdAt: now,
    updatedAt: now,
  }));

  const newGroupRanges = (portablePayload.groupRanges ?? []).map((range) => ({
    ...normalizeGroupRange(range),
    id: crypto.randomUUID(),
    bookId: newBookId,
    createdAt: now,
    updatedAt: now,
  }));

  const newEvidenceImages = (portablePayload.illustrations ?? portablePayload.attachments ?? portablePayload.evidenceImages ?? []).map((image) => ({
    ...normalizeEvidenceImage(image),
    id: crypto.randomUUID(),
    bookId: newBookId,
    createdAt: now,
    updatedAt: now,
  }));

  await db.transaction('rw', [db.books, db.characters, db.relationships, db.portraits, db.annotations, db.groupRanges, db.evidenceImages], async () => {
    await db.books.put({
      ...portablePayload.book,
      id: newBookId,
      userId,
      categoryId: undefined,
      spoilerShield: portablePayload.book.spoilerShield ?? false,
      spoilerChapters: portablePayload.book.spoilerChapters ?? [],
      highlightedChapters: portablePayload.book.highlightedChapters ?? [],
      createdAt: now,
      updatedAt: now,
    });
    if (newPortraits.length)     await db.portraits.bulkAdd(newPortraits);
    if (newCharacters.length)    await db.characters.bulkAdd(newCharacters);
    if (newRelationships.length) await db.relationships.bulkAdd(newRelationships);
    if (newAnnotations.length)   await db.annotations.bulkAdd(newAnnotations);
    if (newGroupRanges.length)   await db.groupRanges.bulkAdd(newGroupRanges);
    if (newEvidenceImages.length) await db.evidenceImages.bulkAdd(newEvidenceImages);
  });

  return newBookId;
}

export async function importLibraryFromJson(payload: CalabashLibraryExport): Promise<ImportLibraryResult> {
  if (!isLibraryExport(payload)) throw new Error('Invalid Calabash library export');

  const portraits: PortraitRow[] = (payload.portraits ?? []).map((p) => {
    const { buffer, mimeType } = dataUrlToBuffer(p.dataUrl);
    return {
      id: p.id,
      bookId: p.bookId,
      blobBuffer: buffer,
      mimeType: p.mimeType || mimeType,
      createdAt: p.createdAt ?? Date.now(),
    };
  });
  const books = (payload.books ?? []).map(normalizeBookForPortableData);
  const characters = (payload.characters ?? []).map(normalizeCharacter);
  const annotations = (payload.annotations ?? []).map(normalizeStickyNote);
  const groupRanges = (payload.groupRanges ?? []).map(normalizeGroupRange);
  const evidenceImages = (payload.illustrations ?? payload.attachments ?? payload.evidenceImages ?? []).map(normalizeEvidenceImage);

  await db.transaction(
    'rw',
    [db.users, db.categories, db.books, db.characters, db.relationships, db.portraits, db.annotations, db.groupRanges, db.evidenceImages],
    async () => {
      if (payload.users?.length) await db.users.bulkPut(payload.users);
      if (payload.categories?.length) await db.categories.bulkPut(payload.categories);
      if (books.length) await db.books.bulkPut(books);
      if (characters.length) await db.characters.bulkPut(characters);
      if (payload.relationships?.length) await db.relationships.bulkPut(payload.relationships);
      if (annotations.length) await db.annotations.bulkPut(annotations);
      if (groupRanges.length) await db.groupRanges.bulkPut(groupRanges);
      if (evidenceImages.length) await db.evidenceImages.bulkPut(evidenceImages);
      if (portraits.length) await db.portraits.bulkPut(portraits);
    },
  );

  const activeBook = books[0];
  const activeUserId = activeBook?.userId ?? payload.users?.[0]?.id;
  return { activeUserId, activeBookId: activeBook?.id };
}
