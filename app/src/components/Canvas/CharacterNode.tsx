import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { CharacterRole } from '@/types';
import { usePortraitUrl } from '@/hooks/usePortraitUrl';

export interface CharacterNodeData {
  name: string;
  width?: number;
  role: CharacterRole;
  profession?: string;
  portraitId?: string;
  chapterIntroduced?: number;
}

const ROLE_LABEL: Record<CharacterRole, string> = {
  detective:  'Detective',
  suspect:    'Suspect',
  victim:     'Victim',
  witness:    'Witness',
  bystander:  'Bystander',
  murderer:   'Murderer',
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
        position: 'relative',
        background: 'var(--bg-panel)',
        border: `${sel ? 2 : 1}px solid ${sel ? roleVar : 'var(--ink-200)'}`,
        borderRadius: 6,
        minWidth: 184,
        maxWidth: 320,
        width: data.width ?? 184,
        overflow: 'hidden',
        boxShadow: sel ? `0 0 0 3px color-mix(in srgb, ${roleVar} 18%, transparent), var(--shadow-node)` : 'var(--shadow-node)',
        transition: 'box-shadow var(--transition-node), border-color var(--transition-node)',
        cursor: 'default',
      } as React.CSSProperties}
    >
      {/* Role-colour left ribbon */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: roleVar }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 10px 8px 14px' }}>
        {/* Avatar — portrait or initial */}
        {portraitUrl ? (
          <img
            src={portraitUrl}
            alt=""
            style={{
              width: 32, height: 32, borderRadius: '50%',
              objectFit: 'cover', flexShrink: 0,
              border: `1px solid color-mix(in srgb, ${roleVar} 38%, transparent)`,
            }}
          />
        ) : (
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `color-mix(in srgb, ${roleVar} 14%, var(--bg-canvas))`,
            border: `1px solid color-mix(in srgb, ${roleVar} 38%, transparent)`,
            fontFamily: 'var(--font-display)',
            fontSize: 16, fontWeight: 600, letterSpacing: '0.02em', color: roleVar,
            userSelect: 'none',
          }}>
            {initial}
          </div>
        )}

        {/* Text block */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: 14, fontWeight: 500,
            color: 'var(--ink-900)', lineHeight: 1.15,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            paddingRight: 2,
          }}>
            {data.name}
          </div>

          {data.profession && (
            <div style={{
              fontSize: 10.5, color: 'var(--ink-500)', marginTop: 2,
              lineHeight: 1.25,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {data.profession}
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '0 10px 8px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span
          style={{
            fontSize: 9,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            fontWeight: 600,
            color: roleVar,
          }}
        >
          {ROLE_LABEL[data.role]}
        </span>
        {data.chapterIntroduced !== undefined && (
          <span
            title={`Introduced ch. ${data.chapterIntroduced}`}
            style={{
              marginLeft: 'auto',
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              color: 'var(--ink-400)',
              letterSpacing: '0.04em',
              textTransform: 'lowercase',
            }}
          >
            ch{String(data.chapterIntroduced).padStart(2, '0')}
          </span>
        )}
      </div>

      {/* Handles — source + target on all four sides for smart routing */}
      {(
        [
          { type: 'source' as const, pos: Position.Top,    id: 'source-top'    },
          { type: 'target' as const, pos: Position.Top,    id: 'target-top'    },
          { type: 'source' as const, pos: Position.Bottom, id: 'source-bottom' },
          { type: 'target' as const, pos: Position.Bottom, id: 'target-bottom' },
          { type: 'source' as const, pos: Position.Left,   id: 'source-left'   },
          { type: 'target' as const, pos: Position.Left,   id: 'target-left'   },
          { type: 'source' as const, pos: Position.Right,  id: 'source-right'  },
          { type: 'target' as const, pos: Position.Right,  id: 'target-right'  },
        ] as const
      ).map(({ type, pos, id }) => (
        <Handle
          key={id}
          id={id}
          type={type}
          position={pos}
          className={`${sel ? '' : 'opacity-0'} group-hover:opacity-100 transition-opacity`}
          style={{
            width: 9, height: 9,
            background: 'var(--bg-panel)',
            border: `1.5px solid ${roleVar}`,
          }}
        />
      ))}
    </div>
  );
}

export default memo(CharacterNodeImpl);
