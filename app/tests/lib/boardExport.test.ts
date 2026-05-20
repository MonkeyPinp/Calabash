import { describe, expect, it } from 'vitest';
import type { Node } from '@xyflow/react';
import { getBoardExportDimensions, getVisibleNodeBounds } from '@/lib/boardExport';

describe('board export helpers', () => {
  it('computes bounds across visible board nodes including negative coordinates', () => {
    const nodes: Node[] = [
      { id: 'a', type: 'character', position: { x: -120, y: 30 }, data: {}, width: 180, height: 90 },
      { id: 'b', type: 'stickyNote', position: { x: 240, y: -80 }, data: {}, width: 220, height: 250 },
    ];

    expect(getVisibleNodeBounds(nodes)).toEqual({
      minX: -120,
      minY: -80,
      maxX: 460,
      maxY: 170,
    });
  });

  it('returns scaled export dimensions with room around the board', () => {
    const dimensions = getBoardExportDimensions({
      minX: 0,
      minY: 0,
      maxX: 400,
      maxY: 200,
    });

    expect(dimensions.width).toBeGreaterThan(400);
    expect(dimensions.height).toBeGreaterThan(200);
    expect(dimensions.offsetX).toBeGreaterThan(0);
    expect(dimensions.offsetY).toBeGreaterThan(0);
  });
});
