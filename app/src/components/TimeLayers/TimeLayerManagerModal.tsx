import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Clock3, Plus, Trash2, X } from 'lucide-react';
import type { TimeLayer } from '@/types';
import { useT } from '@/i18n';

const LAYER_COLORS = ['#6a4f1b', '#8f2f1f', '#1f5f7a', '#9f6b14', '#4e7c56', '#70528f', '#2f6d65'];

function newLayerId(existing: TimeLayer[]) {
  const used = new Set(existing.map((layer) => layer.id));
  let index = existing.length + 1;
  let candidate = `layer-${Date.now().toString(36)}-${index}`;
  while (used.has(candidate)) {
    index += 1;
    candidate = `layer-${Date.now().toString(36)}-${index}`;
  }
  return candidate;
}

function normalizeDraft(layers: TimeLayer[]): TimeLayer[] {
  return layers.map((layer, index) => ({
    ...layer,
    name: layer.name.trim(),
    order: index + 1,
    color: layer.color || LAYER_COLORS[index % LAYER_COLORS.length],
  })).filter((layer) => layer.name);
}

export interface TimeLayerManagerModalProps {
  layers: TimeLayer[];
  saving?: boolean;
  onClose: () => void;
  onSave: (layers: TimeLayer[]) => void;
}

export default function TimeLayerManagerModal({
  layers,
  saving = false,
  onClose,
  onSave,
}: TimeLayerManagerModalProps) {
  const t = useT();
  const [draft, setDraft] = useState<TimeLayer[]>(() => layers.map((layer) => ({ ...layer })));
  const normalized = useMemo(() => normalizeDraft(draft), [draft]);
  const canSave = normalized.length === draft.length && !saving;

  function addLayer() {
    setDraft((current) => [
      ...current,
      {
        id: newLayerId(current),
        name: t('timeLayer.defaultName', { number: current.length + 1 }),
        order: current.length + 1,
        color: LAYER_COLORS[current.length % LAYER_COLORS.length],
      },
    ]);
  }

  function updateLayer(id: string, patch: Partial<TimeLayer>) {
    setDraft((current) => current.map((layer) => (layer.id === id ? { ...layer, ...patch } : layer)));
  }

  function moveLayer(id: string, direction: -1 | 1) {
    setDraft((current) => {
      const index = current.findIndex((layer) => layer.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function removeLayer(id: string) {
    setDraft((current) => current.filter((layer) => layer.id !== id));
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('timeLayer.managerTitle')}
      style={overlayStyle}
      onClick={onClose}
    >
      <div style={modalStyle} onClick={(event) => event.stopPropagation()}>
        <header style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
            <span style={stampStyle}><Clock3 size={15} /></span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--ink-900)' }}>
                {t('timeLayer.managerTitle')}
              </div>
              <div style={{ marginTop: 2, fontSize: 11.5, color: 'var(--ink-500)', lineHeight: 1.4 }}>
                {t('timeLayer.managerBody')}
              </div>
            </div>
          </div>
          <button type="button" onClick={onClose} title={t('common.close')} aria-label={t('common.close')} style={iconButtonStyle}>
            <X size={15} />
          </button>
        </header>

        <div style={bodyStyle}>
          {draft.length === 0 ? (
            <div style={emptyStyle}>
              <Clock3 size={20} />
              <span>{t('timeLayer.empty')}</span>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {draft.map((layer, index) => (
                <div key={layer.id} style={rowStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <button
                      type="button"
                      onClick={() => moveLayer(layer.id, -1)}
                      disabled={index === 0}
                      title={t('timeLayer.moveUp')}
                      style={smallButtonStyle(index === 0)}
                    >
                      <ArrowUp size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveLayer(layer.id, 1)}
                      disabled={index === draft.length - 1}
                      title={t('timeLayer.moveDown')}
                      style={smallButtonStyle(index === draft.length - 1)}
                    >
                      <ArrowDown size={12} />
                    </button>
                  </div>
                  <input
                    value={layer.name}
                    onChange={(event) => updateLayer(layer.id, { name: event.target.value })}
                    style={inputStyle}
                    aria-label={t('timeLayer.name')}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                    {LAYER_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => updateLayer(layer.id, { color })}
                        aria-label={t('timeLayer.color')}
                        aria-pressed={layer.color === color}
                        style={colorButtonStyle(color, layer.color === color)}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeLayer(layer.id)}
                    title={t('timeLayer.delete')}
                    style={{ ...smallButtonStyle(false), color: 'var(--accent)' }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <footer style={footerStyle}>
          <button type="button" onClick={addLayer} style={secondaryButtonStyle}>
            <Plus size={13} />
            {t('timeLayer.addLayer')}
          </button>
          <div style={{ flex: 1 }} />
          <button type="button" onClick={onClose} style={secondaryButtonStyle}>
            {t('sidebar.cancel')}
          </button>
          <button
            type="button"
            disabled={!canSave}
            onClick={() => onSave(normalized)}
            style={primaryButtonStyle(!canSave)}
          >
            {saving ? t('timeLayer.saving') : t('timeLayer.save')}
          </button>
        </footer>
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 1000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 18,
  background: 'color-mix(in srgb, var(--ink-900) 34%, transparent)',
};

const modalStyle: React.CSSProperties = {
  width: 'min(620px, calc(100vw - 32px))',
  maxHeight: 'calc(var(--app-viewport-height) - 36px)',
  display: 'grid',
  gridTemplateRows: 'auto minmax(0, 1fr) auto',
  background: 'var(--bg-elevated)',
  border: '1px solid var(--ink-200)',
  borderTop: '4px solid var(--accent)',
  borderRadius: 8,
  color: 'var(--ink-900)',
  boxShadow: 'var(--shadow-modal)',
  overflow: 'hidden',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 12,
  padding: '16px 18px 14px',
  borderBottom: '1px solid var(--ink-150)',
};

const stampStyle: React.CSSProperties = {
  width: 30,
  height: 30,
  display: 'grid',
  placeItems: 'center',
  borderRadius: 5,
  background: 'var(--bg-canvas)',
  border: '1px solid var(--ink-200)',
  color: 'var(--accent)',
  flexShrink: 0,
};

const bodyStyle: React.CSSProperties = {
  overflowY: 'auto',
  padding: 16,
};

const emptyStyle: React.CSSProperties = {
  minHeight: 130,
  display: 'grid',
  placeItems: 'center',
  gap: 8,
  color: 'var(--ink-500)',
  border: '1px dashed var(--ink-200)',
  borderRadius: 6,
  background: 'var(--bg-canvas)',
  fontSize: 12.5,
  textAlign: 'center',
};

const rowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'auto minmax(130px, 1fr) minmax(110px, auto) auto',
  gap: 8,
  alignItems: 'center',
  padding: 10,
  border: '1px solid var(--ink-200)',
  borderRadius: 6,
  background: 'var(--bg-panel)',
};

const inputStyle: React.CSSProperties = {
  minWidth: 0,
  width: '100%',
  height: 34,
  padding: '6px 9px',
  border: '1px solid var(--ink-200)',
  borderRadius: 4,
  background: 'var(--bg-canvas)',
  color: 'var(--ink-900)',
  boxSizing: 'border-box',
  fontSize: 13,
};

function smallButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    width: 28,
    height: 28,
    display: 'inline-grid',
    placeItems: 'center',
    padding: 0,
    border: '1px solid var(--ink-200)',
    borderRadius: 4,
    background: 'transparent',
    color: 'var(--ink-600)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.35 : 1,
  };
}

function colorButtonStyle(color: string, active: boolean): React.CSSProperties {
  return {
    width: 22,
    height: 22,
    borderRadius: 999,
    border: active ? '2px solid var(--ink-900)' : '1px solid var(--ink-200)',
    background: color,
    boxShadow: active ? `0 0 0 2px color-mix(in srgb, ${color} 24%, transparent)` : 'none',
    cursor: 'pointer',
  };
}

const iconButtonStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 5,
  border: '1px solid transparent',
  background: 'transparent',
  color: 'var(--ink-600)',
  cursor: 'pointer',
  display: 'grid',
  placeItems: 'center',
  padding: 0,
};

const footerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '12px 16px',
  borderTop: '1px solid var(--ink-150)',
  background: 'var(--bg-panel)',
};

const secondaryButtonStyle: React.CSSProperties = {
  minHeight: 34,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  padding: '7px 12px',
  border: '1px solid var(--ink-200)',
  borderRadius: 5,
  background: 'transparent',
  color: 'var(--ink-700)',
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 600,
};

function primaryButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    ...secondaryButtonStyle,
    borderColor: disabled ? 'var(--ink-200)' : 'var(--ink-900)',
    background: disabled ? 'var(--bg-canvas)' : 'var(--ink-900)',
    color: disabled ? 'var(--ink-400)' : 'var(--bg-panel)',
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}
