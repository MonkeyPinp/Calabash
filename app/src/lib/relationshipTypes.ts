import type { RelationshipType } from '@/types';

export const RELATIONSHIP_TYPE_META: Record<RelationshipType, { directed: boolean }> = {
  family:       { directed: false },
  professional: { directed: false },
  romantic:     { directed: false },
  hostile:      { directed: true  },
  suspicion:    { directed: true  },
  other:        { directed: false },
};

export function isDirected(type: RelationshipType): boolean {
  return RELATIONSHIP_TYPE_META[type].directed;
}
