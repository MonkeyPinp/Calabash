import { memo, useEffect, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { CharacterRole } from '@/types';
import { usePortraitUrl } from '@/hooks/usePortraitUrl';
import { useT } from '@/i18n';
import { formatCharacterRole, getCharacterRoleCssVar } from '@/lib/roles';

export interface CharacterNodeData {
  name: string;
  width?: number;
  height?: number;
  role?: CharacterRole;
  profession?: string;
  portraitId?: string;
  chapterIntroduced?: number;
}

function CharacterNodeImpl(props: NodeProps) {
  const t       = useT();
  const data    = props.data as unknown as CharacterNodeData;
  const sel     = props.selected ?? false;
  const roleVar = getCharacterRoleCssVar(data.role);
  const portraitUrl = usePortraitUrl(data.portraitId);
  const [portraitFailed, setPortraitFailed] = useState(false);

  const initial = data.name.trim().charAt(0).toUpperCase();
  const roleLabel = formatCharacterRole(data.role, t);

  useEffect(() => {
    setPortraitFailed(false);
  }, [portraitUrl]);

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
        maxWidth: 440,
        width: data.width ?? 184,
        minHeight: data.height ?? 68,
        overflow: 'hidden',
        boxShadow: sel ? `0 0 0 3px color-mix(in srgb, ${roleVar} 18%, transparent), var(--shadow-node)` : 'var(--shadow-node)',
        transition: 'box-shadow var(--transition-node), border-color var(--transition-node)',
        cursor: 'default',
      } as React.CSSProperties}
    >
      {/* Role-colour left ribbon */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: roleVar }} />
      <div style={{ position: 'absolute', left: 0, top: 6, width: 4, height: 1, background: 'color-mix(in srgb, var(--bg-panel) 62%, transparent)' }} />
      <div style={{ position: 'absolute', left: 0, bottom: 6, width: 4, height: 1, background: 'color-mix(in srgb, var(--bg-panel) 62%, transparent)' }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px 20px 14px' }}>
        {/* Avatar — portrait or initial */}
        {portraitUrl && !portraitFailed ? (
          <img
            src={portraitUrl}
            alt=""
            onError={() => setPortraitFailed(true)}
            style={{
              width: 34, height: 34, borderRadius: '50%',
              objectFit: 'cover', flexShrink: 0,
              border: `1px solid color-mix(in srgb, ${roleVar} 38%, transparent)`,
            }}
          />
        ) : (
          <div style={{
            width: 34, height: 34, borderRadius: '50%',
            flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `color-mix(in srgb, ${roleVar} 14%, var(--bg-canvas))`,
            border: `1px solid color-mix(in srgb, ${roleVar} 38%, transparent)`,
            fontFamily: 'var(--font-case-title)',
            fontSize: 16, fontWeight: 600, letterSpacing: '0.02em', color: roleVar,
            userSelect: 'none',
          }}>
            {initial}
          </div>
        )}

        {/* Text block */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'var(--font-case-title)',
            fontSize: 14.5, fontWeight: 500,
            color: 'var(--ink-900)', lineHeight: 1.15,
            whiteSpace: 'normal',
            overflowWrap: 'anywhere',
            paddingRight: 2,
          }}>
            {data.name}
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 5,
            minWidth: 0,
            marginTop: 2.5,
            lineHeight: 1.25,
            flexWrap: 'wrap',
          }}>
            {roleLabel && (
              <span
                style={{
                  fontFamily: 'var(--font-case-title)',
                  fontSize: 10.5,
                  fontStyle: 'italic',
                  color: roleVar,
                  minWidth: 0,
                  overflowWrap: 'anywhere',
                }}
              >
                {roleLabel}
              </span>
            )}
            {roleLabel && data.profession && (
              <span style={{ fontSize: 9, color: 'var(--ink-400)', flexShrink: 0 }}>·</span>
            )}
            {data.profession && (
              <>
                <span style={{
                  fontSize: 10.5,
                  color: 'var(--ink-500)',
                  minWidth: 0,
                  overflowWrap: 'anywhere',
                }}>
                  {data.profession}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {data.chapterIntroduced !== undefined && (
        <div
          title={`Introduced ch. ${data.chapterIntroduced}`}
          style={{
            position: 'absolute',
            right: 8,
            bottom: 6,
            fontFamily: 'var(--font-mono)',
            fontSize: 8.5,
            color: 'var(--ink-400)',
            letterSpacing: '0.05em',
            opacity: 0.72,
          }}
        >
          {String(data.chapterIntroduced).padStart(2, '0')}
        </div>
      )}

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
