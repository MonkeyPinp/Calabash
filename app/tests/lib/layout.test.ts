import { describe, expect, it } from 'vitest';
import {
  computeForceLayout,
  countLayoutEdgeCrossings,
  getMinimumLayoutNodeDistance,
  improveLayoutEdgeCrossings,
  MIN_LAYOUT_NODE_DISTANCE,
  separateLayoutNodes,
  type LayoutEdge,
  type LayoutPoint,
} from '@/lib/layout';

describe('layout', () => {
  it('counts only proper crossings between unrelated edges', () => {
    const positions = new Map<string, LayoutPoint>([
      ['a', { x: 0, y: 0 }],
      ['b', { x: 100, y: 0 }],
      ['c', { x: 100, y: 100 }],
      ['d', { x: 0, y: 100 }],
    ]);

    expect(countLayoutEdgeCrossings(positions, [
      { source: 'a', target: 'c' },
      { source: 'b', target: 'd' },
    ])).toBe(1);

    expect(countLayoutEdgeCrossings(positions, [
      { source: 'a', target: 'b' },
      { source: 'a', target: 'c' },
    ])).toBe(0);
  });

  it('improves a layout by swapping node positions when that removes crossings', () => {
    const positions = new Map<string, LayoutPoint>([
      ['a', { x: 0, y: 0 }],
      ['b', { x: 100, y: 0 }],
      ['c', { x: 100, y: 100 }],
      ['d', { x: 0, y: 100 }],
    ]);
    const edges: LayoutEdge[] = [
      { source: 'a', target: 'c' },
      { source: 'b', target: 'd' },
    ];

    const improved = improveLayoutEdgeCrossings(positions, edges);
    expect(countLayoutEdgeCrossings(improved, edges)).toBe(0);
  });

  it('separates nodes so the layout keeps a readable gap', () => {
    const positions = new Map<string, LayoutPoint>([
      ['a', { x: 0, y: 0 }],
      ['b', { x: 10, y: 0 }],
      ['c', { x: 20, y: 0 }],
    ]);

    const separated = separateLayoutNodes(positions);
    expect(getMinimumLayoutNodeDistance(separated)).toBeGreaterThanOrEqual(MIN_LAYOUT_NODE_DISTANCE - 1);
  });

  it('runs the crossing-reduction pass after the force layout', () => {
    const edges: LayoutEdge[] = [
      { source: 'a', target: 'c' },
      { source: 'b', target: 'd' },
    ];
    const positions = computeForceLayout(['a', 'b', 'c', 'd'], edges, 600, 420);
    expect(countLayoutEdgeCrossings(positions, edges)).toBe(0);
    expect(getMinimumLayoutNodeDistance(positions)).toBeGreaterThanOrEqual(MIN_LAYOUT_NODE_DISTANCE - 1);
  });
});
