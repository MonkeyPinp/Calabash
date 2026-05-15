import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { NodeProps, ResizeParams } from '@xyflow/react';
import EvidenceImageNode from '@/components/Canvas/EvidenceImageNode';
import { createEvidenceImage } from '@/db/evidenceImages';
import { db } from '@/db/schema';
import { useGraphStore } from '@/stores/graphStore';

vi.mock('@xyflow/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@xyflow/react')>();
  return {
    ...actual,
    NodeResizer: ({ onResizeEnd }: { onResizeEnd?: (event: unknown, params: ResizeParams) => void }) => (
      <button
        type="button"
        data-testid="resize-image"
        onClick={() => onResizeEnd?.({}, {
          x: -21.2,
          y: 18.8,
          width: 412.6,
          height: 268.2,
        })}
      >
        resize
      </button>
    ),
  };
});

describe('EvidenceImageNode', () => {
  beforeEach(async () => {
    await db.evidenceImages.clear();
    useGraphStore.setState({
      evidenceImages: [],
      undoStack: [],
      redoStack: [],
    });
  });

  it('persists position together with size when resized from top or left handles', async () => {
    const image = await createEvidenceImage({
      bookId: 'book-1',
      title: 'Study plan',
      dataUrl: 'data:image/png;base64,AAECAw==',
      mimeType: 'image/png',
      position: { x: 10, y: 20 },
      width: 300,
      height: 220,
    });
    useGraphStore.getState().setEvidenceImages([image]);

    const props = {
      id: image.id,
      data: { image },
      selected: true,
    } as unknown as NodeProps;
    const { getByTestId } = render(<EvidenceImageNode {...props} />);

    fireEvent.click(getByTestId('resize-image'));

    await waitFor(async () => {
      await expect(db.evidenceImages.get(image.id)).resolves.toMatchObject({
        position: { x: -21, y: 19 },
        width: 413,
        height: 268,
      });
    });
  });

  it('opens an in-app preview instead of a new blank tab on double-click', async () => {
    const image = await createEvidenceImage({
      bookId: 'book-1',
      title: 'Study plan',
      dataUrl: 'data:image/png;base64,AAECAw==',
      mimeType: 'image/png',
      position: { x: 10, y: 20 },
      width: 300,
      height: 220,
    });
    useGraphStore.getState().setEvidenceImages([image]);
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    const props = {
      id: image.id,
      data: { image },
      selected: true,
    } as unknown as NodeProps;
    const { getByTestId } = render(<EvidenceImageNode {...props} />);

    fireEvent.doubleClick(getByTestId('evidence-image-node'));

    expect(screen.getByTestId('illustration-preview-modal')).toBeInTheDocument();
    expect(openSpy).not.toHaveBeenCalled();
    openSpy.mockRestore();
  });
});
