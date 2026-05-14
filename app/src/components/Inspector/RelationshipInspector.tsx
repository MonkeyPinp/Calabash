import { Trash2, Copy } from 'lucide-react';
import type { CertaintyLevel } from '@/types';
import { createRelationship, updateRelationship, deleteRelationship, restoreRelationship } from '@/db/relationships';
import { useGraphStore } from '@/stores/graphStore';
import { useT } from '@/i18n';
import {
  directedOverrideForChoice,
  formatRelationshipType,
  getRelationshipTypeCssVar,
  isRelationshipDirected,
  normalizeRelationshipType,
  orientRelationshipEndpoints,
  type RelationshipDirectionChoice,
  RELATIONSHIP_TYPE_PRESETS,
} from '@/lib/relationshipTypes';
import PresetTextInput from '@/components/Form/PresetTextInput';
import DirectionSegmentedControl from '@/components/Form/DirectionSegmentedControl';

const CERTAINTY_LEVELS: CertaintyLevel[] = ['confirmed', 'suspected', 'disproven'];

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 9.5, fontWeight: 600,
  letterSpacing: '0.11em', textTransform: 'uppercase',
  color: 'var(--ink-500)', marginBottom: 6,
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '6px 9px', fontSize: 13,
  border: '1px solid var(--ink-200)', borderRadius: 4,
  background: 'var(--bg-canvas)', color: 'var(--ink-900)',
  boxSizing: 'border-box', outline: 'none',
};
const fieldStyle: React.CSSProperties = { marginBottom: 14 };

export interface RelationshipInspectorProps {
  relationshipId: string;
  bookId: string;
  onDeleted?: () => void;
  onDuplicated?: (newId: string) => void;
}

