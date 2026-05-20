import { describe, expect, it } from 'vitest';
import type { Node } from '@xyflow/react';
import { getBoardExportDimensions, getVisibleNodeBounds, mergeVisualExtentBounds } from '@/lib/boardExport';

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

  it('expands bounds for visible labels that overflow their node rectangle', () => {
    const viewport = document.createElement('div');
    const label = document.createElement('div');
    label.dataset.boardExportExtent = 'true';
    viewport.append(label);

    viewport.getBoundingClientRect = () => ({
      x: 100,
      y: 50,
      left: 100,
      top: 50,
      right: 500,
      bottom: 350,
      width: 400,
      height: 300,
      toJSON() { return this; },
    });
    label.getBoundingClientRect = () => ({
      x: 60,
      y: 25,
      left: 60,
      top: 25,
      right: 430,
      bottom: 170,
      width: 370,
      height: 145,
      toJSON() { return this; },
    });

    expect(mergeVisualExtentBounds({
      minX: 0,
      minY: 0,
      maxX: 100,
      maxY: 100,
    }, viewport)).toEqual({
      minX: -40,
      minY: -25,
      maxX: 330,
      maxY: 120,
    });
  });
});
