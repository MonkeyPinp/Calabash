import { memo, useEffect, useRef, useState } from 'react';
import { NodeResizer, type NodeProps, type ResizeParams } from '@xyflow/react';
import { Lock } from 'lucide-react';
import type { GroupRange } from '@/types';
import { updateGroupRange } from '@/db/groupRanges';
import {
  getGroupRangeDisplayTag,
  GROUP_RANGE_COLOR_MAP,
  normalizeGroupRangeLabelFontSize,
  normalizeGroupRangeLabelPosition,
} from '@/lib/groupRanges';
import { useGraphStore } from '@/stores/graphStore';

export interface GroupRangeNodeData {
  range: GroupRange;
}

function GroupRangeNodeImpl(props: NodeProps) {
  const data = props.data as unknown as GroupRangeNodeData;
  const range = data.range;
  const selected = props.selected ?? false;
  const colors = GROUP_RANGE_COLOR_MAP[range.color];
  const displayTag = getGroupRangeDisplayTag(range);
  const labelFontSize = normalizeGroupRangeLabelFontSize(range.labelFontSize);
  const normalizedLabelPosition = normalizeGroupRangeLabelPosition(range.labelPosition);
  const [draftLabelPosition, setDraftLabelPosition] = useState(normalizedLabelPosition);
  const nodeRef = useRef<HTMLDivElement>(null);
  const labelDragStartRef = useRef<{ x: number; y: number } | null>(null);
  const labelPointerOffsetRef = useRef({ x: 0, y: 0 });
  const latestLabelPositionRef = useRef(normalizedLabelPosition);

  const updateGroupRangeInStore = useGraphStore((s) => s.updateGroupRangeInStore);
  const pushUndo = useGraphStore((s) => s.pushUndo);

  useEffect(() => {
    setDraftLabelPosition(normalizedLabelPosition);
    latestLabelPositionRef.current = normalizedLabelPosition;
  }, [range.id, normalizedLabelPosition.x, normalizedLabelPosition.y]);

  function readPointerPosition(e: React.PointerEvent): { x: number; y: number } {
    const bounds = nodeRef.current?.getBoundingClientRect();
    if (!bounds || bounds.width <= 0 || bounds.height <= 0) return latestLabelPositionRef.current;
    return {
      x: (e.clientX - bounds.left) / bounds.width,
      y: (e.clientY - bounds.top) / bounds.height,
    };
  }

  function readLabelPosition(e: React.PointerEvent): { x: number; y: number } {
    const pointer = readPointerPosition(e);
    return normalizeGroupRangeLabelPosition({
      x: pointer.x - labelPointerOffsetRef.current.x,
      y: pointer.y - labelPointerOffsetRef.current.y,
    });
  }

  function applyDraftLabelPosition(position: { x: number; y: number }) {
    latestLabelPositionRef.current = position;
    setDraftLabelPosition(position);
  }

  function handleLabelPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (range.locked) return;
    if (e.button !== 0) return;
    e.stopPropagation();
    labelDragStartRef.current = normalizedLabelPosition;
    const pointer = readPointerPosition(e);
    labelPointerOffsetRef.current = {
      x: pointer.x - normalizedLabelPosition.x,
      y: pointer.y - normalizedLabelPosition.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    applyDraftLabelPosition(normalizedLabelPosition);
  }

  function handleLabelPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!labelDragStartRef.current) return;
    e.stopPropagation();
    applyDraftLabelPosition(readLabelPosition(e));
  }

  function handleLabelPointerCancel(e: React.PointerEvent<HTMLDivElement>) {
    e.stopPropagation();
    labelDragStartRef.current = null;
    applyDraftLabelPosition(normalizedLabelPosition);
  }

  async function persistLabelPosition(before: { x: number; y: number }, after: { x: number; y: number }) {
    if (before.x === after.x && before.y === after.y) return;
    const updated = await updateGroupRange(range.id, { labelPosition: after });
    updateGroupRangeInStore(updated);
    pushUndo(
      async () => {
        const restored = await updateGroupRange(range.id, { labelPosition: before });
        updateGroupRangeInStore(restored);
      },
      async () => {
        const redone = await updateGroupRange(range.id, { labelPosition: after });
        updateGroupRangeInStore(redone);
      },
    );
  }

  function handleLabelPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const before = labelDragStartRef.current;
    if (!before) return;
    e.stopPropagation();
    labelDragStartRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    const after = latestLabelPositionRef.current;
    void persistLabelPosition(before, after);
  }

  async function handleResizeEnd(_: unknown, params: ResizeParams) {
    if (range.locked) return;
    const oldPosition = range.position;
    const oldWidth = range.width;
    const oldHeight = range.height;
    const position = { x: Math.round(params.x), y: Math.round(params.y) };
    const width = Math.max(160, Math.round(params.width));
    const height = Math.max(120, Math.round(params.height));
    const positionChanged = oldPosition.x !== position.x || oldPosition.y !== position.y;
    if (!positionChanged && oldWidth === width && oldHeight === height) return;

    const updated = await updateGroupRange(range.id, { position, width, height });
    updateGroupRangeInStore(updated);
    pushUndo(
      async () => {
        const restored = await updateGroupRange(range.id, {
          position: oldPosition,
          width: oldWidth,
          height: oldHeight,
        });
        updateGroupRangeInStore(restored);
      },
      async () => {
        const redone = await updateGroupRange(range.id, { position, width, height });
        updateGroupRangeInStore(redone);
      },
    );
  }

  return (
    <>
      <NodeResizer
        minWidth={160}
        minHeight={120}
        isVisible={selected && !range.locked}
        lineStyle={{ borderColor: colors.border, borderWidth: 1.5, borderStyle: 'dashed' }}
        handleStyle={{ width: 9, height: 9, background: colors.border, borderRadius: 999 }}
        onResizeEnd={handleResizeEnd}
      />
      <div
        ref={nodeRef}
        data-testid="group-range-node"
        className={range.locked ? 'nopan' : undefined}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 999,
          background: colors.fill,
          border: `2px ${selected ? 'solid' : 'dashed'} ${colors.border}`,
          boxShadow: selected
            ? `0 0 0 2px color-mix(in srgb, ${colors.border} 22%, transparent)`
            : 'none',
          boxSizing: 'border-box',
          position: 'relative',
          overflow: 'visible',
          cursor: range.locked ? 'default' : 'grab',
        }}
      >
        {range.locked && (
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: 28,
              bottom: 18,
              width: 22,
              height: 22,
              display: 'grid',
              placeItems: 'center',
              borderRadius: 999,
              border: `1px solid color-mix(in srgb, ${colors.border} 58%, transparent)`,
              background: 'color-mix(in srgb, var(--bg-panel) 82%, transparent)',
              color: colors.text,
              boxShadow: '0 1px 2px rgba(40, 28, 12, 0.10)',
              pointerEvents: 'none',
            }}
          >
            <Lock size={11} />
          </div>
        )}
        <div
          className="nodrag nopan"
          data-testid="group-range-label"
          onPointerDown={handleLabelPointerDown}
          onPointerMove={handleLabelPointerMove}
          onPointerUp={handleLabelPointerUp}
          onPointerCancel={handleLabelPointerCancel}
          style={{
            position: 'absolute',
            left: `${draftLabelPosition.x * 100}%`,
            top: `${draftLabelPosition.y * 100}%`,
            transform: 'translate(-50%, -50%)',
            maxWidth: '70%',
            padding: '3px 9px',
            borderRadius: 999,
            border: `1px solid color-mix(in srgb, ${colors.border} 58%, transparent)`,
            background: 'color-mix(in srgb, var(--bg-panel) 82%, transparent)',
            color: colors.text,
            fontFamily: 'var(--font-case-title)',
            fontSize: labelFontSize,
            fontWeight: 600,
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            cursor: range.locked ? 'default' : 'move',
            pointerEvents: 'auto',
            userSelect: 'none',
            touchAction: 'none',
            boxShadow: '0 1px 3px rgba(40, 28, 12, 0.10)',
          }}
          title={range.label}
        >
          {range.label}
        </div>
        <div
          title={`Visible from chapter ${range.chapterIntroduced}`}
          style={{
            position: 'absolute',
            right: 28,
            bottom: 18,
            padding: '2px 7px',
            borderRadius: 2,
            border: `1px solid color-mix(in srgb, ${colors.border} 58%, transparent)`,
            background: 'color-mix(in srgb, var(--bg-panel) 78%, transparent)',
            color: colors.text,
            fontFamily: 'var(--font-mono)',
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: 0,
            lineHeight: 1.25,
            pointerEvents: 'none',
            boxShadow: '0 1px 2px rgba(40, 28, 12, 0.10)',
          }}
        >
          {displayTag}
        </div>
      </div>
    </>
  );
}

export default memo(GroupRangeNodeImpl);
