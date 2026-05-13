import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { CharacterRole } from '@/types';

export interface CharacterNodeData {
  name: string;
  role: CharacterRole;
}

function CharacterNodeImpl(props: NodeProps) {
  const data = props.data as unknown as CharacterNodeData;
  const roleVar = `var(--node-${data.role})`;
  return (
    <div
      data-testid="character-node"
      className="group relative"
      style={{
        background: 'var(--bg-panel)',
        color: 'var(--fg-primary)',
        border: `2px solid var(--node-${data.role})`,
        borderRadius: 8,
        minWidth: 140,
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        overflow: 'hidden',
      } as React.CSSProperties}
    >
      {/* Top colour bar */}
      <div
        style={{
          height: 4,
          background: roleVar,
        }}
      />

      {/* Card body */}
      <div style={{ padding: '6px 14px 10px' }}>
        {/* Role badge */}
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase' as const,
            color: roleVar,
            marginBottom: 4,
          }}
        >
          {data.role}
        </div>

        {/* Character name */}
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--fg-primary)',
          }}
        >
          {data.name}
        </div>
      </div>

      {/* Handles — hidden by default, visible on hover via group */}
      <Handle
        type="target"
        position={Position.Top}
        className="opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: 'var(--accent)', width: 14, height: 14 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: 'var(--accent)', width: 14, height: 14 }}
      />
    </div>
  );
}

export default memo(CharacterNodeImpl);
