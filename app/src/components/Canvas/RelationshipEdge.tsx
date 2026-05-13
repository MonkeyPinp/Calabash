import { memo } from 'react';
import { BaseEdge, EdgeLabelRenderer, type EdgeProps } from '@xyflow/react';
import type { CertaintyLevel, RelationshipType, Relationship } from '@/types';
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

/**
 * Returns a quadratic bezier path whose midpoint is offset perpendicularly
 * from the straight line between source and target.
 * offset=0 → straight line; offset>0 → bows to the left; offset<0 → bows right.
 */
function getOffsetPath(
  sx: number, sy: number,
  tx: number, ty: number,
  offset: number,
): [path: string, labelX: number, labelY: number] {
  const mx = (sx + tx) / 2;
  const my = (sy + ty) / 2;
  const dx = tx - sx;
  const dy = ty - sy;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  // Perpendicular unit vector (rotate 90° CCW)
  const px = -dy / len;
  const py = dx / len;
  // Control point displaced perpendicularly
  const cx = mx + px * offset;
  const cy = my + py * offset;
  // Label sits at the bezier midpoint: t=0.5 → (s + 2c + t) / 4
  const labelX = (sx + 2 * cx + tx) / 4;
  const labelY = (sy + 2 * cy + ty) / 4;
  return [`M ${sx},${sy} Q ${cx},${cy} ${tx},${ty}`, labelX, labelY];
}

function RelationshipEdgeImpl(props: EdgeProps) {
  const data = props.data as unknown as RelationshipEdgeData;
  const offset = data.pathOffset ?? 0;

  const [pathD, labelX, labelY] = getOffsetPath(
    props.sourceX, props.sourceY,
    props.targetX, props.targetY,
    offset,
  );

  const { strokeDasharray, opacity } = CERTAINTY_STYLE[data.certainty];
  const stroke = TYPE_COLOR[data.type];
  const markerEnd = isDirected(data.type) ? 'url(#arrow)' : 'url(#arrow-open)';
  const fullRel = data.relationship;
  const displayLabel = fullRel?.label?.trim() || data.type;

  async function handleBadgeClick(e: React.MouseEvent) {
    e.stopPropagation();
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
        markerEnd={markerEnd}
        interactionWidth={24}
        style={{ stroke, strokeDasharray, opacity, strokeWidth: 2 }}
      />
      <EdgeLabelRenderer>
        {/*
          Container has pointerEvents:none so the edge body behind it remains
          selectable. Only the badge circle itself captures clicks.
        */}
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 3,
            userSelect: 'none',
          }}
        >
          {/* Badge circle — the ONLY interactive element */}
          <div
            data-testid="certainty-badge"
            onClick={handleBadgeClick}
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

          {/* Type pill — display only, no pointer events */}
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
            opacity: 0.85,
          }}>
            {displayLabel}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export default memo(RelationshipEdgeImpl);