export default function RelationshipInspector({
  relationshipId,
  bookId,
  onDeleted,
  onDuplicated,
}: RelationshipInspectorProps) {
  const t = useT();
  const relationships = useGraphStore((s) => s.relationships);
  const characters   = useGraphStore((s) => s.characters);
  const updateRelationshipInStore = useGraphStore((s) => s.updateRelationshipInStore);
  const addRelationship = useGraphStore((s) => s.addRelationship);
  const removeRelationship = useGraphStore((s) => s.removeRelationship);
  const pushUndo = useGraphStore((s) => s.pushUndo);

  const rel = relationships.find((r) => r.id === relationshipId);
  if (!rel) return <div style={{ padding: 16, color: 'var(--ink-500)', fontSize: 13 }}>{t('relationship.notFound')}</div>;

  const sourceName = characters.find((c) => c.id === rel.sourceId)?.name ?? rel.sourceId;
  const targetName = characters.find((c) => c.id === rel.targetId)?.name ?? rel.targetId;

  const relationshipDirected = isRelationshipDirected(rel);
  const relationshipColor = getRelationshipTypeCssVar(rel.type);
  const relationshipTypeLabel = formatRelationshipType(rel.type, t);
  const headerArrow = relationshipDirected ? '→' : '—';
  const directionChoice: RelationshipDirectionChoice = relationshipDirected ? 'forward' : 'undirected';

  async function persist(patch: Parameters<typeof updateRelationship>[1]) {
    const updated = await updateRelationship(relationshipId, patch);
    updateRelationshipInStore(updated);
  }

  async function handleDelete() {
    await deleteRelationship(relationshipId);
    removeRelationship(relationshipId);
    pushUndo(
      async () => { await restoreRelationship(rel!); addRelationship(rel!); },
      async () => { await deleteRelationship(relationshipId); removeRelationship(relationshipId); },
    );
    onDeleted?.();
  }

  async function handleDuplicate() {
    if (!rel) return;
    const copy = await createRelationship({
      bookId,
      sourceId: rel.sourceId,
      targetId: rel.targetId,
      type: rel.type,
      directed: rel.directed,
      certainty: rel.certainty,
      label: rel.label ? `${rel.label} (copy)` : undefined,
      chapterRevealed: rel.chapterRevealed,
      notes: rel.notes,
    });
    addRelationship(copy);
    pushUndo(
      async () => { await deleteRelationship(copy.id); removeRelationship(copy.id); },
      async () => { await restoreRelationship(copy); addRelationship(copy); },
    );
    onDuplicated?.(copy.id);
  }

  const typeOptions = RELATIONSHIP_TYPE_PRESETS.map((type) => ({
    value: type,
    label: formatRelationshipType(type, t),
  }));

  function handleTypeCommit(value: string) {
    const nextType = normalizeRelationshipType(value);
    if (nextType !== rel!.type) {
      void persist({
        type: nextType,
        directed: directedOverrideForChoice(nextType, directionChoice),
      });
    }
  }

  async function handleDirectionChange(direction: RelationshipDirectionChoice) {
    const endpoints = orientRelationshipEndpoints(rel!.sourceId, rel!.targetId, direction);
    await persist({
      ...endpoints,
      directed: directedOverrideForChoice(rel!.type, direction),
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid var(--ink-200)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 9.5, color: 'var(--ink-400)', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600 }}>
              {t('app.inspectRelationship')}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginTop: 6,
                fontFamily: 'var(--font-display)',
                fontSize: 16,
                color: 'var(--ink-900)',
                minWidth: 0,
              }}
              title={`${sourceName} ${headerArrow} ${targetName}`}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sourceName}</span>
              <span style={{ color: relationshipColor, flexShrink: 0 }}>{headerArrow}</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{targetName}</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-500)', marginTop: 3 }}>
              {[rel.label || relationshipTypeLabel, t(`certainty.${rel.certainty}`), t('relationship.revealedChapterShort', { chapter: rel.chapterRevealed })].filter(Boolean).join(' · ')}
            </div>
          </div>
          <button
            onClick={() => void handleDuplicate()}
            title={t('relationship.duplicate')}
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
            title={t('relationship.delete')}
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
      {/* Header + action buttons */}
      <div style={{ display: 'none' }}>
        <div style={{
          flex: 1,
          fontSize: 14, fontWeight: 700, color: 'var(--ink-900)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }} title={`${sourceName} ${headerArrow} ${targetName}`}>
          {sourceName} <span style={{ color: 'var(--ink-500)' }}>{headerArrow}</span> {targetName}
        </div>
        <button
          onClick={() => void handleDuplicate()}
          title={t('relationship.duplicate')}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '4px 8px', fontSize: 11,
            background: 'transparent', border: '1px solid var(--ink-200)',
            borderRadius: 4, cursor: 'pointer', color: 'var(--ink-500)',
            flexShrink: 0,
          }}
        >
          <Copy size={11} /> {t('relationship.duplicate')}
        </button>
        <button
          onClick={() => void handleDelete()}
          title={t('relationship.delete')}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '4px 8px', fontSize: 11,
            background: 'transparent', border: '1px solid var(--ink-200)',
            borderRadius: 4, cursor: 'pointer', color: '#c0392b',
            flexShrink: 0,
          }}
        >
          <Trash2 size={11} /> {t('relationship.delete')}
        </button>
      </div>

      {/* Type */}
      <div style={fieldStyle}>
        <label style={labelStyle}>{t('relationship.type')}</label>
        <PresetTextInput
          style={inputStyle}
          options={typeOptions}
          defaultValue={rel.type ?? ''}
          key={`type-${relationshipId}`}
          placeholder={t('common.optional')}
          onValueCommit={handleTypeCommit}
        />
      </div>

      {/* Direction */}
      <div style={fieldStyle}>
        <label style={labelStyle}>{t('relationship.direction')}</label>
        <DirectionSegmentedControl
          value={directionChoice}
          sourceName={sourceName}
          targetName={targetName}
          onChange={(direction) => void handleDirectionChange(direction)}
        />
      </div>

      {/* Certainty */}
      <div style={fieldStyle}>
        <label style={labelStyle}>{t('relationship.certainty')}</label>
        <div style={{ display: 'flex', gap: 6 }}>
          {CERTAINTY_LEVELS.map((c) => {
            const active = c === rel.certainty;
            return (
              <button
                key={c}
                type="button"
                onClick={() => void persist({ certainty: c as CertaintyLevel })}
                style={{
                  flex: 1,
                  padding: '8px 4px',
                  background: active ? 'var(--bg-canvas)' : 'transparent',
                  border: `1px solid ${active ? 'var(--ink-700)' : 'var(--ink-200)'}`,
                  borderRadius: 4,
                  color: active ? 'var(--ink-900)' : 'var(--ink-500)',
                  fontSize: 11,
                  fontWeight: active ? 600 : 500,
                  cursor: 'pointer',
                }}
              >
                {t(`certainty.${c}`)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Label */}
      <div style={fieldStyle}>
        <label style={labelStyle}>{t('relationship.label')}</label>
        <input style={inputStyle} defaultValue={rel.label ?? ''} key={`label-${relationshipId}`}
          placeholder={t('relationship.labelInspectorPlaceholder')}
          onBlur={(e) => { const v = e.target.value; if (v !== (rel.label ?? '')) void persist({ label: v || undefined }); }}
        />
      </div>

      {/* Chapter Revealed */}
      <div style={fieldStyle}>
        <label style={labelStyle}>{t('relationship.chapterRevealed')}</label>
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
        <label style={labelStyle}>{t('relationship.notes')}</label>
        <textarea style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
          rows={4} defaultValue={rel.notes ?? ''} key={`notes-${relationshipId}`}
          placeholder={t('common.optional')}
          onBlur={(e) => { const v = e.target.value; if (v !== (rel.notes ?? '')) void persist({ notes: v || undefined }); }}
        />
      </div>
      </div>
    </div>
  );
}
