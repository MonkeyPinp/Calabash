import { useEffect, useMemo, useState } from 'react';
import { Check, ListTodo, Plus, Trash2 } from 'lucide-react';
import type { OpenClue } from '@/types';
import { createOpenClue, deleteOpenClue, listOpenClues, updateOpenClue } from '@/db/books';
import { isOpenClueVisibleAtChapter } from '@/lib/clues';
import { useT } from '@/i18n';

const inputStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  height: 30,
  padding: '0 9px',
  border: '1px solid var(--ink-200)',
  borderRadius: 4,
  background: 'var(--bg-canvas)',
  color: 'var(--ink-900)',
  fontSize: 12,
  boxSizing: 'border-box',
  outline: 'none',
};

const iconButtonStyle: React.CSSProperties = {
  width: 30,
  height: 30,
  display: 'grid',
  placeItems: 'center',
  borderRadius: 4,
  border: '1px solid var(--ink-200)',
  background: 'var(--bg-panel)',
  color: 'var(--ink-600)',
  cursor: 'pointer',
  flexShrink: 0,
};

export default function OpenCluesPanel({
  bookId,
  currentChapter,
}: {
  bookId: string;
  currentChapter: number;
}) {
  const t = useT();
  const [clues, setClues] = useState<OpenClue[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void listOpenClues(bookId).then((items) => {
      if (!cancelled) setClues(items);
    });
    return () => { cancelled = true; };
  }, [bookId]);

  const visibleOpenClues = useMemo(
    () => clues.filter((clue) => clue.status === 'open' && isOpenClueVisibleAtChapter(clue, currentChapter)),
    [clues, currentChapter],
  );

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    setBusy(true);
    try {
      const clue = await createOpenClue({ bookId, text, chapterIntroduced: currentChapter });
      setClues((items) => [...items, clue]);
      setDraft('');
    } finally {
      setBusy(false);
    }
  }

  async function handleExplain(clue: OpenClue) {
    const updated = await updateOpenClue(bookId, clue.id, { status: 'explained' });
    setClues((items) => items.map((item) => item.id === clue.id ? updated : item));
  }

  async function handleDelete(clue: OpenClue) {
    await deleteOpenClue(bookId, clue.id);
    setClues((items) => items.filter((item) => item.id !== clue.id));
  }

  return (
    <section
      data-testid="open-clues-panel"
      style={{
        padding: 14,
        border: '1px solid var(--ink-200)',
        borderRadius: 6,
        background: 'var(--bg-panel)',
        boxShadow: '0 1px 0 rgba(0,0,0,.03)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div
          style={{
            width: 28,
            height: 28,
            display: 'grid',
            placeItems: 'center',
            border: '1px solid var(--ink-200)',
            borderRadius: 4,
            background: 'var(--bg-canvas)',
            color: 'var(--ink-700)',
            flexShrink: 0,
          }}
        >
          <ListTodo size={14} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-case-title)', fontSize: 14.5, color: 'var(--ink-900)', lineHeight: 1.15 }}>
            {t('clues.title')}
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--ink-500)', marginTop: 1 }}>
            {t('clues.visibleCount', { count: visibleOpenClues.length })}
          </div>
        </div>
      </div>

      <form onSubmit={(e) => void handleAdd(e)} style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t('clues.addPlaceholder')}
          aria-label={t('clues.addPlaceholder')}
          style={inputStyle}
        />
        <button
          type="submit"
          disabled={!draft.trim() || busy}
          title={t('clues.add')}
          aria-label={t('clues.add')}
          style={{ ...iconButtonStyle, opacity: !draft.trim() || busy ? 0.55 : 1 }}
        >
          <Plus size={14} />
        </button>
      </form>

      {visibleOpenClues.length === 0 ? (
        <div style={{ fontSize: 11.5, color: 'var(--ink-500)', lineHeight: 1.45, padding: '4px 1px 1px' }}>
          {t('clues.empty')}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {visibleOpenClues.map((clue) => (
            <div
              key={clue.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '24px 1fr auto 24px',
                alignItems: 'start',
                gap: 6,
                padding: '7px 6px',
                border: '1px solid var(--ink-150)',
                borderRadius: 4,
                background: 'var(--bg-canvas)',
              }}
            >
              <button
                type="button"
                onClick={() => void handleExplain(clue)}
                title={t('clues.markExplained')}
                aria-label={t('clues.markExplained')}
                style={{
                  width: 22,
                  height: 22,
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: 4,
                  border: '1px solid var(--ink-200)',
                  background: 'var(--bg-panel)',
                  color: 'var(--ink-500)',
                  cursor: 'pointer',
                }}
              >
                <Check size={12} />
              </button>
              <div style={{ minWidth: 0, fontSize: 12, color: 'var(--ink-800)', lineHeight: 1.35, overflowWrap: 'anywhere' }}>
                {clue.text}
              </div>
              <span
                style={{
                  padding: '2px 5px',
                  border: '1px solid var(--ink-200)',
                  borderRadius: 3,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 8.5,
                  color: 'var(--ink-500)',
                  background: 'var(--bg-panel)',
                  whiteSpace: 'nowrap',
                }}
              >
                {t('clues.chapterShort', { chapter: clue.chapterIntroduced })}
              </span>
              <button
                type="button"
                onClick={() => void handleDelete(clue)}
                title={t('clues.delete')}
                aria-label={t('clues.delete')}
                style={{
                  width: 22,
                  height: 22,
                  display: 'grid',
                  placeItems: 'center',
                  border: '1px solid transparent',
                  background: 'transparent',
                  color: 'var(--ink-400)',
                  cursor: 'pointer',
                }}
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
