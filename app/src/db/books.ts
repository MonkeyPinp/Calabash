import { db } from './schema';
import type { Book } from '@/types';
import { createOpenClueDraft, normalizeOpenClues } from '@/lib/clues';

function normalizeBook(book: Book): Book {
  const currentChapter = normalizeChapterNumber(book.currentChapter, 1);
  const totalChapters = Math.max(normalizeChapterNumber(book.totalChapters, 1), currentChapter);
  return {
    ...book,
    currentChapter,
    totalChapters,
    spoilerShield: book.spoilerShield ?? false,
    spoilerChapters: normalizeChapters(book.spoilerChapters),
    highlightedChapters: normalizeChapters(book.highlightedChapters),
    openClues: normalizeOpenClues(book.openClues),
  };
}

export class ChapterTotalTooLowError extends Error {
  readonly requestedTotalChapters: number;
  readonly minimumTotalChapters: number;

  constructor(requestedTotalChapters: number, minimumTotalChapters: number) {
    super(`Total chapters must be at least ${minimumTotalChapters}`);
    this.name = 'ChapterTotalTooLowError';
    this.requestedTotalChapters = requestedTotalChapters;
    this.minimumTotalChapters = minimumTotalChapters;
  }
}

function normalizeChapterNumber(value: unknown, fallback = 1): number {
  const numberValue = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numberValue)) return fallback;
  return Math.max(1, Math.trunc(numberValue));
}

function normalizeBookTitleForDisplay(title: string): string {
  const normalized = title.trim().replace(/\s+/g, ' ');
  return normalized || 'Untitled Case';
}

function normalizeBookTitleForCompare(title: string): string {
  return normalizeBookTitleForDisplay(title).toLocaleLowerCase();
}

export async function makeUniqueBookTitle(title: string, userId?: string, ignoreBookId?: string): Promise<string> {
  const baseTitle = normalizeBookTitleForDisplay(title);
  const books = await db.books.toArray();
  const existingTitles = new Set(
    books
      .filter((book) => book.id !== ignoreBookId)
      .filter((book) => (userId ? book.userId === userId : book.userId === undefined))
      .map((book) => normalizeBookTitleForCompare(book.title)),
  );

  let candidate = baseTitle;
  for (let suffix = 2; existingTitles.has(normalizeBookTitleForCompare(candidate)); suffix += 1) {
    candidate = `${baseTitle} (${suffix})`;
  }
  return candidate;
}

export async function createBook(input: {
  title: string;
  userId?: string;
  author?: string;
  totalChapters?: number;
  spoilerShield?: boolean;
  spoilerChapters?: number[];
  highlightedChapters?: number[];
  categoryId?: string;
}): Promise<Book> {
  const now = Date.now();
  const title = await makeUniqueBookTitle(input.title, input.userId);
  const spoilerChapters = normalizeChapters(input.spoilerChapters);
  const highlightedChapters = normalizeChapters(input.highlightedChapters);
  const totalChapters = Math.max(
    normalizeChapterNumber(input.totalChapters, 30),
    ...spoilerChapters,
    ...highlightedChapters,
  );
  const book: Book = {
    id: crypto.randomUUID(),
    userId: input.userId,
    categoryId: input.categoryId,
    title,
    author: input.author,
    totalChapters,
    currentChapter: 1,
    spoilerShield: input.spoilerShield ?? false,
    spoilerChapters,
    highlightedChapters,
    openClues: [],
    createdAt: now,
    updatedAt: now,
  };
  await db.books.add(book);
  return book;
}

export async function getBook(id: string): Promise<Book | undefined> {
  const book = await db.books.get(id);
  return book ? normalizeBook(book) : undefined;
}

