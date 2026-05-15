import { describe, it, expect } from 'vitest';
import {
  getEvidenceImageDisplayTag,
  isEvidenceImageVisibleAtChapter,
  normalizeEvidenceImage,
} from '@/lib/evidenceImages';
import type { EvidenceImage } from '@/types';

const baseImage: EvidenceImage = {
  id: 'image-1',
  bookId: 'book-1',
  title: 'Study plan',
  kind: 'floorPlan',
  layer: 'background',
  dataUrl: 'data:image/png;base64,AAECAw==',
  mimeType: 'image/png',
  position: { x: 0, y: 0 },
  width: 360,
  height: 240,
  chapterIntroduced: 4,
  createdAt: 0,
  updatedAt: 0,
};

describe('evidenceImages helpers', () => {
  it('formats chapter tags and chapter visibility', () => {
    expect(getEvidenceImageDisplayTag(baseImage)).toBe('CH.04');
    expect(isEvidenceImageVisibleAtChapter(baseImage, 3)).toBe(false);
    expect(isEvidenceImageVisibleAtChapter(baseImage, 4)).toBe(true);
  });

  it('normalizes legacy or malformed evidence image fields', () => {
    const normalized = normalizeEvidenceImage({
      ...baseImage,
      title: '',
      kind: '',
      layer: 'underlay' as EvidenceImage['layer'],
      mimeType: '',
      width: 12,
      height: 12,
      chapterIntroduced: -3,
    });

    expect(normalized).toMatchObject({
      title: 'Illustration',
      kind: 'general',
      layer: 'board',
      mimeType: 'image/png',
      width: 140,
      height: 100,
      chapterIntroduced: 1,
    });
  });

  it('maps legacy attachment kinds onto illustration kinds', () => {
    expect(normalizeEvidenceImage({ ...baseImage, kind: 'image' as EvidenceImage['kind'] }).kind).toBe('general');
    expect(normalizeEvidenceImage({ ...baseImage, kind: 'table' as EvidenceImage['kind'] }).kind).toBe('screenshot');
    expect(normalizeEvidenceImage({ ...baseImage, kind: 'document' as EvidenceImage['kind'] }).kind).toBe('screenshot');
  });

  it('keeps custom illustration kind text', () => {
    expect(normalizeEvidenceImage({ ...baseImage, kind: 'timeline sketch' }).kind).toBe('timeline sketch');
  });

  it('allows large floor plan display sizes', () => {
    const normalized = normalizeEvidenceImage({
      ...baseImage,
      width: 3200,
      height: 1800,
    });

    expect(normalized.width).toBe(3200);
    expect(normalized.height).toBe(1800);
  });
});
