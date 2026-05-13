import { memo } from 'react';
import { BaseEdge, EdgeLabelRenderer, getStraightPath, type EdgeProps } from '@xyflow/react';
import type { CertaintyLevel, RelationshipType } from '@/types';
import { isDirected } from '@/lib/relationshipTypes';

export interface RelationshipEdgeData {
  certainty: CertaintyLevel;
  type: RelationshipType;
}

const BADGE_TEXT: Record<CertaintyLevel, string> = {
  confirmed: '✓',
  suspected: '?',
  disproven: '✗',
};

const EDGE_STYLE: Record<CertaintyLevel, { stroke: string; strokeDasharray: string; opacity: number }> = {
  confirmed: { stroke: 'var(--edge-confirmed)', strokeDasharray: '0',   opacity: 1   },
  suspected: { stroke: 'var(--edge-suspected)', strokeDasharray: '6 4', opacity: 0.8 },
  disproven: { stroke: 'var(--edge-disproven)', strokeDasharray: '6 4', opacity: 0.4 },
};

function RelationshipEdgeImpl(props: EdgeProps) {
  const data = props.data as unknown as RelationshipEdgeData;
  const [pathD, labelX, labelY] = getStraightPath({
    sourceX: props.sourceX, sourceY: props.sourceY,
    targetX: props.targetX, targetY: props.targetY,
  });
  const style = EDGE_STYLE[data.certainty];
  const markerEnd = isDirected(data.type) ? 'url(#arrow)' : undefined;

  return (
    <>
      <BaseEdge
        id={props.id}
        path={pathD}
        markerEnd={markerEnd}
        style={{
          stroke: style.stroke,
          strokeDasharray: style.strokeDasharray,
          opacity: style.opacity,
          strokeWidth: 2,
        }}
      />
      <EdgeLabelRenderer>
        <div
          data-testid="certainty-badge"
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            background: 'var(--bg-panel)',
            border: '1px solid var(--border)',
            color: 'var(--fg-primary)',
            borderRadius: '50%',
            width: 24,
            height: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            pointerEvents: 'all',
            cursor: 'pointer',
          }}
        >
          {BADGE_TEXT[data.certainty]}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export default memo(RelationshipEdgeImpl);
