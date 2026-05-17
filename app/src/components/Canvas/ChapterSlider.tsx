import { useRef, useState, type CSSProperties } from 'react';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { useT } from '@/i18n';

export type ChapterSliderMarkKind = 'highlight' | 'reveal' | 'protected';

export interface ChapterSliderMark {
  chapter: number;
  kind: ChapterSliderMarkKind;
  label: string;
}

export interface ChapterSliderProps {
  bookId: string;
  totalChapters: number;
  currentChapter: number;
  currentChapterHighlighted?: boolean;
  marks?: ChapterSliderMark[];
  onChange: (n: number) => void;
  onCommit: (n: number) => void;
  onToggleCurrentChapterHighlight?: () => void;
  onTotalChaptersChange?: (n: number) => void;
}

export default function ChapterSlider({
  bookId: _bookId,
  totalChapters,
  currentChapter,
  currentChapterHighlighted = false,
  marks = [],
  onChange,
  onCommit,
  onToggleCurrentChapterHighlight,
  onTotalChaptersChange,
}: ChapterSliderProps) {
  const t = useT();
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

  function goToChapter(nextChapter: number) {
    const bounded = Math.max(1, Math.min(totalChapters, nextChapter));
    if (bounded === currentChapter) return;
    onChange(bounded);
    onCommit(bounded);
  }

  const normalizedMarks = marks
    .filter((mark) => mark.chapter >= 1 && mark.chapter <= totalChapters)
    .sort((a, b) => a.chapter - b.chapter);

  return (
    <div
      className="chapter-slider"
      style={{
        height: 88,
        padding: '13px 20px 16px',
        borderTop: '1px solid var(--ink-200)',
        background: 'var(--bg-panel)',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        flexShrink: 0,
      }}
    >
      <div style={{ minWidth: 0, flexShrink: 0 }}>
        <div style={{ fontSize: 9.5, color: 'var(--ink-400)', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600 }}>
          {t('chapterSlider.chapter')}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 24,
              fontWeight: 500,
              color: 'var(--ink-900)',
              lineHeight: 1.05,
              whiteSpace: 'nowrap',
            }}
          >
            {String(currentChapter).padStart(2, '0')}
            <span style={{ color: 'var(--ink-400)', fontWeight: 400, fontSize: 16 }}>/{totalChapters}</span>
          </div>
          <button
            type="button"
            onClick={onToggleCurrentChapterHighlight}
            disabled={!onToggleCurrentChapterHighlight}
            aria-pressed={currentChapterHighlighted}
            aria-label={currentChapterHighlighted ? t('app.removeChapterHighlight') : t('app.highlightChapter')}
            title={currentChapterHighlighted ? t('app.removeChapterHighlight') : t('app.highlightChapter')}
            style={highlightButtonStyle(currentChapterHighlighted, !onToggleCurrentChapterHighlight)}
          >
            <Star size={13} fill={currentChapterHighlighted ? 'currentColor' : 'none'} />
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => goToChapter(currentChapter - 1)}
        disabled={currentChapter <= 1}
        aria-label={t('chapterSlider.previous')}
        title={t('chapterSlider.previous')}
        style={chapterStepButtonStyle(currentChapter <= 1)}
      >
        <ChevronLeft size={14} />
      </button>

      <div style={{ flex: 1, position: 'relative', height: 46, minWidth: 120 }}>
        {normalizedMarks.map((mark, index) => {
          const left = totalChapters <= 1 ? 0 : ((mark.chapter - 1) / (totalChapters - 1)) * 100;
          const passed = mark.chapter <= currentChapter;
          const isProtected = mark.kind === 'protected';
          const isHighlight = mark.kind === 'highlight';
          return (
            <div
              key={`${mark.kind}-${mark.chapter}-${index}`}
              title={mark.label}
              style={{
                position: 'absolute',
                left: `${left}%`,
                top: 4,
                transform: 'translateX(-50%)',
                width: isProtected ? 9 : isHighlight ? 10 : 8,
                height: isProtected ? 9 : isHighlight ? 10 : 8,
                borderRadius: 999,
                background: isProtected
                  ? (passed ? 'var(--accent)' : 'color-mix(in srgb, var(--accent) 26%, transparent)')
                  : isHighlight
                    ? (passed ? '#c58a1a' : 'color-mix(in srgb, #c58a1a 24%, transparent)')
                    : (passed ? 'var(--ink-700)' : 'transparent'),
                border: isProtected
                  ? 'none'
                  : isHighlight
                    ? '1.4px solid #c58a1a'
                    : `1.4px solid ${passed ? 'var(--ink-700)' : 'var(--ink-300)'}`,
                boxShadow: isProtected
                  ? '0 0 0 2px color-mix(in srgb, var(--accent) 12%, transparent)'
                  : isHighlight
                    ? '0 0 0 2px color-mix(in srgb, #c58a1a 12%, transparent)'
                    : 'none',
                pointerEvents: 'none',
              }}
            />
          );
        })}
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
                top: 24,
                transform: 'translateX(-50%)',
                width: isMark ? 2 : 1,
                height: isMark ? 14 : 7,
                background: passed
                  ? (isMark ? 'var(--accent)' : 'var(--ink-400)')
                  : (isMark ? 'var(--ink-300)' : 'var(--ink-200)'),
                borderRadius: 1,
                pointerEvents: 'none',
              }}
            />
          );
        })}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 31, height: 4, background: 'var(--ink-200)', borderRadius: 2 }} />
        <div style={{ position: 'absolute', left: 0, top: 31, width: `${pct}%`, height: 4, background: 'var(--ink-700)', borderRadius: 2 }} />
        <div
          style={{
            position: 'absolute',
            left: `${pct}%`,
            top: 33,
            transform: 'translate(-50%, -50%)',
            width: 18,
            height: 18,
            borderRadius: 999,
            background: 'var(--bg-panel)',
            border: '2.2px solid var(--ink-900)',
            boxShadow: 'var(--shadow-soft)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: `${pct}%`,
            top: -6,
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
            {t('chapterSlider.shortChapter', { chapter: currentChapter })}
        </div>
        <input
          type="range"
          min={1}
          max={totalChapters}
          value={currentChapter}
          onChange={(e) => onChange(Number(e.target.value))}
          onMouseUp={(e) => onCommit(Number((e.target as HTMLInputElement).value))}
          onTouchEnd={(e) => onCommit(Number((e.target as HTMLInputElement).value))}
          aria-label={t('chapterSlider.current')}
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

      <button
        type="button"
        onClick={() => goToChapter(currentChapter + 1)}
        disabled={currentChapter >= totalChapters}
        aria-label={t('chapterSlider.next')}
        title={t('chapterSlider.next')}
        style={chapterStepButtonStyle(currentChapter >= totalChapters)}
      >
        <ChevronRight size={14} />
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ fontSize: 10, color: 'var(--ink-400)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>
          {t('chapterSlider.of')}
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
            title={onTotalChaptersChange ? t('chapterSlider.changeTotal') : undefined}
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

      {normalizedMarks.length > 0 && (
        <div className="chapter-slider-legend" style={legendStyle}>
          <LegendDot color="#c58a1a" label={t('app.legendHighlight')} />
          <LegendDot color="var(--ink-700)" label={t('app.legendReveal')} hollow />
          <LegendDot color="var(--accent)" label={t('app.legendShield')} />
        </div>
      )}
    </div>
  );
}

