import type { RelationshipType, CertaintyLevel } from '@/types';
import { updateRelationship } from '@/db/relationships';
import { useGraphStore } from '@/stores/graphStore';
import { isDirected } from '@/lib/relationshipTypes';

const RELATIONSHIP_TYPES: RelationshipType[] = [
  'family',
  'professional',
  'romantic',
  'hostile',
  'suspicion',
  'other',
];

const CERTAINTY_LEVELS: CertaintyLevel[] = ['confirmed', 'suspected', 'disproven'];

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.07em',
  textTransform: 'uppercase',
  color: 'var(--fg-muted)',
  marginBottom: 4,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '5px 8px',
  fontSize: 13,
  border: '1px solid var(--border)',
  borderRadius: 4,
  background: 'var(--bg-canvas)',
  color: 'var(--fg-primary)',
  boxSizing: 'border-box',
  outline: 'none',
};

const fieldStyle: React.CSSProperties = {
  marginBottom: 14,
};

export interface RelationshipInspectorProps {
  relationshipId: string;
}

export default function RelationshipInspector({ relationshipId }: RelationshipInspectorProps) {
  const relationships = useGraphStore((s) => s.relationships);
  const characters = useGraphStore((s) => s.characters);
  const updateRelationshipInStore = useGraphStore((s) => s.updateRelationshipInStore);

  const rel = relationships.find((r) => r.id === relationshipId);

  if (!rel) {
    return (
      <div style={{ padding: 16, color: 'var(--fg-muted)', fontSize: 13 }}>
        Relationship not found.
      </div>
    );
  }

  // Non-nullable alias so closures below can reference it safely
  const safeRel = rel;

  const sourceName = characters.find((c) => c.id === safeRel.sourceId)?.name ?? safeRel.sourceId;
  const targetName = characters.find((c) => c.id === safeRel.targetId)?.name ?? safeRel.targetId;
  const arrow = isDirected(safeRel.type) ? '→' : '↔';

  async function persist(patch: Parameters<typeof updateRelationship>[1]) {
    const updated = await updateRelationship(relationshipId, patch);
    updateRelationshipInStore(updated);
  }

  function handleTypeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    void persist({ type: e.target.value as RelationshipType });
  }

  function handleCertaintyChange(e: React.ChangeEvent<HTMLSelectElement>) {
    void persist({ certainty: e.target.value as CertaintyLevel });
  }

  function handleLabelBlur(e: React.FocusEvent<HTMLInputElement>) {
    const val = e.target.value;
    if (val !== (safeRel.label ?? '')) void persist({ label: val || undefined });
  }

  function handleChapterBlur(e: React.FocusEvent<HTMLInputElement>) {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val >= 1 && val !== safeRel.chapterRevealed) {
      void persist({ chapterRevealed: val });
    }
  }

  function handleNotesBlur(e: React.FocusEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    if (val !== (safeRel.notes ?? '')) void persist({ notes: val || undefined });
  }

  return (
    <div style={{ padding: 16, overflowY: 'auto', height: '100%', boxSizing: 'border-box' }}>
      {/* Header: source → target */}
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: 'var(--fg-primary)',
          marginBottom: 16,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={`${sourceName} ${arrow} ${targetName}`}
      >
        {sourceName} <span style={{ color: 'var(--fg-muted)' }}>{arrow}</span> {targetName}
      </div>

      {/* Type */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Type</label>
        <select
          style={inputStyle}
          defaultValue={safeRel.type}
          key={`type-${relationshipId}`}
          onChange={handleTypeChange}
        >
          {RELATIONSHIP_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Certainty */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Certainty</label>
        <select
          style={inputStyle}
          defaultValue={safeRel.certainty}
          key={`certainty-${relationshipId}`}
          onChange={handleCertaintyChange}
        >
          {CERTAINTY_LEVELS.map((c) => (
            <option key={c} value={c}>
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Label */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Label</label>
        <input
          style={inputStyle}
          defaultValue={safeRel.label ?? ''}
          key={`label-${relationshipId}`}
          placeholder="e.g. father of"
          onBlur={handleLabelBlur}
        />
      </div>

      {/* Chapter Revealed */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Chapter Revealed</label>
        <input
          style={inputStyle}
          type="number"
          min={1}
          defaultValue={safeRel.chapterRevealed}
          key={`ch-${relationshipId}`}
          onBlur={handleChapterBlur}
        />
      </div>

      {/* Notes */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Notes</label>
        <textarea
          style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
          rows={4}
          defaultValue={safeRel.notes ?? ''}
          key={`notes-${relationshipId}`}
          placeholder="Optional"
          onBlur={handleNotesBlur}
        />
      </div>
    </div>
  );
}
