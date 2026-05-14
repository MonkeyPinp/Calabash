import { describe, it, expect } from 'vitest';
import { isDirected, isRelationshipDirected, RELATIONSHIP_TYPE_META } from '@/lib/relationshipTypes';

describe('relationship type directionality', () => {
  it('treats family/professional/romantic/other as symmetric', () => {
    expect(isDirected('family')).toBe(false);
    expect(isDirected('professional')).toBe(false);
    expect(isDirected('romantic')).toBe(false);
    expect(isDirected('other')).toBe(false);
  });

  it('treats hostile/suspicion as directed', () => {
    expect(isDirected('hostile')).toBe(true);
    expect(isDirected('suspicion')).toBe(true);
  });

  it('treats custom or blank relationship types as symmetric unless overridden', () => {
    expect(isDirected('mentor')).toBe(false);
    expect(isDirected(undefined)).toBe(false);
    expect(isRelationshipDirected({ type: 'mentor', directed: true })).toBe(true);
    expect(isRelationshipDirected({ type: 'suspicion', directed: false })).toBe(false);
  });

  it('exposes the full table', () => {
    expect(Object.keys(RELATIONSHIP_TYPE_META).sort()).toEqual(
      ['family', 'hostile', 'other', 'professional', 'romantic', 'suspicion'],
    );
  });
});
