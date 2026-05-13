import type { RelationshipDirection, RelationshipType, CertaintyLevel } from '@/types';
import { updateRelationship } from '@/db/relationships';
import { useGraphStore } from '@/stores/graphStore';
import { isDirected } from '@/lib/relationshipTypes';

const RELATIONSHIP_TYPES: RelationshipType[] = [
  'family', 'professional', 'romantic', 'hostile', 'suspicion', 'other',
];
const CERTAINTY_LEVELS: CertaintyLevel[] = ['confirmed', 'suspected', 'disproven'];

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 10, fontWeight: 600,
  letterSpacing: '0.07em', textTransform: 'uppercase',
  color: 'var(--fg-muted)', marginBottom: 4,
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '5px 8px', fontSize: 13,
  border: '1px solid var(--border)', borderRadius: 4,
  background: 'var(--bg-canvas)', color: 'var(--fg-primary)',
  boxSizing: 'border-box', outline: 'none',
};
const fieldStyle: React.CSSProperties = { marginBottom: 14 };

const DIRECTION_OPTIONS: { value: RelationshipDirection; label: string }[] = [
  { value: 'forward',  label: '→  One-way (A → B)' },
  { value: 'backward', label: '←  One-way (A ← B)' },
  { value: 'both',     label: '↔  Both directions' },
  { value: 'none',     label: '—  No arrow' },
];

export default function RelationshipInspector({ relationshipId }: { relationshipId: string }) {
  const relationships = useGraphStore((s) => s.relationships);
  const characters   = useGraphStore((s) => s.characters);
  const updateRelationshipInStore = useGraphStore((s) => s.updateRelationshipInStore);

  const rel = relationships.find((r) => r.id === relationshipId);
  if (!rel) return <div style={{ padding: 16, color: 'var(--fg-muted)', fontSize: 13 }}>Relationship not found.</div>;

  const sourceName = characters.find((c) => c.id === rel.sourceId)?.name ?? rel.sourceId;
  const targetName = characters.find((c) => c.id === rel.targetId)?.name ?? rel.targetId;

  // Effective direction for display in header
  const effectiveDir = rel.direction ?? (isDirected(rel.type) ? 'forward' : 'none');
  const headerArrow = effectiveDir === 'forward' ? '→' : effectiveDir === 'backward' ? '←' : effectiveDir === 'both' ? '↔' : '—';

  async function persist(patch: Parameters<typeof updateRelationship>[1]) {
    const updated = await updateRelationship(relationshipId, patch);
    updateRelationshipInStore(updated);
  }

  return (
    <div style={{ padding: 16, overflowY: 'auto', height: '100%', boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{
        fontSize: 14, fontWeight: 700, color: 'var(--fg-primary)',
        marginBottom: 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }} title={`${sourceName} ${headerArrow} ${targetName}`}>
        {sourceName} <span style={{ color: 'var(--fg-muted)' }}>{headerArrow}</span> {targetName}
      </div>

      {/* Type */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Type</label>
        <select style={inputStyle} defaultValue={rel.type} key={`type-${relationshipId}`}
          onChange={(e) => void persist({ type: e.target.value as RelationshipType })}>
          {RELATIONSHIP_TYPES.map((t) => (
            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Direction */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Arrow direction</label>
        <select style={inputStyle} value={rel.direction ?? 'auto'} key={`dir-${relationshipId}`}
          onChange={(e) => {
            const v = e.target.value;
            void persist({ direction: v === 'auto' ? undefined : v as RelationshipDirection });
          }}>
          <option value="auto">Auto (from type)</option>
          {DIRECTION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Certainty */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Certainty</label>
        <select style={inputStyle} defaultValue={rel.certainty} key={`certainty-${relationshipId}`}
          onChange={(e) => void persist({ certainty: e.target.value as CertaintyLevel })}>
          {CERTAINTY_LEVELS.map((c) => (
            <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Label */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Label</label>
        <input style={inputStyle} defaultValue={rel.label ?? ''} key={`label-${relationshipId}`}
          placeholder="e.g. father of"
          onBlur={(e) => { const v = e.target.value; if (v !== (rel.label ?? '')) void persist({ label: v || undefined }); }}
        />
      </div>

      {/* Chapter Revealed */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Chapter Revealed</label>
        <input style={inputStyle} type="number" min={1}
          defaultValue={rel.chapterRevealed} key={`ch-${relationshipId}`}
          onBlur={(e) => {
            const v = parseInt(e.target.value, 10);
            if (!isNaN(v) && v >= 1 && v !== rel.chapterRevealed) void persist({ chapterRevealed: v });
          }}
        />
      </div>

      {/* Notes */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Notes</label>
        <textarea style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
          rows={4} defaultValue={rel.notes ?? ''} key={`notes-${relationshipId}`}
          placeholder="Optional"
          onBlur={(e) => { const v = e.target.value; if (v !== (rel.notes ?? '')) void persist({ notes: v || undefined }); }}
        />
      </div>
    </div>
  );
}
