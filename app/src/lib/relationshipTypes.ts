import type { Relationship, RelationshipType } from '@/types';

export const RELATIONSHIP_TYPE_PRESETS = [
  'family',
  'professional',
  'romantic',
  'hostile',
  'suspicion',
  'other',
] as const;

export type PresetRelationshipType = typeof RELATIONSHIP_TYPE_PRESETS[number];
export type RelationshipDirectionChoice = 'forward' | 'reverse' | 'undirected';

const RELATIONSHIP_TYPE_SET = new Set<string>(RELATIONSHIP_TYPE_PRESETS);

export const RELATIONSHIP_TYPE_META: Record<PresetRelationshipType, { directed: boolean }> = {
  family:       { directed: false },
  professional: { directed: false },
  romantic:     { directed: false },
  hostile:      { directed: true  },
  suspicion:    { directed: true  },
  other:        { directed: false },
};

const TYPE_MARKER_COLOR: Record<PresetRelationshipType, string> = {
  family:       '#b06820',
  professional: '#2c6080',
  romantic:     '#a83870',
  hostile:      '#b02020',
  suspicion:    '#9a7010',
  other:        '#707070',
};

export function normalizeRelationshipType(type?: string | null): RelationshipType | undefined {
  const cleaned = type?.trim();
  return cleaned || undefined;
}

export function isPresetRelationshipType(type?: RelationshipType): type is PresetRelationshipType {
  return Boolean(type && RELATIONSHIP_TYPE_SET.has(type));
}

export function getRelationshipTypeVisualKey(type?: RelationshipType): PresetRelationshipType {
  return isPresetRelationshipType(type) ? type : 'other';
}

export function getRelationshipTypeCssVar(type?: RelationshipType): string {
  return `var(--rel-${getRelationshipTypeVisualKey(type)})`;
}

export function getRelationshipTypeMarkerColor(type?: RelationshipType): string {
  return TYPE_MARKER_COLOR[getRelationshipTypeVisualKey(type)];
}

export function formatRelationshipType(
  type: RelationshipType | undefined,
  translate: (key: string) => string,
): string {
  if (!type) return '';
  return isPresetRelationshipType(type) ? translate(`relationshipType.${type}`) : type;
}

export function isDirected(type?: RelationshipType): boolean {
  return isPresetRelationshipType(type) ? RELATIONSHIP_TYPE_META[type].directed : false;
}

export function isRelationshipDirected(relationship: Pick<Relationship, 'type' | 'directed'>): boolean {
  return relationship.directed ?? isDirected(relationship.type);
}

export function directedOverrideForChoice(
  type: RelationshipType | undefined,
  direction: RelationshipDirectionChoice,
): boolean | undefined {
  const directed = direction !== 'undirected';
  return directed === isDirected(type) ? undefined : directed;
}

export function orientRelationshipEndpoints(
  sourceId: string,
  targetId: string,
  direction: RelationshipDirectionChoice,
): { sourceId: string; targetId: string } {
  return direction === 'reverse'
    ? { sourceId: targetId, targetId: sourceId }
    : { sourceId, targetId };
}
