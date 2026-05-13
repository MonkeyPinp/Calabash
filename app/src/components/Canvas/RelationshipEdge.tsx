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

const TYPE_COLOR: Record<RelationshipType, string> = {
  family:       'var(--rel-family)',
  professional: 'var(--rel-professional)',
  romantic:     'var(--rel-romantic)',
  hostile:      'var(--rel-hostile)',
  suspicion:    'var(--rel-suspicion)',
  other:        'var(--rel-other)',
};

/**
 * Cubic bezier whose control points are shifted perpendicularly to separate
 * parallel edges. Source/target stay at node handles → markers anchor correctly.
 * Regex handles React Flow's format: "M-190.69,161.30 C ..." (no space after M).
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
  const badgeTextDecoration = data.certainty === 'disproven' ? 'line-through' : 'none';

  const [pathD, labelX, labelY] = getEdgePath(
    props.sourceX, props.sourceY, props.sourcePosition,
    props.targetX, props.targetY, props.targetPosition,
    offset,
  );

  async function handleBadgeClick(event: React.MouseEvent<HTMLDivElement>) {
    event.stopPropagation();
    if (!fullRel) return;
    const next = cycleCertainty(data.certainty);
    const updated = await updateRelationship(props.id, { certainty: next });
    const store = useGraphStore.getState();
    store.updateRelationshipInStore(updated);
    store.pushUndo(
      async () => {
        const reverted = await updateRelationship(props.id, { certainty: data.certainty });
        useGraphStore.getState().updateRelationshipInStore(reverted);
      },
      async () => {
        const redone = await updateRelationship(props.id, { certainty: next });
        useGraphStore.getState().updateRelationshipInStore(redone);
      },
    );
  }

  return (
    <>
      {/* CalabashCanvas sets markerEnd as a MarkerType object for directed types;
          React Flow resolves them and passes URL strings via props. */}
      <BaseEdge
        id={props.id}
        path={pathD}
        markerStart={props.markerStart}
        markerEnd={props.markerEnd}
        interactionWidth={40}
        style={{ stroke, strokeDasharray, opacity, strokeWidth: 2 }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%,-50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            userSelect: 'none',
          }}
        >
          <div
            data-testid="certainty-badge"
            onClick={(event) => void handleBadgeClick(event)}
            style={{
              pointerEvents: 'all', cursor: 'pointer',
              background: 'var(--bg-panel)',
              border: `1.5px solid ${stroke}`, color: stroke,
              borderRadius: '50%', width: 16, height: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, fontWeight: 700,
              transition: 'transform 0.12s ease',
              boxShadow: 'var(--shadow-soft)',
              marginRight: -7,
              zIndex: 1,
            }}
          >
            {BADGE[data.certainty]}
          </div>
          <div style={{
            background: 'var(--bg-panel)',
            border: `1px solid ${stroke}`,
            borderRadius: 999,
            padding: '2px 9px 2px 11px',
            fontSize: 10, color: stroke, whiteSpace: 'nowrap',
            maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis',
            fontWeight: 500, letterSpacing: '0.01em',
            textDecoration: badgeTextDecoration,
            boxShadow: 'none',
          }}>
            {displayLabel}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export default memo(RelationshipEdgeImpl);
