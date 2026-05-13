export interface ChapterSliderProps {
  bookId: string;
  totalChapters: number;
  currentChapter: number;
  onChange: (n: number) => void;
  onCommit: (n: number) => void;
}

const btnStyle = (disabled: boolean): React.CSSProperties => ({
  background: 'transparent',
  border: '1px solid var(--border)',
  borderRadius: 4,
  width: 28,
  height: 28,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: disabled ? 'not-allowed' : 'pointer',
  color: disabled ? 'var(--border)' : 'var(--fg-muted)',
  fontSize: 14,
  flexShrink: 0,
  userSelect: 'none',
});

export default function ChapterSlider({
  bookId: _bookId,
  totalChapters,
  currentChapter,
  onChange,
  onCommit,
}: ChapterSliderProps) {
  function step(delta: number) {
    const next = Math.max(1, Math.min(totalChapters, currentChapter + delta));
    onChange(next);
    onCommit(next);
  }

  return (
    <div
      style={{
        padding: '8px 14px',
        borderTop: '1px solid var(--border)',
        background: 'var(--bg-panel)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      {/* Prev button */}
      <button
        onClick={() => step(-1)}
        disabled={currentChapter <= 1}
        style={btnStyle(currentChapter <= 1)}
        aria-label="Previous chapter"
        title="Previous chapter"
      >
        ‹
      </button>

      {/* Slider area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--fg-muted)', fontWeight: 500 }}>Chapter</span>
          <span style={{ fontSize: 11, color: 'var(--fg-muted)', fontWeight: 600 }}>
            {currentChapter} / {totalChapters}
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={totalChapters}
          value={currentChapter}
          onChange={(e) => onChange(Number(e.target.value))}
          onMouseUp={(e) => onCommit(Number((e.target as HTMLInputElement).value))}
          onTouchEnd={(e) => onCommit(Number((e.target as HTMLInputElement).value))}
          style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }}
        />
      </div>

      {/* Next button */}
      <button
        onClick={() => step(1)}
        disabled={currentChapter >= totalChapters}
        style={btnStyle(currentChapter >= totalChapters)}
        aria-label="Next chapter"
        title="Next chapter"
      >
        ›
      </button>
    </div>
  );
}
