import { useEffect, useRef, useState } from 'react';
import { Trash2, Copy } from 'lucide-react';
import type { Alias, CharacterRole } from '@/types';
import { updateCharacter, deleteCharacter, restoreCharacter, createCharacter } from '@/db/characters';
import { deleteRelationship, restoreRelationship } from '@/db/relationships';
import { savePortrait, getPortrait } from '@/db/portraits';
import { useGraphStore } from '@/stores/graphStore';

const CHARACTER_ROLES: CharacterRole[] = [
  'detective',
  'suspect',
  'victim',
  'witness',
  'bystander',
  'murderer',
  'other',
];

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

export interface CharacterInspectorProps {
  characterId: string;
  bookId: string;
  onDeleted?: () => void;
  onDuplicated?: (newId: string) => void;
}

export default function CharacterInspector({ characterId, bookId, onDeleted, onDuplicated }: CharacterInspectorProps) {
  const characters = useGraphStore((s) => s.characters);
  const relationships = useGraphStore((s) => s.relationships);
  const updateCharacterInStore = useGraphStore((s) => s.updateCharacterInStore);
  const addCharacter = useGraphStore((s) => s.addCharacter);
  const removeCharacter = useGraphStore((s) => s.removeCharacter);
  const addRelationship = useGraphStore((s) => s.addRelationship);
  const removeRelationship = useGraphStore((s) => s.removeRelationship);
  const pushUndo = useGraphStore((s) => s.pushUndo);

  const character = characters.find((c) => c.id === characterId);

  const [portraitUrl, setPortraitUrl] = useState<string | null>(null);
  const prevPortraitUrlRef = useRef<string | null>(null);

  // Load portrait when character changes
  useEffect(() => {
    let cancelled = false;
    if (character?.portraitId) {
      void getPortrait(character.portraitId).then((p) => {
        if (cancelled || !p) return;
        const url = URL.createObjectURL(p.blob);
        // Revoke previous
        if (prevPortraitUrlRef.current) URL.revokeObjectURL(prevPortraitUrlRef.current);
        prevPortraitUrlRef.current = url;
        setPortraitUrl(url);
      });
    } else {
      if (prevPortraitUrlRef.current) {
        URL.revokeObjectURL(prevPortraitUrlRef.current);
        prevPortraitUrlRef.current = null;
      }
      setPortraitUrl(null);
    }
    return () => { cancelled = true; };
  }, [character?.portraitId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (prevPortraitUrlRef.current) {
        URL.revokeObjectURL(prevPortraitUrlRef.current);
        prevPortraitUrlRef.current = null;
      }
    };
  }, []);

  if (!character) {
    return (
      <div style={{ padding: 16, color: 'var(--ink-500)', fontSize: 13 }}>
        Character not found.
      </div>
    );
  }

  async function persist(patch: Parameters<typeof updateCharacter>[1]) {
    const updated = await updateCharacter(characterId, patch);
    updateCharacterInStore(updated);
  }

  async function handleDelete() {
    const relsToDelete = relationships.filter(
      (r) => r.sourceId === characterId || r.targetId === characterId,
    );
    for (const rel of relsToDelete) { await deleteRelationship(rel.id); removeRelationship(rel.id); }
    await deleteCharacter(characterId);
    removeCharacter(characterId);
    pushUndo(
      async () => {
        await restoreCharacter(character!);
        addCharacter(character!);
        for (const rel of relsToDelete) { await restoreRelationship(rel); addRelationship(rel); }
      },
      async () => {
        for (const rel of relsToDelete) { await deleteRelationship(rel.id); removeRelationship(rel.id); }
        await deleteCharacter(characterId);
        removeCharacter(characterId);
      },
    );
    onDeleted?.();
  }

  async function handleDuplicate() {
    if (!character) return;
    const copy = await createCharacter({
      bookId,
      name: `${character.name} (copy)`,
      role: character.role,
      roleReveals: character.roleReveals?.map((reveal) => ({ ...reveal })),
      chapterIntroduced: character.chapterIntroduced,
      aliases: character.aliases.map((a) => ({ ...a, name: `${a.name} (copy)` })),
      profession: character.profession,
      socialPosition: character.socialPosition,
      notes: character.notes,
      position: { x: character.position.x + 40, y: character.position.y + 40 },
    });
    addCharacter(copy);
    pushUndo(
      async () => { await deleteCharacter(copy.id); removeCharacter(copy.id); },
      async () => { await restoreCharacter(copy); addCharacter(copy); },
    );
    onDuplicated?.(copy.id);
  }

  // ── Field handlers ──────────────────────────────────────────────────────────

  function handleNameBlur(e: React.FocusEvent<HTMLInputElement>) {
    const val = e.target.value.trim();
    if (val && val !== character!.name) void persist({ name: val });
  }

  function handleRoleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    void persist({ role: e.target.value as CharacterRole });
  }

  function handleChapterBlur(e: React.FocusEvent<HTMLInputElement>) {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val >= 1 && val !== character!.chapterIntroduced) {
      void persist({ chapterIntroduced: val });
    }
  }

  function handleProfessionBlur(e: React.FocusEvent<HTMLInputElement>) {
    const val = e.target.value;
    if (val !== (character!.profession ?? '')) void persist({ profession: val || undefined });
  }

  function handleNotesBlur(e: React.FocusEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    if (val !== (character!.notes ?? '')) void persist({ notes: val || undefined });
  }

  // ── Alias handlers ──────────────────────────────────────────────────────────

  function handleAliasNameBlur(idx: number, e: React.FocusEvent<HTMLInputElement>) {
    const aliases: Alias[] = character!.aliases.map((a, i) =>
      i === idx ? { ...a, name: e.target.value } : a,
    );
    void persist({ aliases });
  }

  function handleAliasChapterBlur(idx: number, e: React.FocusEvent<HTMLInputElement>) {
    const val = parseInt(e.target.value, 10);
    if (isNaN(val) || val < 1) return;
    const aliases: Alias[] = character!.aliases.map((a, i) =>
      i === idx ? { ...a, chapterRevealed: val } : a,
    );
    void persist({ aliases });
  }

  function handleAddAlias() {
    const aliases: Alias[] = [
      ...character!.aliases,
      { name: '', chapterRevealed: character!.chapterIntroduced },
    ];
    void persist({ aliases });
  }

  function handleRemoveAlias(idx: number) {
    const aliases: Alias[] = character!.aliases.filter((_, i) => i !== idx);
    void persist({ aliases });
  }

  // ── Portrait handler ────────────────────────────────────────────────────────

  async function handlePortraitChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const portrait = await savePortrait({ bookId, blob: file, mimeType: file.type });
    await persist({ portraitId: portrait.id });
    // Revoke old URL
    if (prevPortraitUrlRef.current) URL.revokeObjectURL(prevPortraitUrlRef.current);
    const url = URL.createObjectURL(file);
    prevPortraitUrlRef.current = url;
    setPortraitUrl(url);
    e.target.value = '';
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        style={{
          padding: '14px 16px 12px',
          borderBottom: '1px solid var(--ink-200)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
          flexShrink: 0,
        }}
      >
        {portraitUrl ? (
          <img
            src={portraitUrl}
            alt=""
            style={{
              width: 44,
              height: 44,
              objectFit: 'cover',
              borderRadius: 4,
              border: '1px solid var(--ink-200)',
              flexShrink: 0,
            }}
          />
        ) : (
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 4,
              background: 'var(--bg-canvas)',
              border: '1px solid var(--ink-200)',
              display: 'grid',
              placeItems: 'center',
              fontFamily: 'var(--font-display)',
              fontSize: 19,
              fontWeight: 500,
              color: `var(--role-${character.role})`,
              flexShrink: 0,
            }}
          >
            {character.name.trim().charAt(0).toUpperCase()}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 18,
              fontWeight: 500,
              color: 'var(--ink-900)',
              letterSpacing: '-0.005em',
              lineHeight: 1.15,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {character.name}
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-500)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {[character.profession, `introduced ch. ${character.chapterIntroduced}`].filter(Boolean).join(' · ')}
          </div>
        </div>
        <button
          onClick={() => void handleDuplicate()}
          title="Duplicate character"
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
          title="Delete character"
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

      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--ink-200)', padding: '0 12px', flexShrink: 0 }}>
        {['Details', 'Aliases', 'Notes'].map((tab, index) => (
          <div
            key={tab}
            style={{
              padding: '8px 10px 9px',
              fontSize: 12,
              fontWeight: index === 0 ? 600 : 500,
              color: index === 0 ? 'var(--ink-900)' : 'var(--ink-500)',
              borderBottom: index === 0 ? '2px solid var(--ink-900)' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {tab}
          </div>
        ))}
      </div>

      <div style={{ padding: 16, overflowY: 'auto', flex: 1, boxSizing: 'border-box' }}>

      {/* Name */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Name</label>
        <input
          style={inputStyle}
          defaultValue={character.name}
          key={`name-${characterId}`}
          onBlur={handleNameBlur}
        />
      </div>

      {/* Role */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Role</label>
        <select
          style={inputStyle}
          defaultValue={character.role}
          key={`role-${characterId}`}
          onChange={handleRoleChange}
        >
          {CHARACTER_ROLES.map((r) => (
            <option key={r} value={r}>
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Chapter Introduced */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Chapter Introduced</label>
        <input
          style={inputStyle}
          type="number"
          min={1}
          defaultValue={character.chapterIntroduced}
          key={`ch-${characterId}`}
          onBlur={handleChapterBlur}
        />
      </div>

      {/* Profession */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Profession</label>
        <input
          style={inputStyle}
          defaultValue={character.profession ?? ''}
          key={`prof-${characterId}`}
          placeholder="Optional"
          onBlur={handleProfessionBlur}
        />
      </div>

      {/* Notes */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Notes</label>
        <textarea
          style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
          rows={4}
          defaultValue={character.notes ?? ''}
          key={`notes-${characterId}`}
          placeholder="Optional"
          onBlur={handleNotesBlur}
        />
      </div>

      {/* Aliases */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Aliases</label>
        {character.aliases.map((alias, idx) => (
          <div
            key={idx}
            style={{ display: 'flex', gap: 4, marginBottom: 6, alignItems: 'center' }}
          >
            <input
              style={{ ...inputStyle, flex: 2 }}
              defaultValue={alias.name}
              key={`alias-name-${characterId}-${idx}`}
              placeholder="Alias name"
              onBlur={(e) => handleAliasNameBlur(idx, e)}
            />
            <input
              style={{ ...inputStyle, flex: 1, width: 'auto' }}
              type="number"
              min={1}
              defaultValue={alias.chapterRevealed}
              key={`alias-ch-${characterId}-${idx}`}
              title="Chapter revealed"
              onBlur={(e) => handleAliasChapterBlur(idx, e)}
            />
            <button
              onClick={() => handleRemoveAlias(idx)}
              title="Remove alias"
              style={{
                background: 'transparent',
                border: '1px solid var(--ink-200)',
                borderRadius: 4,
                padding: '4px 7px',
                cursor: 'pointer',
                color: 'var(--ink-500)',
                fontSize: 13,
                lineHeight: 1,
                flexShrink: 0,
              }}
            >
              ×
            </button>
          </div>
        ))}
        <button
          onClick={handleAddAlias}
          style={{
            fontSize: 12,
            padding: '4px 10px',
            background: 'transparent',
            border: '1px dashed var(--ink-300)',
            borderRadius: 4,
            color: 'var(--ink-600)',
            cursor: 'pointer',
            marginTop: 2,
          }}
        >
          + Add alias
        </button>
      </div>

      {/* Portrait */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Portrait</label>
        {portraitUrl && (
          <img
            src={portraitUrl}
            alt="Portrait"
            style={{
              display: 'block',
              width: 72,
              height: 72,
              objectFit: 'cover',
              borderRadius: 4,
              border: '1px solid var(--ink-200)',
              marginBottom: 8,
            }}
          />
        )}
        <label
          style={{
            display: 'inline-block',
            fontSize: 12,
            padding: '4px 10px',
            background: 'transparent',
            border: '1px solid var(--ink-200)',
            borderRadius: 4,
            color: 'var(--ink-600)',
            cursor: 'pointer',
          }}
        >
          Upload portrait
          <input
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => void handlePortraitChange(e)}
          />
        </label>
      </div>
    </div>
    </div>
  );
}
