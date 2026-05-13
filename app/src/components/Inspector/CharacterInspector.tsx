import { useEffect, useRef, useState } from 'react';
import type { Alias, CharacterRole } from '@/types';
import { updateCharacter } from '@/db/characters';
import { savePortrait, getPortrait } from '@/db/portraits';
import { useGraphStore } from '@/stores/graphStore';

const CHARACTER_ROLES: CharacterRole[] = [
  'detective',
  'suspect',
  'victim',
  'witness',
  'bystander',
  'other',
];

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

export interface CharacterInspectorProps {
  characterId: string;
  bookId: string;
}

export default function CharacterInspector({ characterId, bookId }: CharacterInspectorProps) {
  const characters = useGraphStore((s) => s.characters);
  const updateCharacterInStore = useGraphStore((s) => s.updateCharacterInStore);

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
      <div style={{ padding: 16, color: 'var(--fg-muted)', fontSize: 13 }}>
        Character not found.
      </div>
    );
  }

  async function persist(patch: Parameters<typeof updateCharacter>[1]) {
    const updated = await updateCharacter(characterId, patch);
    updateCharacterInStore(updated);
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
    <div style={{ padding: 16, overflowY: 'auto', height: '100%', boxSizing: 'border-box' }}>
      {/* Title */}
      <div
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: 'var(--fg-primary)',
          marginBottom: 16,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {character.name}
      </div>

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
                border: '1px solid var(--border)',
                borderRadius: 4,
                padding: '4px 7px',
                cursor: 'pointer',
                color: 'var(--fg-muted)',
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
            border: '1px dashed var(--border)',
            borderRadius: 4,
            color: 'var(--fg-muted)',
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
              border: '1px solid var(--border)',
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
            border: '1px solid var(--border)',
            borderRadius: 4,
            color: 'var(--fg-muted)',
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
  );
}
