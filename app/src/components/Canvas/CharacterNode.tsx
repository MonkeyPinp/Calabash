import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { CharacterRole } from '@/types';
import { usePortraitUrl } from '@/hooks/usePortraitUrl';

export interface CharacterNodeData {
  name: string;
  role: CharacterRole;
  profession?: string;
  portraitId?: string;
}

function CharacterNodeImpl(props: NodeProps) {
  const data = props.data as unknown as CharacterNodeData;
  const roleVar = `var(--node-${data.role})`;
  const portraitUrl = usePortraitUrl(data.portraitId);

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
      <div style={{ height: 4, background: roleVar }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 10px 10px' }}>
        {/* Portrait thumbnail */}
        {portraitUrl && (
          <img
            src={portraitUrl}
            alt=""
            style={{
              width: 36,
              height: 36,
              borderRadius: 4,
              objectFit: 'cover',
              flexShrink: 0,
              border: '1px solid var(--border)',
              marginTop: 2,
            }}
          />
        )}

        {/* Text content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Role badge */}
          <div style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase' as const,
            color: roleVar,
            marginBottom: 2,
          }}>
            {data.role}
          </div>

          {/* Character name */}
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-primary)', lineHeight: 1.2 }}>
            {data.name}
          </div>

          {/* Occupation / profession */}
          {data.profession && (
            <div style={{
              fontSize: 11,
              color: 'var(--fg-muted)',
              marginTop: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {data.profession}
            </div>
          )}
        </div>
      </div>

      {/* Connection handles — hidden at rest, visible on hover */}
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
