import { memo } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from '@xyflow/react';
import type { CertaintyLevel, RelationshipType, Relationship } from '@/types';
import { isDirected } from '@/lib/relationshipTypes';
import { cycleCertainty } from '@/lib/certainty';
import { updateRelationship } from '@/db/relationships';
import { useGraphStore } from '@/stores/graphStore';

export interface RelationshipEdgeData {
  certainty: CertaintyLevel;
  type: RelationshipType;
  relationship: Relationship;
  curvature?: number;
}

const BADGE: Record<CertaintyLevel, string> = { confirmed: '✓', suspected: '?', disproven: '✗' };

// Certainty controls dash pattern + opacity
const CERTAINTY_STYLE: Record<CertaintyLevel, { strokeDasharray: string; opacity: number }> = {
  confirmed: { strokeDasharray: '0',   opacity: 1   },
  suspected: { strokeDasharray: '6 4', opacity: 0.8 },
  disproven: { strokeDasharray: '4 4', opacity: 0.4 },
};

// Type drives the stroke colour
const TYPE_COLOR: Record<RelationshipType, string> = {
  family:       'var(--rel-family)',
  professional: 'var(--rel-professional)',
  romantic:     'var(--rel-romantic)',
  hostile:      'var(--rel-hostile)',
  suspicion:    'var(--rel-suspicion)',
  other:        'var(--rel-other)',
};

function RelationshipEdgeImpl(props: EdgeProps) {
  const data = props.data as unknown as RelationshipEdgeData;
  const curvature = data.curvature ?? 0.25;

  const [pathD, labelX, labelY] = getBezierPath({
    sourceX: props.sourceX, sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX, targetY: props.targetY,
    targetPosition: props.targetPosition,
    curvature,
  });

  const { strokeDasharray, opacity } = CERTAINTY_STYLE[data.certainty];
  const stroke = TYPE_COLOR[data.type];
  // All edges show an arrow; directed types get a filled arrow, symmetric get an open one
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
        <div
          data-testid="certainty-badge"
          onClick={handleBadgeClick}
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 3,
            userSelect: 'none',
          }}
        >
          {/* Certainty circle */}
          <div style={{
            background: 'var(--bg-panel)',
            border: `1px solid ${stroke}`,
            color: stroke,
            borderRadius: '50%',
            width: 22, height: 22,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700,
          }}>
            {BADGE[data.certainty]}
          </div>

          {/* Type / label pill — coloured to match edge */}
          <div style={{
            background: 'var(--bg-panel)',
            border: `1px solid ${stroke}`,
            borderRadius: 10,
            padding: '1px 7px',
            fontSize: 10,
            color: stroke,
            whiteSpace: 'nowrap',
            maxWidth: 110,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            fontWeight: 500,
          }}>
            {displayLabel}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export default memo(RelationshipEdgeImpl);