function LegendDot({ color, label, hollow = false }: { color: string; label: string; hollow?: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
      <span
        aria-hidden="true"
        style={{
          width: 7,
          height: 7,
          borderRadius: 999,
          background: hollow ? 'transparent' : color,
          border: `1.2px solid ${color}`,
        }}
      />
      <span>{label}</span>
    </span>
  );
}

function highlightButtonStyle(active: boolean, disabled: boolean): CSSProperties {
  return {
    width: 26,
    height: 26,
    display: 'grid',
    placeItems: 'center',
    padding: 0,
    background: active ? 'color-mix(in srgb, #c58a1a 13%, transparent)' : 'transparent',
    border: active ? '1px solid #c58a1a' : '1px solid var(--ink-200)',
    borderRadius: 4,
    color: active ? '#9a6410' : 'var(--ink-500)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    flexShrink: 0,
  };
}

const legendStyle: CSSProperties = {
  minWidth: 160,
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: '4px 8px',
  color: 'var(--ink-500)',
  fontSize: 10,
  lineHeight: 1.2,
};

function chapterStepButtonStyle(disabled: boolean): CSSProperties {
  return {
    width: 28,
    height: 28,
    flexShrink: 0,
    display: 'grid',
    placeItems: 'center',
    padding: 0,
    background: 'transparent',
    border: '1px solid var(--ink-200)',
    borderRadius: 4,
    color: disabled ? 'var(--ink-300)' : 'var(--ink-600)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    lineHeight: 1,
  };
}
