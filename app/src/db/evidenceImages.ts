import { db } from './schema';
import type { EvidenceImage, EvidenceImageKind, EvidenceImageLayer } from '@/types';
import {
  EVIDENCE_IMAGE_DEFAULT_HEIGHT,
  EVIDENCE_IMAGE_DEFAULT_WIDTH,
  normalizeEvidenceImage,
  normalizeEvidenceImageChapter,
  normalizeEvidenceImageKind,
  normalizeEvidenceImageLayer,
} from '@/lib/evidenceImages';

export interface CreateEvidenceImageInput {
  bookId: string;
  title?: string;
  notes?: string;
  kind?: EvidenceImageKind;
  layer?: EvidenceImageLayer;
  dataUrl: string;
  mimeType?: string;
  position?: { x: number; y: number };
  width?: number;
  height?: number;
  chapterIntroduced?: number;
  locked?: boolean;
}

export async function createEvidenceImage(input: CreateEvidenceImageInput): Promise<EvidenceImage> {
  const now = Date.now();
  const image = normalizeEvidenceImage({
    id: crypto.randomUUID(),
    bookId: input.bookId,
    title: input.title ?? 'Illustration',
    notes: input.notes,
    kind: normalizeEvidenceImageKind(input.kind),
    layer: normalizeEvidenceImageLayer(input.layer),
    dataUrl: input.dataUrl,
    mimeType: input.mimeType ?? '',
    position: input.position ?? { x: 0, y: 0 },
    width: input.width ?? EVIDENCE_IMAGE_DEFAULT_WIDTH,
    height: input.height ?? EVIDENCE_IMAGE_DEFAULT_HEIGHT,
    chapterIntroduced: normalizeEvidenceImageChapter(input.chapterIntroduced),
    locked: input.locked === true,
    createdAt: now,
    updatedAt: now,
  });
  await db.evidenceImages.add(image);
  return image;
}

export async function listEvidenceImagesByBook(bookId: string): Promise<EvidenceImage[]> {
  const images = await db.evidenceImages.where('bookId').equals(bookId).toArray();
  return images.map(normalizeEvidenceImage);
}

export async function updateEvidenceImage(
  id: string,
  patch: Partial<Omit<EvidenceImage, 'id' | 'bookId' | 'createdAt'>>,
): Promise<EvidenceImage> {
  const existing = await db.evidenceImages.get(id);
  if (!existing) throw new Error(`Evidence image ${id} not found`);
  const next = normalizeEvidenceImage({ ...existing, ...patch, updatedAt: Date.now() });
  await db.evidenceImages.put(next);
  return next;
}

export async function deleteEvidenceImage(id: string): Promise<void> {
  await db.evidenceImages.delete(id);
}

export async function restoreEvidenceImage(image: EvidenceImage): Promise<void> {
  await db.evidenceImages.put(normalizeEvidenceImage(image));
}
