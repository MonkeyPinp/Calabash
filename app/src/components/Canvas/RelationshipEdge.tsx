import { memo } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, MarkerType, type EdgeProps, type Position } from '@xyflow/react';
import type { CertaintyLevel, RelationshipDirection, RelationshipType, Relationship } from '@/types';
import { isDirected } from '@/lib/relationshipTypes';
import { cycleCertainty } from '@/lib/certainty';
import { updateRelationship } from '@/db/relationships';
import { useGraphStore } from '@/stores/graphStore';

export interface RelationshipEdgeData {
  certainty: CertaintyLevel;
  type: RelationshipType;
  relationship: Relationship;
  pathOffset?: number;
}

const BADGE: Record<CertaintyLevel, string> = { confirmed: '✓', suspected: '?', disproven: '✗' };

const CERTAINTY_STYLE: Record<CertaintyLevel, { strokeDasharray: string; opacity: number }> = {
  confirmed: { strokeDasharray: '0',   opacity: 1   },
  suspected: { strokeDasharray: '6 4', opacity: 0.8 },
  disproven: { strokeDasharray: '4 4', opacity: 0.4 },
};

const TYPE_COLOR: Record<RelationshipType, string> = {
  family:       'var(--rel-family)',
  professional: 'var(--rel-professional)',
  romantic:     'var(--rel-romantic)',
  hostile:      'var(--rel-hostile)',
  suspicion:    'var(--rel-suspicion)',
  other:        'var(--rel-other)',
};

// Hex values must stay in sync with themes.css / EDGE_COLOR in CalabashCanvas
const TYPE_HEX: Record<RelationshipType, string> = {
  family:       '#b06820',
  professional: '#2c6080',
  romantic:     '#a83870',
  hostile:      '#b02020',
  suspicion:    '#9a7010',
  other:        '#707070',
};

function resolveMarkers(rel: Relationship): { markerStart?: string; markerEnd?: string } {
  const hex = TYPE_HEX[rel.type];
  const arrowClosed = { type: MarkerType.ArrowClosed, color: hex, width: 14, height: 14 };
  const arrowOpen   = { type: MarkerType.Arrow,       color: hex, width: 14, height: 14 };

  const dir: RelationshipDirection = rel.direction ??
    (isDirected(rel.type) ? 'forward' : 'none');

  // Convert to the URL strings React Flow expects on BaseEdge.
  // Since we're inside a custom edge component, we build them inline using
  // the same ID scheme React Flow generates: react-flow__<type>-<color>
  // In practice we return marker objects that CalabashCanvas already set via
  // the edge object's markerEnd; here we just control markerStart as well.
  switch (dir) {
    case 'forward':  return { markerEnd:   `url(#${arrowClosed.type}-${hex})` };
    case 'backward': return { markerStart: `url(#${arrowClosed.type}-${hex})` };
    case 'both':     return {
      markerEnd:   `url(#${arrowClosed.type}-${hex})`,
      markerStart: `url(#${arrowClosed.type}-${hex})`,
    };
    case 'none':     return { markerEnd: `url(#${arrowOpen.type}-${hex})` };
    default:         return {};
  }
}

/**
 * Compute a cubic bezier path whose CONTROL POINTS are shifted perpendicularly
 * to fan parallel edges apart. Source and target stay at the node handles so
 * markers anchor correctly.
 *
 * Regex is lenient: handles "M-190,161" (no space after M) and negative floats.
 */
function getEdgePath(
  sourceX: number, sourceY: number, sourcePosition: Position,
  targetX: number, targetY: number, targetPosition: Position,
  offset: number,
): [path: string, labelX: number, labelY: number] {
  const [basePath, baseLX, baseLY] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  });

  if (offset === 0) return [basePath, baseLX, baseLY];

  // React Flow outputs e.g. "M-190.69,161.30 C-190.69,219.36 353.5,16.94 353.5,75"
  // Regex: optional space after M, allow negative numbers
  const m = basePath.match(
    /M\s*([-\d.]+),([-\d.]+)\s+C\s*([-\d.]+),([-\d.]+)\s+([-\d.]+),([-\d.]+)\s+([-\d.]+),([-\d.]+)/,
  );
  if (!m) return [basePath, baseLX, baseLY];

  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const ox = (-dy / len) * offset;
  const oy = (dx / len) * offset;

  const c1x = parseFloat(m[3]) + ox, c1y = parseFloat(m[4]) + oy;
  const c2x = parseFloat(m[5]) + ox, c2y = parseFloat(m[6]) + oy;

  const path = `M ${sourceX},${sourceY} C ${c1x},${c1y} ${c2x},${c2y} ${targetX},${targetY}`;
  // Cubic bezier midpoint t=0.5: (s + 3c1 + 3c2 + t) / 8
  const labelX = (sourceX + 3 * c1x + 3 * c2x + targetX) / 8;
  const labelY = (sourceY + 3 * c1y + 3 * c2y + targetY) / 8;
  return [path, labelX, labelY];
}

function RelationshipEdgeImpl(props: EdgeProps) {
  const data = props.data as unknown as RelationshipEdgeData;
  const offset = data.pathOffset ?? 0;
  const stroke = TYPE_COLOR[data.type];
  const { strokeDasharray, opacity } = CERTAINTY_STYLE[data.certainty];
  const fullRel = data.relationship;
  const displayLabel = fullRel?.label?.trim() || data.type;

  const [pathD, labelX, labelY] = getEdgePath(
    props.sourceX, props.sourceY, props.sourcePosition,
    props.targetX, props.targetY, props.targetPosition,
    offset,
  );

  // Use direction from data model; fall back to type-derived direction
  const { markerStart, markerEnd } = resolveMarkers(fullRel ?? { type: data.type } as Relationship);

  async function handleBadgeClick() {
    if (!fullRel) return;
    const next = cycleCertainty(data.certainty);
    await updateRelationship(props.id, { certainty: next });
    useGraphStore.getState().updateRelationshipInStore({ ...fullRel, certainty: next });
  }

  return (
    <>
      <BaseEdge
        id={props.id}
        path={pathD}
        markerStart={markerStart}
        markerEnd={markerEnd ?? props.markerEnd}
        interactionWidth={40}
        style={{ stroke, strokeDasharray, opacity, strokeWidth: 2 }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%,-50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 3,
            userSelect: 'none',
          }}
        >
          <div
            data-testid="certainty-badge"
            onClick={() => void handleBadgeClick()}
            style={{
              pointerEvents: 'all',
              cursor: 'pointer',
              background: 'var(--bg-panel)',
              border: `1.5px solid ${stroke}`,
              color: stroke,
              borderRadius: '50%',
              width: 20, height: 20,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700,
            }}
          >
            {BADGE[data.certainty]}
          </div>
          <div style={{
            background: 'var(--bg-panel)',
            border: `1px solid ${stroke}`,
            borderRadius: 10,
            padding: '1px 6px',
            fontSize: 10, color: stroke,
            whiteSpace: 'nowrap', maxWidth: 100,
            overflow: 'hidden', textOverflow: 'ellipsis',
            fontWeight: 500, opacity: 0.9,
          }}>
            {displayLabel}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export default memo(RelationshipEdgeImpl);
