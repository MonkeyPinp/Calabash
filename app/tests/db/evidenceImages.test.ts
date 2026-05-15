import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/db/schema';
import {
  createEvidenceImage,
  deleteEvidenceImage,
  listEvidenceImagesByBook,
  restoreEvidenceImage,
  updateEvidenceImage,
} from '@/db/evidenceImages';

describe('evidenceImages DAO', () => {
  beforeEach(async () => {
    await db.evidenceImages.clear();
  });

  it('creates, updates, deletes, and restores evidence images', async () => {
    const image = await createEvidenceImage({
      bookId: 'book-1',
      title: 'Study floor plan',
      kind: 'floorPlan',
      layer: 'background',
      dataUrl: 'data:image/png;base64,AAECAw==',
      mimeType: 'image/png',
      position: { x: 10, y: 20 },
      width: 420,
      height: 260,
      chapterIntroduced: 3,
    });

    expect(image.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(image.kind).toBe('floorPlan');
    expect(image.layer).toBe('background');
    expect(await listEvidenceImagesByBook('book-1')).toHaveLength(1);

    const updated = await updateEvidenceImage(image.id, {
      title: 'Library plan',
      kind: 'timeline sketch',
      layer: 'board',
      width: 20,
      height: 20,
      chapterIntroduced: 5,
      notes: 'Check the locked door.',
    });

    expect(updated).toMatchObject({
      title: 'Library plan',
      kind: 'timeline sketch',
      layer: 'board',
      width: 140,
      height: 100,
      chapterIntroduced: 5,
      notes: 'Check the locked door.',
    });

    await deleteEvidenceImage(image.id);
    expect(await listEvidenceImagesByBook('book-1')).toEqual([]);

    await restoreEvidenceImage(updated);
    expect(await listEvidenceImagesByBook('book-1')).toHaveLength(1);
  });
});
