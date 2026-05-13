import { useRef, useState } from 'react';

export interface ChapterSliderProps {
  bookId: string;
  totalChapters: number;
  currentChapter: number;
  onChange: (n: number) => void;
  onCommit: (n: number) => void;
  onTotalChaptersChange?: (n: number) => void;
}

export default function ChapterSlider({
  bookId: _bookId,
  totalChapters,
  currentChapter,
  onChange,
  onCommit,
  onTotalChaptersChange,
}: ChapterSliderProps) {
  const [editingTotal, setEditingTotal] = useState(false);
  const [totalDraft, setTotalDraft] = useState('');
  const totalInputRef = useRef<HTMLInputElement>(null);
  const pct = totalChapters <= 1 ? 0 : ((currentChapter - 1) / (totalChapters - 1)) * 100;

  function startEditTotal() {
    if (!onTotalChaptersChange) return;
    setTotalDraft(String(totalChapters));
    setEditingTotal(true);
    setTimeout(() => { totalInputRef.current?.select(); }, 0);
  }

  function commitTotal() {
    const v = parseInt(totalDraft, 10);
    if (!isNaN(v) && v >= 1 && v !== totalChapters) {
      onTotalChaptersChange?.(v);
    }
    setEditingTotal(false);
  }

  return (
    <div
      style={{
        height: 76,
        padding: '12px 20px 16px',
        borderTop: '1px solid var(--ink-200)',
        background: 'var(--bg-panel)',
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        flexShrink: 0,
      }}
    >
      <div>
        <div style={{ fontSize: 9.5, color: 'var(--ink-400)', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600 }}>
          Chapter
        </div>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 22,
            fontWeight: 500,
            color: 'var(--ink-900)',
            lineHeight: 1.05,
            marginTop: 2,
            whiteSpace: 'nowrap',
          }}
        >
          {String(currentChapter).padStart(2, '0')}
          <span style={{ color: 'var(--ink-400)', fontWeight: 400 }}>/{totalChapters}</span>
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative', height: 38 }}>
        {Array.from({ length: Math.min(totalChapters, 120) }).map((_, i) => {
          const chapter = i + 1;
          const left = totalChapters <= 1 ? 0 : (i / (totalChapters - 1)) * 100;
          const isMark = chapter === 1 || chapter === totalChapters || chapter === currentChapter || chapter % 5 === 0;
          const passed = chapter <= currentChapter;
          return (
            <div
              key={chapter}
              style={{
                position: 'absolute',
                left: `${left}%`,
                top: 16,
                transform: 'translateX(-50%)',
                width: isMark ? 2 : 1,
                height: isMark ? 14 : 6,
                background: passed
                  ? (isMark ? 'var(--accent)' : 'var(--ink-400)')
                  : (isMark ? 'var(--ink-300)' : 'var(--ink-200)'),
                borderRadius: 1,
                pointerEvents: 'none',
              }}
            />
          );
        })}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 22, height: 2, background: 'var(--ink-200)', borderRadius: 1 }} />
        <div style={{ position: 'absolute', left: 0, top: 22, width: `${pct}%`, height: 2, background: 'var(--ink-700)', borderRadius: 1 }} />
        <div
          style={{
            position: 'absolute',
            left: `${pct}%`,
            top: 23,
            transform: 'translate(-50%, -50%)',
            width: 14,
            height: 14,
            borderRadius: 999,
            background: 'var(--bg-panel)',
            border: '2px solid var(--ink-900)',
            boxShadow: 'var(--shadow-soft)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: `${pct}%`,
            top: -4,
            transform: 'translateX(-50%)',
            padding: '2px 6px',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            background: 'var(--ink-900)',
            color: 'var(--bg-panel)',
            borderRadius: 3,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          Ch {currentChapter}
        </div>
        <input
          type="range"
          min={1}
          max={totalChapters}
          value={currentChapter}
          onChange={(e) => onChange(Number(e.target.value))}
          onMouseUp={(e) => onCommit(Number((e.target as HTMLInputElement).value))}
          onTouchEnd={(e) => onCommit(Number((e.target as HTMLInputElement).value))}
          aria-label="Current chapter"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            opacity: 0,
            cursor: 'pointer',
          }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ fontSize: 10, color: 'var(--ink-400)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>
          Of
        </div>
        {editingTotal ? (
          <input
            ref={totalInputRef}
            type="number"
            min={1}
            value={totalDraft}
            onChange={(e) => setTotalDraft(e.target.value)}
            onBlur={commitTotal}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitTotal();
              if (e.key === 'Escape') setEditingTotal(false);
            }}
            style={{
              width: 44,
              padding: '4px 6px',
              textAlign: 'center',
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              background: 'var(--bg-canvas)',
              border: '1px solid var(--accent)',
              color: 'var(--ink-900)',
              borderRadius: 4,
              outline: 'none',
            }}
          />
        ) : (
          <button
            type="button"
            onClick={startEditTotal}
            title={onTotalChaptersChange ? 'Click to change total chapters' : undefined}
            style={{
              width: 38,
              padding: '4px 6px',
              textAlign: 'center',
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              background: 'var(--bg-canvas)',
              border: '1px solid var(--ink-200)',
              color: 'var(--ink-800)',
              borderRadius: 4,
              cursor: onTotalChaptersChange ? 'text' : 'default',
            }}
          >
            {totalChapters}
          </button>
        )}
      </div>
    </div>
  );
}
