import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { useGraphStore } from '@/stores/graphStore';
import { useBookStore } from '@/stores/bookStore';

interface GlobalSearchProps {
  onSelectCharacter: (id: string) => void;
  onSelectRelationship: (id: string) => void;
  onClose: () => void;
}

export default function GlobalSearch({ onSelectCharacter, onSelectRelationship, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const characters = useGraphStore((s) => s.characters);
  const relationships = useGraphStore((s) => s.relationships);
  const currentChapter = useBookStore((s) => s.currentChapter);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const q = query.trim().toLowerCase();

  const matchedChars = useMemo(() => {
    if (!q) return [];
    return characters
      .filter((c) => c.chapterIntroduced <= currentChapter)
      .filter((c) => {
        const haystack = [c.name, c.profession, c.notes, ...c.aliases.map((a) => a.name)]
          .filter(Boolean).join(' ').toLowerCase();
        return haystack.includes(q);
      })
      .slice(0, 8);
  }, [q, characters, currentChapter]);

  const matchedRels = useMemo(() => {
    if (!q) return [];
    const charMap = new Map(characters.map((c) => [c.id, c.name]));
    return relationships
      .filter((r) => r.chapterRevealed <= currentChapter)
      .filter((r) => {
        const src = charMap.get(r.sourceId) ?? '';
        const tgt = charMap.get(r.targetId) ?? '';
        const haystack = [r.label, r.type, r.notes, src, tgt].filter(Boolean).join(' ').toLowerCase();
        return haystack.includes(q);
      })
      .slice(0, 5);
  }, [q, relationships, characters, currentChapter]);

  const charMap = useMemo(() => new Map(characters.map((c) => [c.id, c.name])), [characters]);

  const hasResults = matchedChars.length + matchedRels.length > 0;

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: 80,
        background: 'rgba(0,0,0,0.35)',
        zIndex: 2000,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--bg-panel)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        width: 480,
        maxWidth: '90vw',
        overflow: 'hidden',
      }}>
        {/* Search input */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', gap: 8, borderBottom: q ? '1px solid var(--border)' : 'none' }}>
          <Search size={15} style={{ color: 'var(--fg-muted)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search characters and relationships…"
            style={{
              flex: 1, border: 'none', outline: 'none', fontSize: 14,
              background: 'transparent', color: 'var(--fg-primary)',
            }}
          />
          {query && (
            <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', padding: 2 }}>
              <X size={13} />
            </button>
          )}
        </div>

        {/* Results */}
        {q && (
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {!hasResults && (
              <div style={{ padding: '14px 16px', fontSize: 13, color: 'var(--fg-muted)' }}>
                No results for &ldquo;{query}&rdquo;
              </div>
            )}

            {matchedChars.length > 0 && (
              <>
                <div style={{ padding: '6px 14px 2px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--fg-muted)', textTransform: 'uppercase' }}>
                  Characters
                </div>
                {matchedChars.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { onSelectCharacter(c.id); onClose(); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      width: '100%', padding: '8px 14px',
                      background: 'none', border: 'none', cursor: 'pointer',
                      textAlign: 'left',
                    }}
                    className="search-result-row"
                  >
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-primary)' }}>{c.name}</span>
                    {c.profession && <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{c.profession}</span>}
                    <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--fg-muted)', flexShrink: 0 }}>Ch.{c.chapterIntroduced}</span>
                  </button>
                ))}
              </>
            )}

            {matchedRels.length > 0 && (
              <>
                <div style={{ padding: '6px 14px 2px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--fg-muted)', textTransform: 'uppercase' }}>
                  Relationships
                </div>
                {matchedRels.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => { onSelectRelationship(r.id); onClose(); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      width: '100%', padding: '8px 14px',
                      background: 'none', border: 'none', cursor: 'pointer',
                      textAlign: 'left',
                    }}
                    className="search-result-row"
                  >
                    <span style={{ fontSize: 13, color: 'var(--fg-primary)' }}>
                      {charMap.get(r.sourceId) ?? '?'} → {charMap.get(r.targetId) ?? '?'}
                    </span>
                    {r.label && <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{r.label}</span>}
                    <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--fg-muted)', flexShrink: 0 }}>{r.type}</span>
                  </button>
                ))}
              </>
            )}
          </div>
        )}

        <div style={{ padding: '6px 14px', fontSize: 11, color: 'var(--fg-muted)', borderTop: '1px solid var(--border)' }}>
          ↩ select &nbsp;·&nbsp; Esc close
        </div>
      </div>

      <style>{`
        .search-result-row:hover { background: color-mix(in srgb, var(--accent) 8%, var(--bg-panel)) !important; }
      `}</style>
    </div>
  );
}
