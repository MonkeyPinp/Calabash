// v3 — getBezierPath + MarkerType
import { memo } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps, type Position } from '@xyflow/react';
import type { CertaintyLevel, RelationshipType, Relationship } from '@/types';
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

// Must stay in sync with EDGE_COLOR in CalabashCanvas (both reference themes.css vars)
const TYPE_COLOR: Record<RelationshipType, string> = {
  family:       'var(--rel-family)',
  professional: 'var(--rel-professional)',
  romantic:     'var(--rel-romantic)',
  hostile:      'var(--rel-hostile)',
  suspicion:    'var(--rel-suspicion)',
  other:        'var(--rel-other)',
};

/**
 * Compute a cubic bezier path using React Flow's getBezierPath, but offset the
 * two control points perpendicularly so parallel edges fan out to opposite sides.
 * Source and target endpoints stay at the original node handles so the marker
 * arrow is anchored correctly.
 */
function getEdgePath(
  sourceX: number, sourceY: number, sourcePosition: Position,
  targetX: number, targetY: number, targetPosition: Position,
  offset: number,
): [path: string, labelX: number, labelY: number] {
  const [basePath] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  });

  if (offset === 0) {
    // Re-use getBezierPath result directly — nice natural curve, label at midpoint.
    const [p, lx, ly] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
    return [p, lx, ly];
  }

  // Parse cubic bezier output: "M sx,sy C c1x,c1y c2x,c2y tx,ty"
  const m = basePath.match(/M ([\d.-]+),([\d.-]+) C ([\d.-]+),([\d.-]+) ([\d.-]+),([\d.-]+) ([\d.-]+),([\d.-]+)/);
  if (!m) {
    const [p, lx, ly] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
    return [p, lx, ly];
  }

  // Perpendicular unit vector to the straight-line direction
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const ox = (-dy / len) * offset;
  const oy = (dx / len) * offset;

  // Offset only the control points — source & target stay at node handles
  const c1x = parseFloat(m[3]) + ox;
  const c1y = parseFloat(m[4]) + oy;
  const c2x = parseFloat(m[5]) + ox;
  const c2y = parseFloat(m[6]) + oy;

  const path = `M ${sourceX},${sourceY} C ${c1x},${c1y} ${c2x},${c2y} ${targetX},${targetY}`;
  // Label at cubic bezier midpoint (t=0.5): (s + 3c1 + 3c2 + t) / 8
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

  async function handleBadgeClick() {
    // No stopPropagation — the click also reaches the edge SVG path so React Flow
    // selects the edge and opens RelationshipInspector at the same time.
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
        markerEnd={props.markerEnd}
        interactionWidth={40}
        style={{ stroke, strokeDasharray, opacity, strokeWidth: 2 }}
      />
      <EdgeLabelRenderer>
        {/* Container: pointerEvents none — edge body behind it stays clickable */}
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
          {/* Badge: only interactive element — click cycles certainty */}
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
              width: 20,
              height: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            {BADGE[data.certainty]}
          </div>

          {/* Type pill — display only */}
          <div style={{
            background: 'var(--bg-panel)',
            border: `1px solid ${stroke}`,
            borderRadius: 10,
            padding: '1px 6px',
            fontSize: 10,
            color: stroke,
            whiteSpace: 'nowrap',
            maxWidth: 100,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            fontWeight: 500,
            opacity: 0.9,
          }}>
            {displayLabel}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export default memo(RelationshipEdgeImpl);
