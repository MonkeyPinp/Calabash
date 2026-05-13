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

const ROLE_LABEL: Record<CharacterRole, string> = {
  detective:  'Detective',
  suspect:    'Suspect',
  victim:     'Victim',
  witness:    'Witness',
  bystander:  'Bystander',
  other:      'Other',
};

function CharacterNodeImpl(props: NodeProps) {
  const data    = props.data as unknown as CharacterNodeData;
  const sel     = props.selected ?? false;
  const roleVar = `var(--node-${data.role})`;
  const portraitUrl = usePortraitUrl(data.portraitId);

  const initial = data.name.trim().charAt(0).toUpperCase();

  return (
    <div
      data-testid="character-node"
      className="group"
      style={{
        background: 'var(--bg-panel)',
        border: `1.5px solid ${sel ? roleVar : 'var(--border)'}`,
        borderRadius: 10,
        minWidth: 170,
        maxWidth: 220,
        overflow: 'hidden',
        boxShadow: sel ? 'var(--shadow-node-selected)' : 'var(--shadow-node)',
        transition: 'box-shadow var(--transition-node), border-color var(--transition-node)',
        cursor: 'default',
      } as React.CSSProperties}
    >
      {/* Role-colour top bar */}
      <div style={{ height: 3, background: roleVar }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px 10px' }}>
        {/* Avatar — portrait or initial */}
        {portraitUrl ? (
          <img
            src={portraitUrl}
            alt=""
            style={{
              width: 36, height: 36, borderRadius: '50%',
              objectFit: 'cover', flexShrink: 0,
              border: `2px solid ${roleVar}`,
            }}
          />
        ) : (
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `color-mix(in srgb, ${roleVar} 14%, var(--bg-canvas))`,
            border: `1.5px solid color-mix(in srgb, ${roleVar} 45%, transparent)`,
            fontSize: 15, fontWeight: 700, color: roleVar,
            userSelect: 'none',
          }}>
            {initial}
          </div>
        )}

        {/* Text block */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13, fontWeight: 700,
            color: 'var(--fg-primary)', lineHeight: 1.25,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {data.name}
          </div>

          {data.profession && (
            <div style={{
              fontSize: 11, color: 'var(--fg-muted)', marginTop: 1,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {data.profession}
            </div>
          )}

          <div style={{
            display: 'inline-flex', alignItems: 'center',
            marginTop: 4, padding: '1px 5px',
            background: `color-mix(in srgb, ${roleVar} 12%, var(--bg-canvas))`,
            border: `1px solid color-mix(in srgb, ${roleVar} 30%, transparent)`,
            borderRadius: 4,
            fontSize: 9, fontWeight: 700, letterSpacing: '0.07em',
            textTransform: 'uppercase' as const,
            color: roleVar,
          }}>
            {ROLE_LABEL[data.role]}
          </div>
        </div>
      </div>

      {/* Handles — all four sides, hidden at rest, visible on hover/selected */}
      {(
        [
          { type: 'target' as const, pos: Position.Top,    id: 't-top'    },
          { type: 'source' as const, pos: Position.Bottom, id: 's-bottom' },
          { type: 'target' as const, pos: Position.Left,   id: 't-left'   },
          { type: 'source' as const, pos: Position.Right,  id: 's-right'  },
        ] as const
      ).map(({ type, pos, id }) => (
        <Handle
          key={id}
          id={id}
          type={type}
          position={pos}
          className={`${sel ? '' : 'opacity-0'} group-hover:opacity-100 transition-opacity`}
          style={{
            width: 10, height: 10,
            background: 'var(--bg-panel)',
            border: `2px solid ${roleVar}`,
          }}
        />
      ))}
    </div>
  );
}

export default memo(CharacterNodeImpl);
