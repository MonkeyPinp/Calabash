import { describe, expect, it } from 'vitest';
import { ALL_TIME_LAYERS_ID, resolveTimeLayerPosition } from '@/lib/timeLayers';

describe('time layer helpers', () => {
  it('uses per-layer positions for global nodes on specific layers', () => {
    const item = {
      position: { x: 10, y: 20 },
      timeLayerPositions: { 'loop-2': { x: 80, y: 120 } },
    };

    expect(resolveTimeLayerPosition(item, ALL_TIME_LAYERS_ID)).toEqual({ x: 10, y: 20 });
    expect(resolveTimeLayerPosition(item, 'loop-2')).toEqual({ x: 80, y: 120 });
    expect(resolveTimeLayerPosition(item, 'loop-7')).toEqual({ x: 10, y: 20 });
  });

  it('uses the base position for nodes scoped to a single layer', () => {
    const item = {
      position: { x: 10, y: 20 },
      timeLayerId: 'loop-2',
      timeLayerPositions: { 'loop-2': { x: 80, y: 120 } },
    };

    expect(resolveTimeLayerPosition(item, 'loop-2')).toEqual({ x: 10, y: 20 });
  });
});
