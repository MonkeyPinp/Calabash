import type { EvidenceImage, EvidenceImageKind, EvidenceImageLayer } from '@/types';

export const EVIDENCE_IMAGE_KINDS = ['floorPlan', 'general', 'screenshot', 'other'] as const;
export const EVIDENCE_IMAGE_LAYERS: EvidenceImageLayer[] = ['board', 'background'];
export const EVIDENCE_IMAGE_DEFAULT_WIDTH = 360;
export const EVIDENCE_IMAGE_DEFAULT_HEIGHT = 240;
export const EVIDENCE_IMAGE_MIN_WIDTH = 140;
export const EVIDENCE_IMAGE_MIN_HEIGHT = 100;
export const EVIDENCE_IMAGE_MAX_WIDTH = 4096;
export const EVIDENCE_IMAGE_MAX_HEIGHT = 4096;

export function normalizeEvidenceImageChapter(value: unknown, fallback = 1): number {
  const parsed = typeof value === 'number' ? value : parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : fallback;
}

export function normalizeEvidenceImageKind(value: unknown): EvidenceImageKind {
  if (typeof value !== 'string') return 'general';
  const normalized = value.trim();
  if (!normalized) return 'general';
  if (normalized === 'image') return 'general';
  if (normalized === 'table' || normalized === 'document') return 'screenshot';
  return normalized;
}

export function normalizeEvidenceImageLayer(value: unknown): EvidenceImageLayer {
  return EVIDENCE_IMAGE_LAYERS.includes(value as EvidenceImageLayer)
    ? value as EvidenceImageLayer
    : 'board';
}

export function normalizeEvidenceImageDimension(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  const dimension = Number.isFinite(parsed) ? Math.round(parsed) : fallback;
  return Math.min(max, Math.max(min, dimension));
}

export function getEvidenceImageDisplayTag(image: Pick<EvidenceImage, 'chapterIntroduced'>): string {
  return `CH.${String(normalizeEvidenceImageChapter(image.chapterIntroduced)).padStart(2, '0')}`;
}

export function isEvidenceImageVisibleAtChapter(image: EvidenceImage, chapter: number): boolean {
  return normalizeEvidenceImageChapter(image.chapterIntroduced) <= chapter;
}

export function normalizeEvidenceImage(image: EvidenceImage): EvidenceImage {
  return {
    ...image,
    title: image.title?.trim() || 'Illustration',
    notes: image.notes?.trim() || undefined,
    kind: normalizeEvidenceImageKind(image.kind),
    layer: normalizeEvidenceImageLayer(image.layer),
    dataUrl: image.dataUrl,
    mimeType: image.mimeType || mimeTypeFromDataUrl(image.dataUrl) || 'image/png',
    width: normalizeEvidenceImageDimension(
      image.width,
      EVIDENCE_IMAGE_DEFAULT_WIDTH,
      EVIDENCE_IMAGE_MIN_WIDTH,
      EVIDENCE_IMAGE_MAX_WIDTH,
    ),
    height: normalizeEvidenceImageDimension(
      image.height,
      EVIDENCE_IMAGE_DEFAULT_HEIGHT,
      EVIDENCE_IMAGE_MIN_HEIGHT,
      EVIDENCE_IMAGE_MAX_HEIGHT,
    ),
    chapterIntroduced: normalizeEvidenceImageChapter(image.chapterIntroduced),
  };
}

export function mimeTypeFromDataUrl(dataUrl: string): string | undefined {
  const match = /^data:([^;]+);base64,/.exec(dataUrl);
  return match?.[1];
}

export function isValidEvidenceImageDataUrl(value: unknown): value is string {
  return typeof value === 'string' && /^data:image\/[a-z0-9.+-]+;base64,/i.test(value);
}
