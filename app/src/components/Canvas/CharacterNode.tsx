import { memo, useEffect, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Lock } from 'lucide-react';
import type { CharacterKind, CharacterRole } from '@/types';
import { usePortraitUrl } from '@/hooks/usePortraitUrl';
import { useT } from '@/i18n';
import { formatNonCharacterKind, normalizeCharacterKind } from '@/lib/characterKinds';
import { formatCharacterRole, getCharacterRoleCssVar, getCharacterRoleVisualKey } from '@/lib/roles';
import type { CharacterNodeViewMode } from '@/stores/uiStore';

export interface CharacterNodeData {
  name: string;
  width?: number;
  height?: number;
  kind?: CharacterKind;
  role?: CharacterRole;
  profession?: string;
  portraitId?: string;
  chapterIntroduced?: number;
  viewMode?: CharacterNodeViewMode;
  locked?: boolean;
}

function CharacterNodeImpl(props: NodeProps) {
  const t       = useT();
  const data    = props.data as unknown as CharacterNodeData;
  const sel     = props.selected ?? false;
  const kind = normalizeCharacterKind(data.kind);
  const kindLabel = formatNonCharacterKind(kind, t);
  const roleKey = getCharacterRoleVisualKey(data.role);
  const isVictim = roleKey === 'victim';
  const roleVar = getCharacterRoleCssVar(data.role);
  const portraitUrl = usePortraitUrl(data.portraitId);
  const [portraitFailed, setPortraitFailed] = useState(false);

  const initial = data.name.trim().charAt(0).toUpperCase() || '?';
  const roleLabel = formatCharacterRole(data.role, t);
  const fileLabel = kindLabel || roleLabel;

  useEffect(() => {
    setPortraitFailed(false);
  }, [portraitUrl]);

  const handles = (
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
      className={`${sel ? '' : 'opacity-0'} transition-opacity`}
      style={{
        width: data.viewMode === 'portrait' ? 10 : 9,
        height: data.viewMode === 'portrait' ? 10 : 9,
        background: 'var(--bg-panel)',
        border: `1.5px solid ${roleVar}`,
        pointerEvents: sel ? 'all' : 'none',
      }}
    />
  ));

  if (data.viewMode === 'portrait') {
    const width = data.width ?? 176;
    const photoHeight = Math.max(148, Math.round(width * 0.9));
    return (
      <div
        data-testid="character-node"
        data-view-mode="portrait"
        className={data.locked ? 'group nopan' : 'group'}
        style={{
          position: 'relative',
          width,
          minHeight: data.height ?? 252,
          background: 'var(--bg-panel)',
          border: `${sel ? 2 : 1}px solid ${sel ? roleVar : 'var(--ink-200)'}`,
          borderRadius: 4,
          overflow: 'hidden',
          boxShadow: sel
            ? `0 0 0 3px color-mix(in srgb, ${roleVar} 22%, transparent), var(--shadow-node)`
            : 'var(--shadow-node)',
          transition: 'box-shadow var(--transition-node), border-color var(--transition-node)',
          cursor: 'default',
          filter: isVictim ? 'grayscale(1) saturate(0.12) contrast(0.96)' : undefined,
        } as React.CSSProperties}
      >
        {data.locked && (
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              right: 8,
              top: 8,
              zIndex: 2,
              width: 21,
              height: 21,
              display: 'grid',
              placeItems: 'center',
              borderRadius: 3,
              border: '1px solid color-mix(in srgb, var(--accent) 36%, transparent)',
              background: 'color-mix(in srgb, var(--bg-panel) 88%, transparent)',
              color: 'var(--accent)',
              boxShadow: '0 1px 3px rgba(40,28,12,.12)',
              pointerEvents: 'none',
            }}
          >
            <Lock size={11} />
          </div>
        )}
        <div style={{ height: 5, background: roleVar, position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              left: 8,
              right: 8,
              top: 2,
              height: 1,
              background: 'color-mix(in srgb, var(--bg-panel) 70%, transparent)',
            }}
          />
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 6,
            padding: '4px 8px 3px',
            background: 'color-mix(in srgb, var(--ink-200) 30%, var(--bg-panel))',
            borderBottom: '1px solid var(--ink-200)',
            fontFamily: 'var(--font-mono)',
            fontSize: 9.5,
            letterSpacing: '0.08em',
            color: 'var(--ink-500)',
            textTransform: 'uppercase',
          }}
        >
          <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            FILE {initial}-{String(data.chapterIntroduced ?? 0).padStart(2, '0')}
          </span>
          {fileLabel && (
            <span style={{ color: roleVar, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {fileLabel}
            </span>
          )}
        </div>

        <div
          style={{
            position: 'relative',
            height: photoHeight,
            background: `repeating-linear-gradient(
              135deg,
              color-mix(in srgb, ${roleVar} 6%, var(--bg-canvas)) 0px,
              color-mix(in srgb, ${roleVar} 6%, var(--bg-canvas)) 8px,
              color-mix(in srgb, ${roleVar} 14%, var(--bg-canvas)) 8px,
              color-mix(in srgb, ${roleVar} 14%, var(--bg-canvas)) 16px
            )`,
            overflow: 'hidden',
            borderBottom: '1px solid var(--ink-150)',
          }}
        >
          {portraitUrl && !portraitFailed ? (
            <img
              src={portraitUrl}
              alt=""
              onError={() => setPortraitFailed(true)}
              style={{
                width: '100%',
                height: '100%',
                display: 'block',
                objectFit: 'cover',
                filter: isVictim ? 'grayscale(1) saturate(0) contrast(0.95)' : 'saturate(0.9) contrast(1.03)',
              }}
            />
          ) : (
            <>
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(180deg, rgba(255,245,220,.22) 0%, rgba(60,40,20,.10) 100%)',
                  mixBlendMode: 'multiply',
                }}
              />
              <CornerBracket corner="tl" />
              <CornerBracket corner="tr" />
              <CornerBracket corner="bl" />
              <CornerBracket corner="br" />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'grid',
                  placeItems: 'center',
                  fontFamily: 'var(--font-display)',
                  fontSize: 70,
                  fontWeight: 600,
                  color: `color-mix(in srgb, ${roleVar} 78%, var(--ink-900))`,
                  lineHeight: 1,
                  textShadow: '0 1px 0 color-mix(in srgb, var(--bg-panel) 55%, transparent)',
                  userSelect: 'none',
                }}
              >
                {initial}
              </div>
              <div
                style={{
                  position: 'absolute',
                  left: 7,
                  bottom: 5,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 8.5,
                  letterSpacing: '0.08em',
                  color: 'color-mix(in srgb, var(--ink-900) 38%, transparent)',
                }}
              >
                [ portrait ]
              </div>
            </>
          )}

        </div>

        <div
          style={{
            position: 'relative',
            padding: '8px 10px 10px',
            background: 'var(--bg-panel)',
          }}
        >
          <div
            data-testid="portrait-character-name"
            style={{
              fontFamily: 'var(--font-case-title)',
              fontSize: 16,
              fontWeight: 500,
              color: 'var(--ink-900)',
              lineHeight: 1.15,
              whiteSpace: 'normal',
              overflowWrap: 'anywhere',
              paddingRight: data.chapterIntroduced !== undefined ? 46 : 0,
            }}
          >
            {data.name}
          </div>
          {data.chapterIntroduced !== undefined && (
            <div
              title={`Introduced ch. ${data.chapterIntroduced}`}
              style={{
                position: 'absolute',
                right: 8,
                bottom: 8,
                padding: '2px 6px',
                fontFamily: 'var(--font-mono)',
                fontSize: 9.5,
                fontWeight: 700,
                letterSpacing: 0,
                color: 'var(--accent)',
                background: 'color-mix(in srgb, var(--bg-canvas) 82%, transparent)',
                border: '1px solid color-mix(in srgb, var(--accent) 50%, transparent)',
                borderRadius: 2,
                boxShadow: '0 1px 0 rgba(0,0,0,.08)',
              }}
            >
              CH.{String(data.chapterIntroduced).padStart(2, '0')}
            </div>
          )}
          {(kindLabel || data.profession) && (
            <div
              style={{
                marginTop: 2,
                fontSize: 12,
                color: 'var(--ink-500)',
                lineHeight: 1.25,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                paddingRight: data.chapterIntroduced !== undefined ? 46 : 0,
              }}
            >
              {[kindLabel, data.profession].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>

        {handles}
      </div>
    );
  }

  return (
    <div
      data-testid="character-node"
      data-view-mode="text"
      className={data.locked ? 'group nopan' : 'group'}
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
        filter: isVictim ? 'grayscale(1) saturate(0.12) contrast(0.96)' : undefined,
      } as React.CSSProperties}
    >
      {data.locked && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            right: 8,
            top: 8,
            zIndex: 2,
            width: 20,
            height: 20,
            display: 'grid',
            placeItems: 'center',
            borderRadius: 3,
            border: '1px solid color-mix(in srgb, var(--accent) 36%, transparent)',
            background: 'color-mix(in srgb, var(--bg-panel) 88%, transparent)',
            color: 'var(--accent)',
            boxShadow: '0 1px 3px rgba(40,28,12,.12)',
            pointerEvents: 'none',
          }}
        >
          <Lock size={11} />
        </div>
      )}
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
              filter: isVictim ? 'grayscale(1) saturate(0) contrast(0.95)' : undefined,
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
            fontSize: 16, fontWeight: 500,
            color: 'var(--ink-900)', lineHeight: 1.15,
            whiteSpace: 'normal',
            overflowWrap: 'anywhere',
            paddingRight: data.locked ? 24 : 2,
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
            {kindLabel && (
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10.5,
                  color: 'var(--ink-500)',
                  textTransform: 'uppercase',
                  minWidth: 0,
                  overflowWrap: 'anywhere',
                }}
              >
                {kindLabel}
              </span>
            )}
            {kindLabel && (roleLabel || data.profession) && (
              <span style={{ fontSize: 9, color: 'var(--ink-400)', flexShrink: 0 }}>·</span>
            )}
            {roleLabel && (
              <span
                style={{
                  fontFamily: 'var(--font-case-title)',
                  fontSize: 12,
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
                  fontSize: 12,
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
            fontSize: 9.5,
            color: 'var(--ink-400)',
            letterSpacing: '0.05em',
            opacity: 0.72,
          }}
        >
          {String(data.chapterIntroduced).padStart(2, '0')}
        </div>
      )}

      {/* Handles — source + target on all four sides for smart routing */}
      {handles}
    </div>
  );
}

function CornerBracket({ corner }: { corner: 'tl' | 'tr' | 'bl' | 'br' }) {
  const styleByCorner: Record<typeof corner, React.CSSProperties> = {
    tl: { top: 6, left: 6, transform: 'rotate(0deg)' },
    tr: { top: 6, right: 6, transform: 'rotate(90deg)' },
    bl: { bottom: 6, left: 6, transform: 'rotate(-90deg)' },
    br: { bottom: 6, right: 6, transform: 'rotate(180deg)' },
  };

  return (
    <div
      style={{
        position: 'absolute',
        width: 12,
        height: 12,
        ...styleByCorner[corner],
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, width: 12, height: 1.5, background: 'color-mix(in srgb, var(--ink-900) 55%, transparent)' }} />
      <div style={{ position: 'absolute', top: 0, left: 0, width: 1.5, height: 12, background: 'color-mix(in srgb, var(--ink-900) 55%, transparent)' }} />
    </div>
  );
}

export default memo(CharacterNodeImpl);
