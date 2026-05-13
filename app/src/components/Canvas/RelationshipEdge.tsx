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
}

const BADGE: Record<CertaintyLevel, string> = { confirmed: '✓', suspected: '?', disproven: '✗' };

const EDGE_STYLE: Record<CertaintyLevel, { stroke: string; strokeDasharray: string; opacity: number }> = {
  confirmed: { stroke: 'var(--edge-confirmed)', strokeDasharray: '0',   opacity: 1   },
  suspected: { stroke: 'var(--edge-suspected)', strokeDasharray: '6 4', opacity: 0.8 },
  disproven: { stroke: 'var(--edge-disproven)', strokeDasharray: '6 4', opacity: 0.4 },
};

function RelationshipEdgeImpl(props: EdgeProps) {
  const data = props.data as unknown as RelationshipEdgeData;
  const [pathD, labelX, labelY] = getBezierPath({
    sourceX: props.sourceX, sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX, targetY: props.targetY,
    targetPosition: props.targetPosition,
  });
  const style = EDGE_STYLE[data.certainty];
  const markerEnd = isDirected(data.type) ? 'url(#arrow)' : undefined;
  const fullRel = data.relationship;

  // Display text: custom label takes priority over type name
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
        style={{
          stroke: style.stroke,
          strokeDasharray: style.strokeDasharray,
          opacity: style.opacity,
          strokeWidth: 2,
        }}
      />
      <EdgeLabelRenderer>
        {/* Certainty badge — click cycles certainty */}
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
          {/* Badge circle */}
          <div style={{
            background: 'var(--bg-panel)',
            border: '1px solid var(--border)',
            color: 'var(--fg-primary)',
            borderRadius: '50%',
            width: 22,
            height: 22,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 600,
          }}>
            {BADGE[data.certainty]}
          </div>

          {/* Relationship type / label pill */}
          <div style={{
            background: 'var(--bg-panel)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '1px 7px',
            fontSize: 10,
            color: 'var(--fg-muted)',
            whiteSpace: 'nowrap',
            maxWidth: 120,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {displayLabel}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export default memo(RelationshipEdgeImpl);
