import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { CharacterRole } from '@/types';

export interface CharacterNodeData {
  name: string;
  role: CharacterRole;
}

function CharacterNodeImpl(props: NodeProps) {
  const data = props.data as unknown as CharacterNodeData;
  const borderVar = `var(--node-${data.role})`;
  return (
    <div
      data-testid="character-node"
      style={{
        padding: '8px 12px',
        background: 'var(--bg-panel)',
        color: 'var(--fg-primary)',
        border: `2px solid ${borderVar}`,
        borderRadius: 8,
        minWidth: 120,
        textAlign: 'center',
        fontSize: 14,
        '--current-role-color': borderVar,
      } as React.CSSProperties}
    >
      <Handle type="target" position={Position.Top} style={{ background: 'var(--accent)' }} />
      {data.name}
      <Handle type="source" position={Position.Bottom} style={{ background: 'var(--accent)' }} />
    </div>
  );
}

export default memo(CharacterNodeImpl);
