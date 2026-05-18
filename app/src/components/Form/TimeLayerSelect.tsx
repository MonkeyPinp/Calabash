import type { CSSProperties } from 'react';
import type { TimeLayer } from '@/types';
import { useT } from '@/i18n';
import { getTimeLayerColor } from '@/lib/timeLayers';

const selectStyle: CSSProperties = {
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

export interface TimeLayerSelectProps {
  layers: TimeLayer[];
  value?: string | null;
  onChange: (value: string | null) => void;
  style?: CSSProperties;
}

export default function TimeLayerSelect({
  layers,
  value,
  onChange,
  style,
}: TimeLayerSelectProps) {
  const t = useT();
  if (layers.length === 0) return null;
  const selectedColor = getTimeLayerColor(layers, value);

  return (
    <select
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value || null)}
      style={{
        ...selectStyle,
        borderColor: selectedColor ?? 'var(--ink-200)',
        boxShadow: selectedColor ? `inset 4px 0 0 ${selectedColor}` : undefined,
        paddingLeft: selectedColor ? 14 : 9,
        color: selectedColor ?? 'var(--ink-900)',
        ...style,
      }}
    >
      <option value="">{t('timeLayer.global')}</option>
      {layers.map((layer) => (
        <option key={layer.id} value={layer.id}>
          {layer.name}
        </option>
      ))}
    </select>
  );
}
