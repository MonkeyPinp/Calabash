import { memo } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps, type Position } from '@xyflow/react';
import type { CertaintyLevel, RelationshipType, Relationship } from '@/types';
import { cycleCertainty } from '@/lib/certainty';
import { updateRelationship } from '@/db/relationships';
import { useGraphStore } from '@/stores/graphStore';
import { useT } from '@/i18n';
import { formatRelationshipType, getRelationshipTypeCssVar } from '@/lib/relationshipTypes';

export interface RelationshipEdgeData {
  certainty: CertaintyLevel;
  type?: RelationshipType;
  relationship: Relationship;
  pathOffset?: number;
}

const BADGE: Record<CertaintyLevel, string> = { confirmed: '✓', suspected: '?', disproven: '✗' };

const CERTAINTY_STYLE: Record<CertaintyLevel, { strokeDasharray: string; opacity: number }> = {
  confirmed: { strokeDasharray: '0',   opacity: 1   },
  suspected: { strokeDasharray: '6 4', opacity: 0.8 },
  disproven: { strokeDasharray: '4 4', opacity: 0.4 },
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
  const t = useT();
  const data = props.data as unknown as RelationshipEdgeData;
  const fullRel = data.relationship;
  const rawOffset = data.pathOffset ?? 0;
  // Offsets are assigned within an undirected pair; reverse local sign for B -> A
  // so opposite-direction parallel relationships do not collapse onto one curve.
  const offset = fullRel.sourceId <= fullRel.targetId ? rawOffset : -rawOffset;
  const stroke = getRelationshipTypeCssVar(data.type);
  const { strokeDasharray, opacity } = CERTAINTY_STYLE[data.certainty];
  const displayLabel = fullRel?.label?.trim() || formatRelationshipType(data.type, t) || t('app.inspectRelationship');
  const labelTextDecoration = data.certainty === 'disproven' ? 'line-through' : 'none';

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
            userSelect: 'none',
          }}
        >
          <div
            data-testid="certainty-badge"
            onClick={(event) => void handleBadgeClick(event)}
            style={{
              pointerEvents: 'all',
              cursor: 'pointer',
              background: 'var(--bg-panel)',
              color: stroke,
              display: 'inline-flex',
              alignItems: 'flex-start',
              gap: 4,
              minHeight: 20,
              maxWidth: 320,
              padding: '3px 7px',
              fontFamily: 'var(--font-case-title)',
              fontSize: 11,
              fontStyle: 'italic',
              fontWeight: 500,
              lineHeight: 1.2,
              whiteSpace: 'normal',
              overflow: 'visible',
              overflowWrap: 'anywhere',
              textDecoration: labelTextDecoration,
              textDecorationColor: 'color-mix(in srgb, currentColor 55%, transparent)',
              borderRadius: 3,
              transition: 'background var(--transition-fast), transform 0.12s ease',
            }}
            title="Click to cycle certainty"
          >
            <span
              aria-hidden="true"
              style={{
                width: 12,
                height: 12,
                flexShrink: 0,
                borderRadius: 999,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 1,
                border: `1px solid color-mix(in srgb, ${stroke} 70%, transparent)`,
                fontFamily: 'var(--font-mono)',
                fontSize: 7,
                fontStyle: 'normal',
                fontWeight: 700,
                lineHeight: 1,
              }}
            >
              {BADGE[data.certainty]}
            </span>
            <span style={{ minWidth: 0, maxWidth: 292, overflowWrap: 'anywhere' }}>
              {displayLabel}
            </span>
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export default memo(RelationshipEdgeImpl);
