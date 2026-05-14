import { memo, useState, useEffect, useRef } from 'react';
import { NodeResizer, type NodeProps } from '@xyflow/react';
import { Trash2 } from 'lucide-react';
import type { StickyNote, StickyNoteColor } from '@/types';
import { updateAnnotation, deleteAnnotation, restoreAnnotation } from '@/db/annotations';
import { useGraphStore } from '@/stores/graphStore';

export interface StickyNoteNodeData {
  note: StickyNote;
}

const COLOR_MAP: Record<StickyNoteColor, { bg: string; border: string; text: string }> = {
  yellow: { bg: '#f5e9a8', border: '#d5b94c', text: '#3a2e1d' },
  green:  { bg: '#d1e4b8', border: '#8fac67', text: '#24341d' },
  blue:   { bg: '#c6dcec', border: '#7395ad', text: '#1f3443' },
  pink:   { bg: '#f3cbd4', border: '#be7c8d', text: '#4a202b' },
  purple: { bg: '#d8c8e8', border: '#9a7fba', text: '#30203f' },
};

const COLORS: StickyNoteColor[] = ['yellow', 'green', 'blue', 'pink', 'purple'];

function StickyNoteNodeImpl(props: NodeProps) {
  const data = props.data as unknown as StickyNoteNodeData;
  const note = data.note;
  const sel = props.selected ?? false;
  const colors = COLOR_MAP[note.color];

  const [content, setContent] = useState(note.content);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track the content value when user started editing (for undo)
  const contentBeforeEdit = useRef(note.content);

  // Sync if note.content changes from outside (e.g. undo)
  useEffect(() => {
    setContent(note.content);
    contentBeforeEdit.current = note.content;
  }, [note.content]);

  const updateStickyNoteInStore = useGraphStore((s) => s.updateStickyNoteInStore);
  const removeStickyNote = useGraphStore((s) => s.removeStickyNote);
  const addStickyNote = useGraphStore((s) => s.addStickyNote);
  const pushUndo = useGraphStore((s) => s.pushUndo);

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    const snapshot = { ...note, content };
    await deleteAnnotation(note.id);
    removeStickyNote(note.id);
    pushUndo(
      async () => { await restoreAnnotation(snapshot); addStickyNote(snapshot); },
      async () => { await deleteAnnotation(snapshot.id); removeStickyNote(snapshot.id); },
    );
  }

  function scheduleContentSave(value: string) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const oldContent = contentBeforeEdit.current;
      if (oldContent === value) return; // No change
      await updateAnnotation(note.id, { content: value });
      updateStickyNoteInStore({ ...note, content: value });
      pushUndo(
        async () => { await updateAnnotation(note.id, { content: oldContent }); updateStickyNoteInStore({ ...note, content: oldContent }); },
        async () => { await updateAnnotation(note.id, { content: value }); updateStickyNoteInStore({ ...note, content: value }); },
      );
      contentBeforeEdit.current = value;
    }, 600);
  }

  async function handleColorChange(newColor: StickyNoteColor) {
    const oldColor = note.color;
    if (oldColor === newColor) return;
    await updateAnnotation(note.id, { color: newColor });
    updateStickyNoteInStore({ ...note, color: newColor });
    pushUndo(
      async () => { await updateAnnotation(note.id, { color: oldColor }); updateStickyNoteInStore({ ...note, color: oldColor }); },
      async () => { await updateAnnotation(note.id, { color: newColor }); updateStickyNoteInStore({ ...note, color: newColor }); },
    );
  }

  async function handleResizeEnd(_: unknown, params: { width: number; height: number }) {
    const oldWidth = note.width;
    const oldHeight = note.height;
    const newWidth = params.width;
    const newHeight = params.height;
    await updateAnnotation(note.id, { width: newWidth, height: newHeight });
    updateStickyNoteInStore({ ...note, width: newWidth, height: newHeight });
    pushUndo(
      async () => { await updateAnnotation(note.id, { width: oldWidth, height: oldHeight }); updateStickyNoteInStore({ ...note, width: oldWidth, height: oldHeight }); },
      async () => { await updateAnnotation(note.id, { width: newWidth, height: newHeight }); updateStickyNoteInStore({ ...note, width: newWidth, height: newHeight }); },
    );
  }

  return (
    <>
      <NodeResizer
        minWidth={120}
        minHeight={80}
        isVisible={sel}
        lineStyle={{ borderColor: colors.border, borderWidth: 1.5 }}
        handleStyle={{ width: 8, height: 8, background: colors.border, borderRadius: 2 }}
        onResizeEnd={handleResizeEnd}
      />
      <div
        data-testid="sticky-note-node"
        style={{
          width: '100%',
          height: '100%',
          background: colors.bg,
          border: `1.5px solid ${sel ? colors.border : 'transparent'}`,
          borderRadius: 2,
          boxShadow: sel
            ? `0 0 0 2px var(--ink-900), 0 4px 12px rgba(0,0,0,0.14)`
            : '0 1px 1px rgba(0,0,0,0.06), 0 5px 10px -4px rgba(0,0,0,0.12)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'visible',
          transition: 'box-shadow 0.15s, border-color 0.15s',
          position: 'relative',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: -5,
            left: '50%',
            transform: 'translateX(-50%) rotate(-1deg)',
            width: 58,
            height: 11,
            background: 'linear-gradient(180deg, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.34) 100%)',
            boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
            borderRadius: 1,
            pointerEvents: 'none',
          }}
        />
        {/* Colour picker + delete — only visible when selected */}
        {sel && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '5px 7px 3px',
            borderBottom: `1px solid ${colors.border}`,
            background: 'rgba(255,255,255,0.28)',
          }}>
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={(e) => { e.stopPropagation(); void handleColorChange(c); }}
                style={{
                  width: 14, height: 14,
                  borderRadius: '50%',
                  background: COLOR_MAP[c].bg,
                  border: `2px solid ${c === note.color ? COLOR_MAP[c].border : 'transparent'}`,
                  cursor: 'pointer',
                  padding: 0,
                  flexShrink: 0,
                  outline: 'none',
                  boxShadow: c === note.color ? `0 0 0 1px ${COLOR_MAP[c].border}` : 'none',
                }}
                title={c}
              />
            ))}
            {/* Spacer */}
            <div style={{ flex: 1 }} />
            {/* Delete button */}
            <button
              onClick={(e) => void handleDelete(e)}
              title="Delete note (or press Delete key when selected)"
              className="nodrag"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 18, height: 18, borderRadius: 3,
                background: 'transparent',
                border: '1px solid transparent',
                cursor: 'pointer', padding: 0,
                color: colors.text, opacity: 0.5,
                flexShrink: 0,
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; (e.currentTarget as HTMLElement).style.background = 'rgba(200,50,50,0.12)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.5'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <Trash2 size={11} />
            </button>
          </div>
        )}

        {/* Textarea */}
        <textarea
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            scheduleContentSave(e.target.value);
          }}
          placeholder="Write a note…"
          className="nodrag"
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            resize: 'none',
            padding: '8px 10px 10px',
            fontFamily: 'var(--font-case-title)',
            fontSize: 13,
            lineHeight: 1.55,
            color: colors.text,
            cursor: 'text',
          }}
        />
      </div>
    </>
  );
}

export default memo(StickyNoteNodeImpl);
