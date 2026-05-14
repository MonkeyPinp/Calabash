import type { RelationshipDirectionChoice } from '@/lib/relationshipTypes';

interface DirectionSegmentedControlProps {
  value: RelationshipDirectionChoice;
  sourceName: string;
  targetName: string;
  onChange: (value: RelationshipDirectionChoice) => void;
}

export default function DirectionSegmentedControl({
  value,
  sourceName,
  targetName,
  onChange,
}: DirectionSegmentedControlProps) {
  const options: Array<{ value: RelationshipDirectionChoice; label: string }> = [
    { value: 'forward', label: `${sourceName} -> ${targetName}` },
    { value: 'reverse', label: `${targetName} -> ${sourceName}` },
    { value: 'undirected', label: `${sourceName} - ${targetName}` },
  ];

  return (
    <div
      role="group"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gap: 4,
        padding: 3,
        border: '1px solid var(--ink-200)',
        borderRadius: 5,
        background: 'var(--bg-canvas)',
      }}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            title={option.label}
            style={{
              minWidth: 0,
              padding: '6px 7px',
              border: `1px solid ${active ? 'var(--ink-700)' : 'transparent'}`,
              borderRadius: 3,
              background: active ? 'var(--bg-panel)' : 'transparent',
              color: active ? 'var(--ink-900)' : 'var(--ink-600)',
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: active ? 700 : 600,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
