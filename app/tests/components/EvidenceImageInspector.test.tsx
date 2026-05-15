import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import EvidenceImageInspector from '@/components/Inspector/EvidenceImageInspector';
import { createEvidenceImage } from '@/db/evidenceImages';
import { db } from '@/db/schema';
import { useGraphStore } from '@/stores/graphStore';

describe('EvidenceImageInspector', () => {
  beforeEach(async () => {
    await db.evidenceImages.clear();
    useGraphStore.setState({
      evidenceImages: [],
      undoStack: [],
      redoStack: [],
    });
  });

  it('applies width edits when Enter is pressed', async () => {
    const image = await createEvidenceImage({
      bookId: 'book-1',
      title: 'Study plan',
      dataUrl: 'data:image/png;base64,AAECAw==',
      mimeType: 'image/png',
      width: 280,
      height: 180,
    });
    useGraphStore.getState().setEvidenceImages([image]);

    const { container } = render(<EvidenceImageInspector evidenceImageId={image.id} bookId="book-1" />);
    const widthInput = container.querySelector('input[min="140"]') as HTMLInputElement;

    widthInput.focus();
    fireEvent.change(widthInput, { target: { value: '420' } });
    fireEvent.keyDown(widthInput, { key: 'Enter' });

    await waitFor(async () => {
      await expect(db.evidenceImages.get(image.id)).resolves.toMatchObject({ width: 420 });
    });
    expect(screen.getByDisplayValue('420')).toBeInTheDocument();
    expect(useGraphStore.getState().evidenceImages[0].width).toBe(420);
  });

  it('accepts free-text illustration types while offering defaults', async () => {
    const image = await createEvidenceImage({
      bookId: 'book-1',
      title: 'Study plan',
      dataUrl: 'data:image/png;base64,AAECAw==',
      mimeType: 'image/png',
      width: 280,
      height: 180,
    });
    useGraphStore.getState().setEvidenceImages([image]);

    const { container } = render(<EvidenceImageInspector evidenceImageId={image.id} bookId="book-1" />);
    const kindInput = container.querySelector('input[list="evidence-image-kind-options"]') as HTMLInputElement;

    expect(container.querySelector('datalist#evidence-image-kind-options option[value="floorPlan"]')).toBeInTheDocument();
    kindInput.focus();
    fireEvent.change(kindInput, { target: { value: 'timeline sketch' } });
    fireEvent.keyDown(kindInput, { key: 'Enter' });

    await waitFor(async () => {
      await expect(db.evidenceImages.get(image.id)).resolves.toMatchObject({ kind: 'timeline sketch' });
    });
    expect(useGraphStore.getState().evidenceImages[0].kind).toBe('timeline sketch');
  });

  it('previews illustrations in-app from the inspector', async () => {
    const image = await createEvidenceImage({
      bookId: 'book-1',
      title: 'Study plan',
      dataUrl: 'data:image/png;base64,AAECAw==',
      mimeType: 'image/png',
      width: 280,
      height: 180,
    });
    useGraphStore.getState().setEvidenceImages([image]);
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    render(<EvidenceImageInspector evidenceImageId={image.id} bookId="book-1" />);
    fireEvent.click(screen.getByTitle('Preview illustration'));

    expect(screen.getByTestId('illustration-preview-modal')).toBeInTheDocument();
    expect(openSpy).not.toHaveBeenCalled();
    openSpy.mockRestore();
  });
});
