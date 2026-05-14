import { Trash2 } from 'lucide-react';
import type { StickyNoteColor } from '@/types';
import { deleteAnnotation, restoreAnnotation, updateAnnotation } from '@/db/annotations';
import { useGraphStore } from '@/stores/graphStore';
import { normalizeStickyNoteChapter, normalizeStickyNoteFontSize } from '@/lib/stickyNotes';
import { useT } from '@/i18n';

const COLORS: StickyNoteColor[] = ['yellow', 'green', 'blue', 'pink', 'purple'];

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

function blurOnEnter(e: React.KeyboardEvent<HTMLInputElement>) {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  e.currentTarget.blur();
}

export interface StickyNoteInspectorProps {
  stickyNoteId: string;
  onDeleted?: () => void;
}

export default function StickyNoteInspector({ stickyNoteId, onDeleted }: StickyNoteInspectorProps) {
  const t = useT();
  const stickyNotes = useGraphStore((s) => s.stickyNotes);
  const updateStickyNoteInStore = useGraphStore((s) => s.updateStickyNoteInStore);
  const addStickyNote = useGraphStore((s) => s.addStickyNote);
  const removeStickyNote = useGraphStore((s) => s.removeStickyNote);
  const pushUndo = useGraphStore((s) => s.pushUndo);

  const note = stickyNotes.find((n) => n.id === stickyNoteId);

  if (!note) {
    return <div style={{ padding: 16, color: 'var(--ink-500)', fontSize: 13 }}>{t('stickyNote.notFound')}</div>;
  }

  const visibleFromChapter = normalizeStickyNoteChapter(note.chapterIntroduced);
  const fontSize = normalizeStickyNoteFontSize(note.fontSize);

  async function persist(patch: Parameters<typeof updateAnnotation>[1]) {
    const updated = await updateAnnotation(stickyNoteId, patch);
    updateStickyNoteInStore(updated);
  }

  async function handleContentBlur(e: React.FocusEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    if (value === note!.content) return;
    const before = note!.content;
    await persist({ content: value });
    pushUndo(
      async () => {
        const updated = await updateAnnotation(stickyNoteId, { content: before });
        updateStickyNoteInStore(updated);
      },
      async () => {
        const updated = await updateAnnotation(stickyNoteId, { content: value });
        updateStickyNoteInStore(updated);
      },
    );
  }

  async function handleColorChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const color = e.target.value as StickyNoteColor;
    if (color === note!.color) return;
    const before = note!.color;
    await persist({ color });
    pushUndo(
      async () => {
        const updated = await updateAnnotation(stickyNoteId, { color: before });
        updateStickyNoteInStore(updated);
      },
      async () => {
        const updated = await updateAnnotation(stickyNoteId, { color });
        updateStickyNoteInStore(updated);
      },
    );
  }

  async function handleSizeBlur(field: 'width' | 'height', value: string) {
    const parsed = Math.max(field === 'width' ? 120 : 80, parseInt(value, 10));
    if (!Number.isFinite(parsed) || parsed === note![field]) return;
    const before = note![field];
    await persist({ [field]: parsed });
    pushUndo(
      async () => {
        const updated = await updateAnnotation(stickyNoteId, { [field]: before });
        updateStickyNoteInStore(updated);
      },
      async () => {
        const updated = await updateAnnotation(stickyNoteId, { [field]: parsed });
        updateStickyNoteInStore(updated);
      },
    );
  }

  async function handleFontSizeBlur(value: string) {
    const parsed = normalizeStickyNoteFontSize(value, note!.fontSize);
    if (parsed === note!.fontSize) return;
    const before = note!.fontSize;
    await persist({ fontSize: parsed });
    pushUndo(
      async () => {
        const updated = await updateAnnotation(stickyNoteId, { fontSize: before });
        updateStickyNoteInStore(updated);
      },
      async () => {
        const updated = await updateAnnotation(stickyNoteId, { fontSize: parsed });
        updateStickyNoteInStore(updated);
      },
    );
  }

  async function handleChapterBlur(value: string) {
    const parsed = normalizeStickyNoteChapter(value);
    if (parsed === visibleFromChapter) return;
    const before = visibleFromChapter;
    await persist({ chapterIntroduced: parsed });
    pushUndo(
      async () => {
        const updated = await updateAnnotation(stickyNoteId, { chapterIntroduced: before });
        updateStickyNoteInStore(updated);
      },
      async () => {
        const updated = await updateAnnotation(stickyNoteId, { chapterIntroduced: parsed });
        updateStickyNoteInStore(updated);
      },
    );
  }

  async function handleDelete() {
    const snapshot = note!;
    await deleteAnnotation(stickyNoteId);
    removeStickyNote(stickyNoteId);
    pushUndo(
      async () => {
        await restoreAnnotation(snapshot);
        addStickyNote(snapshot);
      },
      async () => {
        await deleteAnnotation(stickyNoteId);
        removeStickyNote(stickyNoteId);
      },
    );
    onDeleted?.();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px 12px', borderBottom: '1px solid var(--ink-200)' }}>
        <div style={{ flex: 1, fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 500, color: 'var(--ink-900)' }}>
          {t('stickyNote.title')}
        </div>
        <button
          onClick={() => void handleDelete()}
          title={t('stickyNote.delete')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 8px',
            fontSize: 11,
            background: 'transparent',
            border: '1px solid transparent',
            borderRadius: 4,
            cursor: 'pointer',
            color: 'var(--accent)',
            flexShrink: 0,
          }}
        >
          <Trash2 size={11} /> {t('stickyNote.delete')}
        </button>
      </div>

      <div style={{ padding: 16, overflowY: 'auto', flex: 1, boxSizing: 'border-box' }}>

      <div style={fieldStyle}>
        <label style={labelStyle}>{t('stickyNote.chapterIntroduced')}</label>
        <input
          style={inputStyle}
          type="number"
          min={1}
          defaultValue={visibleFromChapter}
          key={`chapter-${stickyNoteId}`}
          onBlur={(e) => void handleChapterBlur(e.target.value)}
        />
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>{t('stickyNote.content')}</label>
        <textarea
          style={{ ...inputStyle, minHeight: 220, resize: 'vertical', fontFamily: 'inherit', fontSize, lineHeight: 1.5 }}
          defaultValue={note.content}
          key={`content-${stickyNoteId}`}
          placeholder={t('stickyNote.contentPlaceholder')}
          onBlur={(e) => void handleContentBlur(e)}
        />
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>{t('stickyNote.color')}</label>
        <select
          style={inputStyle}
          defaultValue={note.color}
          key={`color-${stickyNoteId}`}
          onChange={(e) => void handleColorChange(e)}
        >
          {COLORS.map((color) => (
            <option key={color} value={color}>
              {t(`stickyNote.color.${color}`)}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ ...fieldStyle, flex: 1 }}>
          <label style={labelStyle}>{t('stickyNote.width')}</label>
          <input
            style={inputStyle}
            type="number"
            min={120}
            defaultValue={note.width}
            key={`width-${stickyNoteId}`}
            onBlur={(e) => void handleSizeBlur('width', e.target.value)}
          />
        </div>
        <div style={{ ...fieldStyle, flex: 1 }}>
          <label style={labelStyle}>{t('stickyNote.height')}</label>
          <input
            style={inputStyle}
            type="number"
            min={80}
            defaultValue={note.height}
            key={`height-${stickyNoteId}`}
            onBlur={(e) => void handleSizeBlur('height', e.target.value)}
          />
        </div>
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>{t('stickyNote.fontSize')}</label>
        <input
          style={inputStyle}
          type="number"
          min={11}
          max={28}
          defaultValue={fontSize}
          key={`font-size-${stickyNoteId}`}
          onKeyDown={blurOnEnter}
          onBlur={(e) => void handleFontSizeBlur(e.target.value)}
        />
      </div>
      </div>
    </div>
  );
}
