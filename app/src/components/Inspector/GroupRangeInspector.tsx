import { Copy, Trash2 } from 'lucide-react';
import type { GroupRangeColor } from '@/types';
import { createGroupRange, deleteGroupRange, restoreGroupRange, updateGroupRange } from '@/db/groupRanges';
import { GROUP_RANGE_COLORS, GROUP_RANGE_COLOR_MAP, normalizeGroupRangeChapter } from '@/lib/groupRanges';
import { useGraphStore } from '@/stores/graphStore';
import { useT } from '@/i18n';

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 9.5,
  fontWeight: 600,
  letterSpacing: '0.11em',
  textTransform: 'uppercase',
  color: 'var(--ink-500)',
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 9px',
  fontSize: 13,
  border: '1px solid var(--ink-200)',
  borderRadius: 4,
  background: 'var(--bg-canvas)',
  color: 'var(--ink-900)',
  boxSizing: 'border-box',
  outline: 'none',
};

const fieldStyle: React.CSSProperties = {
  marginBottom: 14,
};

export interface GroupRangeInspectorProps {
  groupRangeId: string;
  bookId: string;
  onDeleted?: () => void;
  onDuplicated?: (newId: string) => void;
}

export default function GroupRangeInspector({
  groupRangeId,
  bookId,
  onDeleted,
  onDuplicated,
}: GroupRangeInspectorProps) {
  const t = useT();
  const groupRanges = useGraphStore((s) => s.groupRanges);
  const addGroupRange = useGraphStore((s) => s.addGroupRange);
  const removeGroupRange = useGraphStore((s) => s.removeGroupRange);
  const updateGroupRangeInStore = useGraphStore((s) => s.updateGroupRangeInStore);
  const pushUndo = useGraphStore((s) => s.pushUndo);

  const range = groupRanges.find((r) => r.id === groupRangeId);
  if (!range) {
    return <div style={{ padding: 16, color: 'var(--ink-500)', fontSize: 13 }}>{t('groupRange.notFound')}</div>;
  }

  const colors = GROUP_RANGE_COLOR_MAP[range.color];

  async function persist(patch: Parameters<typeof updateGroupRange>[1]) {
    const updated = await updateGroupRange(groupRangeId, patch);
    updateGroupRangeInStore(updated);
    return updated;
  }

  async function handleLabelBlur(value: string) {
    const label = value.trim() || t('groupRange.defaultLabel');
    if (label === range!.label) return;
    const before = range!.label;
    await persist({ label });
    pushUndo(
      async () => {
        const updated = await updateGroupRange(groupRangeId, { label: before });
        updateGroupRangeInStore(updated);
      },
      async () => {
        const updated = await updateGroupRange(groupRangeId, { label });
        updateGroupRangeInStore(updated);
      },
    );
  }

  async function handleColorChange(color: GroupRangeColor) {
    if (color === range!.color) return;
    const before = range!.color;
    await persist({ color });
    pushUndo(
      async () => {
        const updated = await updateGroupRange(groupRangeId, { color: before });
        updateGroupRangeInStore(updated);
      },
      async () => {
        const updated = await updateGroupRange(groupRangeId, { color });
        updateGroupRangeInStore(updated);
      },
    );
  }

  async function handleSizeBlur(field: 'width' | 'height', value: string) {
    const min = field === 'width' ? 160 : 120;
    const parsed = Math.max(min, parseInt(value, 10));
    if (!Number.isFinite(parsed) || parsed === range![field]) return;
    const before = range![field];
    await persist({ [field]: parsed });
    pushUndo(
      async () => {
        const updated = await updateGroupRange(groupRangeId, { [field]: before });
        updateGroupRangeInStore(updated);
      },
      async () => {
        const updated = await updateGroupRange(groupRangeId, { [field]: parsed });
        updateGroupRangeInStore(updated);
      },
    );
  }

  async function handleChapterBlur(value: string) {
    const parsed = normalizeGroupRangeChapter(value);
    if (parsed === range!.chapterIntroduced) return;
    const before = range!.chapterIntroduced;
    await persist({ chapterIntroduced: parsed });
    pushUndo(
      async () => {
        const updated = await updateGroupRange(groupRangeId, { chapterIntroduced: before });
        updateGroupRangeInStore(updated);
      },
      async () => {
        const updated = await updateGroupRange(groupRangeId, { chapterIntroduced: parsed });
        updateGroupRangeInStore(updated);
      },
    );
  }

  async function handleDuplicate() {
    const current = range!;
    const copy = await createGroupRange({
      bookId,
      label: current.label,
      color: current.color,
      width: current.width,
      height: current.height,
      chapterIntroduced: current.chapterIntroduced,
      position: { x: current.position.x + 36, y: current.position.y + 36 },
    });
    addGroupRange(copy);
    pushUndo(
      async () => { await deleteGroupRange(copy.id); removeGroupRange(copy.id); },
      async () => { await restoreGroupRange(copy); addGroupRange(copy); },
    );
    onDuplicated?.(copy.id);
  }

  async function handleDelete() {
    const snapshot = range!;
    await deleteGroupRange(groupRangeId);
    removeGroupRange(groupRangeId);
    pushUndo(
      async () => { await restoreGroupRange(snapshot); addGroupRange(snapshot); },
      async () => { await deleteGroupRange(groupRangeId); removeGroupRange(groupRangeId); },
    );
    onDeleted?.();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid var(--ink-200)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 9.5, color: 'var(--ink-400)', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600 }}>
              {t('app.inspectGroupRange')}
            </div>
            <div
              style={{
                marginTop: 6,
                fontFamily: 'var(--font-display)',
                fontSize: 16,
                color: 'var(--ink-900)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={range.label}
            >
              {range.label}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-500)', marginTop: 3 }}>
              {t('groupRange.chapterIntroducedShort', { chapter: range.chapterIntroduced })} · {range.width} x {range.height}
            </div>
          </div>
          <button
            onClick={() => void handleDuplicate()}
            title={t('groupRange.duplicate')}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 28, height: 28,
              background: 'transparent', border: '1px solid transparent',
              borderRadius: 5, cursor: 'pointer', color: 'var(--ink-600)',
              flexShrink: 0,
            }}
          >
            <Copy size={13} />
          </button>
          <button
            onClick={() => void handleDelete()}
            title={t('groupRange.delete')}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 28, height: 28,
              background: 'transparent', border: '1px solid transparent',
              borderRadius: 5, cursor: 'pointer', color: 'var(--accent)',
              flexShrink: 0,
            }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div style={{ padding: 16, overflowY: 'auto', flex: 1, boxSizing: 'border-box' }}>
        <div style={fieldStyle}>
          <label style={labelStyle}>{t('groupRange.chapterIntroduced')}</label>
          <input
            style={inputStyle}
            type="number"
            min={1}
            defaultValue={range.chapterIntroduced}
            key={`chapter-${groupRangeId}`}
            onBlur={(e) => void handleChapterBlur(e.target.value)}
          />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>{t('groupRange.label')}</label>
          <input
            style={inputStyle}
            defaultValue={range.label}
            key={`label-${groupRangeId}`}
            onBlur={(e) => void handleLabelBlur(e.target.value)}
          />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>{t('groupRange.color')}</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {GROUP_RANGE_COLORS.map((color) => {
              const swatch = GROUP_RANGE_COLOR_MAP[color];
              const active = color === range.color;
              return (
                <button
                  key={color}
                  type="button"
                  title={t(`groupRange.color.${color}`)}
                  aria-label={t(`groupRange.color.${color}`)}
                  aria-pressed={active}
                  onClick={() => void handleColorChange(color)}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 999,
                    background: swatch.fill,
                    border: `2px solid ${active ? swatch.border : 'var(--ink-200)'}`,
                    boxShadow: active ? `0 0 0 2px color-mix(in srgb, ${swatch.border} 20%, transparent)` : 'none',
                    cursor: 'pointer',
                  }}
                />
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ ...fieldStyle, flex: 1 }}>
            <label style={labelStyle}>{t('groupRange.width')}</label>
            <input
              style={inputStyle}
              type="number"
              min={160}
              defaultValue={range.width}
              key={`width-${groupRangeId}`}
              onBlur={(e) => void handleSizeBlur('width', e.target.value)}
            />
          </div>
          <div style={{ ...fieldStyle, flex: 1 }}>
            <label style={labelStyle}>{t('groupRange.height')}</label>
            <input
              style={inputStyle}
              type="number"
              min={120}
              defaultValue={range.height}
              key={`height-${groupRangeId}`}
              onBlur={(e) => void handleSizeBlur('height', e.target.value)}
            />
          </div>
        </div>

        <div
          aria-hidden="true"
          style={{
            marginTop: 10,
            height: 118,
            borderRadius: 999,
            border: `2px dashed ${colors.border}`,
            background: colors.fill,
            display: 'grid',
            placeItems: 'center',
            color: colors.text,
            fontFamily: 'var(--font-case-title)',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {range.label}
        </div>
      </div>
    </div>
  );
}
