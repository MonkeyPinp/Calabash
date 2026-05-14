import { memo } from 'react';
import { NodeResizer, type NodeProps } from '@xyflow/react';
import type { GroupRange } from '@/types';
import { updateGroupRange } from '@/db/groupRanges';
import { GROUP_RANGE_COLOR_MAP } from '@/lib/groupRanges';
import { useGraphStore } from '@/stores/graphStore';

export interface GroupRangeNodeData {
  range: GroupRange;
}

function GroupRangeNodeImpl(props: NodeProps) {
  const data = props.data as unknown as GroupRangeNodeData;
  const range = data.range;
  const selected = props.selected ?? false;
  const colors = GROUP_RANGE_COLOR_MAP[range.color];

  const updateGroupRangeInStore = useGraphStore((s) => s.updateGroupRangeInStore);
  const pushUndo = useGraphStore((s) => s.pushUndo);

  async function handleResizeEnd(_: unknown, params: { width: number; height: number }) {
    const oldWidth = range.width;
    const oldHeight = range.height;
    const width = Math.max(160, Math.round(params.width));
    const height = Math.max(120, Math.round(params.height));
    if (oldWidth === width && oldHeight === height) return;

    const updated = await updateGroupRange(range.id, { width, height });
    updateGroupRangeInStore(updated);
    pushUndo(
      async () => {
        const restored = await updateGroupRange(range.id, { width: oldWidth, height: oldHeight });
        updateGroupRangeInStore(restored);
      },
      async () => {
        const redone = await updateGroupRange(range.id, { width, height });
        updateGroupRangeInStore(redone);
      },
    );
  }

  return (
    <>
      <NodeResizer
        minWidth={160}
        minHeight={120}
        isVisible={selected}
        lineStyle={{ borderColor: colors.border, borderWidth: 1.5, borderStyle: 'dashed' }}
        handleStyle={{ width: 9, height: 9, background: colors.border, borderRadius: 999 }}
        onResizeEnd={handleResizeEnd}
      />
      <div
        data-testid="group-range-node"
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
          cursor: 'grab',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: 16,
            transform: 'translateX(-50%)',
            maxWidth: '70%',
            padding: '3px 9px',
            borderRadius: 999,
            border: `1px solid color-mix(in srgb, ${colors.border} 58%, transparent)`,
            background: 'color-mix(in srgb, var(--bg-panel) 82%, transparent)',
            color: colors.text,
            fontFamily: 'var(--font-case-title)',
            fontSize: 12,
            fontWeight: 600,
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            pointerEvents: 'none',
            boxShadow: '0 1px 3px rgba(40, 28, 12, 0.10)',
          }}
          title={range.label}
        >
          {range.label}
        </div>
      </div>
    </>
  );
}

export default memo(GroupRangeNodeImpl);
