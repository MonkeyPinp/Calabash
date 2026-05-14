import { db } from './schema';
import type { StickyNote, StickyNoteColor } from '@/types';
import {
  inferStickyNoteChapter,
  normalizeStickyNote,
  normalizeStickyNoteChapter,
  STICKY_NOTE_DEFAULT_FONT_SIZE,
} from '@/lib/stickyNotes';

export interface CreateAnnotationInput {
  bookId: string;
  content?: string;
  position?: { x: number; y: number };
  width?: number;
  height?: number;
  color?: StickyNoteColor;
  fontSize?: number;
  chapterIntroduced?: number;
}

export async function createAnnotation(input: CreateAnnotationInput): Promise<StickyNote> {
  const now = Date.now();
  const note: StickyNote = {
    id: crypto.randomUUID(),
    bookId: input.bookId,
    content: input.content ?? '',
    position: input.position ?? { x: 0, y: 0 },
    width: input.width ?? 200,
    height: input.height ?? 150,
    color: input.color ?? 'yellow',
    fontSize: input.fontSize ?? STICKY_NOTE_DEFAULT_FONT_SIZE,
    chapterIntroduced: normalizeStickyNoteChapter(
      input.chapterIntroduced,
      inferStickyNoteChapter(input.content) ?? 1,
    ),
    createdAt: now,
    updatedAt: now,
  };
  await db.annotations.add(note);
  return note;
}

export async function listAnnotationsByBook(bookId: string): Promise<StickyNote[]> {
  const notes = await db.annotations.where('bookId').equals(bookId).toArray();
  return notes.map(normalizeStickyNote);
}

export async function updateAnnotation(
  id: string,
  patch: Partial<Omit<StickyNote, 'id' | 'bookId' | 'createdAt'>>,
): Promise<StickyNote> {
  const existing = await db.annotations.get(id);
  if (!existing) throw new Error(`Annotation ${id} not found`);
  const next: StickyNote = normalizeStickyNote({ ...existing, ...patch, updatedAt: Date.now() });
  await db.annotations.put(next);
  return next;
}

export async function deleteAnnotation(id: string): Promise<void> {
  await db.annotations.delete(id);
}

export async function restoreAnnotation(note: StickyNote): Promise<void> {
  await db.annotations.put(normalizeStickyNote(note));
}
