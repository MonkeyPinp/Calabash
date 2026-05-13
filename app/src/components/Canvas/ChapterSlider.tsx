export interface ChapterSliderProps {
  bookId: string;
  totalChapters: number;
  currentChapter: number;
  /** Fires on every slider move — update UI state only, no DB write */
  onChange: (n: number) => void;
  /** Fires on mouseUp/touchEnd — write to Dexie once per drag */
  onCommit: (n: number) => void;
}

export default function ChapterSlider({
  totalChapters,
  currentChapter,
  onChange,
  onCommit,
}: ChapterSliderProps) {
  return (
    <div
      style={{
        padding: '10px 16px',
        borderTop: '1px solid var(--border)',
        background: 'var(--bg-panel)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 6,
        }}
      >
        <span style={{ fontSize: 12, color: 'var(--fg-primary)', fontWeight: 500 }}>
          Chapter
        </span>
        <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
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
        style={{
          width: '100%',
          accentColor: 'var(--accent)',
          cursor: 'pointer',
        }}
      />
    </div>
  );
}