export async function listBooks(userId?: string): Promise<Book[]> {
  const all = userId
    ? await db.books.where('userId').equals(userId).toArray()
    : await db.books.toArray();
  return all.map(normalizeBook).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function updateBook(
  id: string,
  patch: Partial<Omit<Book, 'id' | 'createdAt'>>,
): Promise<Book> {
  const existing = await db.books.get(id);
  if (!existing) throw new Error(`Book ${id} not found`);
  const normalizedExisting = normalizeBook(existing);
  const nextTotalChapters = 'totalChapters' in patch
    ? normalizeChapterNumber(patch.totalChapters, normalizedExisting.totalChapters)
    : normalizedExisting.totalChapters;
  const nextCurrentChapter = 'currentChapter' in patch
    ? normalizeChapterNumber(patch.currentChapter, normalizedExisting.currentChapter)
    : normalizedExisting.currentChapter;
  const title = typeof patch.title === 'string' || 'userId' in patch
    ? await makeUniqueBookTitle(patch.title ?? normalizedExisting.title, patch.userId ?? normalizedExisting.userId, id)
    : undefined;
  const next: Book = {
    ...normalizedExisting,
    ...patch,
    ...(title === undefined ? {} : { title }),
    currentChapter: nextCurrentChapter,
    totalChapters: nextTotalChapters,
    updatedAt: Date.now(),
  };
  if (patch.spoilerChapters) next.spoilerChapters = normalizeChapters(patch.spoilerChapters);
  if (patch.highlightedChapters) next.highlightedChapters = normalizeChapters(patch.highlightedChapters);
  if (patch.openClues) next.openClues = normalizeOpenClues(patch.openClues);
  if (touchesChapterBoundary(patch)) {
    const minimumTotalChapters = await getMinimumTotalChaptersForBook(next);
    if (next.totalChapters < minimumTotalChapters) {
      throw new ChapterTotalTooLowError(next.totalChapters, minimumTotalChapters);
    }
  }
  await db.books.put(next);
  return next;
}

function touchesChapterBoundary(patch: Partial<Omit<Book, 'id' | 'createdAt'>>): boolean {
  return (
    'totalChapters' in patch ||
    'currentChapter' in patch ||
    'spoilerChapters' in patch ||
    'highlightedChapters' in patch ||
    'openClues' in patch
  );
}

async function getMinimumTotalChaptersForBook(book: Book): Promise<number> {
  const [characters, relationships, annotations, groupRanges, evidenceImages] = await Promise.all([
    db.characters.where('bookId').equals(book.id).toArray(),
    db.relationships.where('bookId').equals(book.id).toArray(),
    db.annotations.where('bookId').equals(book.id).toArray(),
    db.groupRanges.where('bookId').equals(book.id).toArray(),
    db.evidenceImages.where('bookId').equals(book.id).toArray(),
  ]);

  return Math.max(
    1,
    normalizeChapterNumber(book.currentChapter),
    ...normalizeChapters(book.spoilerChapters),
    ...normalizeChapters(book.highlightedChapters),
    ...normalizeOpenClues(book.openClues).map((clue) => normalizeChapterNumber(clue.chapterIntroduced)),
    ...characters.flatMap((character) => [
      normalizeChapterNumber(character.chapterIntroduced),
      ...(character.aliases ?? []).map((alias) => normalizeChapterNumber(alias.chapterRevealed)),
      ...(character.roleReveals ?? []).map((reveal) => normalizeChapterNumber(reveal.chapterRevealed)),
    ]),
    ...relationships.map((relationship) => normalizeChapterNumber(relationship.chapterRevealed)),
    ...annotations.map((annotation) => normalizeChapterNumber(annotation.chapterIntroduced)),
    ...groupRanges.map((range) => normalizeChapterNumber(range.chapterIntroduced)),
    ...evidenceImages.map((image) => normalizeChapterNumber(image.chapterIntroduced)),
  );
}

function normalizeChapters(chapters: number[] = []): number[] {
  return [...new Set(chapters.map((chapter) => Math.trunc(chapter)).filter((chapter) => chapter > 0))]
    .sort((a, b) => a - b);
}

export async function deleteBook(id: string): Promise<void> {
  await db.transaction(
    'rw',
    [db.books, db.characters, db.relationships, db.portraits, db.annotations, db.groupRanges, db.evidenceImages],
    async () => {
      await db.characters.where('bookId').equals(id).delete();
      await db.relationships.where('bookId').equals(id).delete();
      await db.portraits.where('bookId').equals(id).delete();
      await db.annotations.where('bookId').equals(id).delete();
      await db.groupRanges.where('bookId').equals(id).delete();
      await db.evidenceImages.where('bookId').equals(id).delete();
      await db.books.delete(id);
    },
  );
}

export async function listOpenClues(bookId: string) {
  const book = await getBook(bookId);
  return book?.openClues ?? [];
}

export async function createOpenClue(input: {
  bookId: string;
  text: string;
  chapterIntroduced: number;
}) {
  const book = await getBook(input.bookId);
  if (!book) throw new Error(`Book ${input.bookId} not found`);
  const text = input.text.trim();
  if (!text) throw new Error('Clue text is required');
  const clue = createOpenClueDraft(text, input.chapterIntroduced);
  await updateBook(input.bookId, { openClues: [...(book.openClues ?? []), clue] });
  return clue;
}

export async function updateOpenClue(
  bookId: string,
  clueId: string,
  patch: Partial<Omit<NonNullable<Book['openClues']>[number], 'id' | 'createdAt'>>,
) {
  const book = await getBook(bookId);
  if (!book) throw new Error(`Book ${bookId} not found`);
  const openClues = book.openClues ?? [];
  const existing = openClues.find((clue) => clue.id === clueId);
  if (!existing) throw new Error(`Clue ${clueId} not found`);
  const text = patch.text?.trim();
  if ('text' in patch && !text) throw new Error('Clue text is required');
  const nextClue = {
    ...existing,
    ...patch,
    text: text === undefined ? existing.text : text,
    updatedAt: Date.now(),
  };
  await updateBook(bookId, {
    openClues: openClues.map((clue) => clue.id === clueId ? nextClue : clue),
  });
  return nextClue;
}

export async function deleteOpenClue(bookId: string, clueId: string) {
  const book = await getBook(bookId);
  if (!book) throw new Error(`Book ${bookId} not found`);
  await updateBook(bookId, {
    openClues: (book.openClues ?? []).filter((clue) => clue.id !== clueId),
  });
}
