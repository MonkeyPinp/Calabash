import { Trash2 } from 'lucide-react';
import type { StickyNoteColor } from '@/types';
import { deleteAnnotation, restoreAnnotation, updateAnnotation } from '@/db/annotations';
import { useGraphStore } from '@/stores/graphStore';

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

export interface StickyNoteInspectorProps {
  stickyNoteId: string;
  onDeleted?: () => void;
}

export default function StickyNoteInspector({ stickyNoteId, onDeleted }: StickyNoteInspectorProps) {
  const stickyNotes = useGraphStore((s) => s.stickyNotes);
  const updateStickyNoteInStore = useGraphStore((s) => s.updateStickyNoteInStore);
  const addStickyNote = useGraphStore((s) => s.addStickyNote);
  const removeStickyNote = useGraphStore((s) => s.removeStickyNote);
  const pushUndo = useGraphStore((s) => s.pushUndo);

  const note = stickyNotes.find((n) => n.id === stickyNoteId);

  if (!note) {
    return <div style={{ padding: 16, color: 'var(--ink-500)', fontSize: 13 }}>Sticky note not found.</div>;
  }

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
          Sticky Note
        </div>
        <button
          onClick={() => void handleDelete()}
          title="Delete note"
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
          <Trash2 size={11} /> Delete
        </button>
      </div>

      <div style={{ padding: 16, overflowY: 'auto', flex: 1, boxSizing: 'border-box' }}>

      <div style={fieldStyle}>
        <label style={labelStyle}>Content</label>
        <textarea
          style={{ ...inputStyle, minHeight: 220, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
          defaultValue={note.content}
          key={`content-${stickyNoteId}`}
          placeholder="Write a note..."
          onBlur={(e) => void handleContentBlur(e)}
        />
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Color</label>
        <select
          style={inputStyle}
          defaultValue={note.color}
          key={`color-${stickyNoteId}`}
          onChange={(e) => void handleColorChange(e)}
        >
          {COLORS.map((color) => (
            <option key={color} value={color}>
              {color.charAt(0).toUpperCase() + color.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ ...fieldStyle, flex: 1 }}>
          <label style={labelStyle}>Width</label>
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
          <label style={labelStyle}>Height</label>
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
      </div>
    </div>
  );
}
