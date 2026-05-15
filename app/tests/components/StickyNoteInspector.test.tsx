import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createAnnotation } from '@/db/annotations';
import { db } from '@/db/schema';
import StickyNoteInspector from '@/components/Inspector/StickyNoteInspector';
import { useGraphStore } from '@/stores/graphStore';

describe('StickyNoteInspector', () => {
  beforeEach(async () => {
    await db.annotations.clear();
    useGraphStore.setState({
      stickyNotes: [],
      evidenceImages: [],
      undoStack: [],
      redoStack: [],
    });
  });

  it('applies font size edits when Enter is pressed', async () => {
    const note = await createAnnotation({
      bookId: 'book-1',
      content: 'A clue worth keeping',
      position: { x: 10, y: 20 },
      width: 220,
      height: 140,
      fontSize: 13,
    });
    useGraphStore.getState().setStickyNotes([note]);

    const { container } = render(<StickyNoteInspector stickyNoteId={note.id} />);
    const fontInput = container.querySelector('input[min="11"][max="28"]') as HTMLInputElement;

    fontInput.focus();
    fireEvent.change(fontInput, { target: { value: '22' } });
    fireEvent.keyDown(fontInput, { key: 'Enter' });

    await waitFor(async () => {
      await expect(db.annotations.get(note.id)).resolves.toMatchObject({ fontSize: 22 });
    });
    expect(screen.getByDisplayValue('22')).toBeInTheDocument();
    expect(useGraphStore.getState().stickyNotes[0].fontSize).toBe(22);
  });
});
