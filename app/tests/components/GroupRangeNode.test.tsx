import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, waitFor } from '@testing-library/react';
import type { NodeProps, ResizeParams } from '@xyflow/react';
import { createGroupRange } from '@/db/groupRanges';
import { db } from '@/db/schema';
import GroupRangeNode from '@/components/Canvas/GroupRangeNode';
import { useGraphStore } from '@/stores/graphStore';

vi.mock('@xyflow/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@xyflow/react')>();
  return {
    ...actual,
    NodeResizer: ({ onResizeEnd }: { onResizeEnd?: (event: unknown, params: ResizeParams) => void }) => (
      <button
        type="button"
        data-testid="resize-range"
        onClick={() => onResizeEnd?.({}, {
          x: -15.2,
          y: 17.7,
          width: 340.4,
          height: 280.6,
        })}
      >
        resize
      </button>
    ),
  };
});

describe('GroupRangeNode', () => {
  beforeEach(async () => {
    await db.groupRanges.clear();
    useGraphStore.setState({
      groupRanges: [],
      evidenceImages: [],
      undoStack: [],
      redoStack: [],
    });
  });

  it('persists position together with size when resized from top or left handles', async () => {
    const range = await createGroupRange({
      bookId: 'book-1',
      label: 'Tatsumi family',
      position: { x: 10, y: 20 },
      width: 300,
      height: 220,
    });
    useGraphStore.getState().setGroupRanges([range]);

    const props = {
      id: range.id,
      data: { range },
      selected: true,
    } as unknown as NodeProps;
    const { getByTestId } = render(<GroupRangeNode {...props} />);

    fireEvent.click(getByTestId('resize-range'));

    await waitFor(async () => {
      await expect(db.groupRanges.get(range.id)).resolves.toMatchObject({
        position: { x: -15, y: 18 },
        width: 340,
        height: 281,
      });
    });
    expect(useGraphStore.getState().groupRanges[0]).toMatchObject({
      position: { x: -15, y: 18 },
      width: 340,
      height: 281,
    });
  });
});
