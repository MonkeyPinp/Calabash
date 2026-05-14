import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createGroupRange } from '@/db/groupRanges';
import { db } from '@/db/schema';
import GroupRangeInspector from '@/components/Inspector/GroupRangeInspector';
import { useGraphStore } from '@/stores/graphStore';

describe('GroupRangeInspector', () => {
  beforeEach(async () => {
    await db.groupRanges.clear();
    useGraphStore.setState({
      groupRanges: [],
      undoStack: [],
      redoStack: [],
    });
  });

  it('applies label font size edits when Enter is pressed', async () => {
    const range = await createGroupRange({
      bookId: 'book-1',
      label: 'Investigation team',
      position: { x: 10, y: 20 },
      width: 360,
      height: 240,
      labelFontSize: 18,
    });
    useGraphStore.getState().setGroupRanges([range]);

    const { container } = render(<GroupRangeInspector groupRangeId={range.id} bookId="book-1" />);
    const fontInput = container.querySelector('input[min="12"][max="64"]') as HTMLInputElement;

    fontInput.focus();
    fireEvent.change(fontInput, { target: { value: '42' } });
    fireEvent.keyDown(fontInput, { key: 'Enter' });

    await waitFor(async () => {
      await expect(db.groupRanges.get(range.id)).resolves.toMatchObject({ labelFontSize: 42 });
    });
    expect(screen.getByDisplayValue('42')).toBeInTheDocument();
    expect(useGraphStore.getState().groupRanges[0].labelFontSize).toBe(42);
  });
});
