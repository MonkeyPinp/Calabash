import { useState } from 'react';
import { Copy, Maximize2, Trash2 } from 'lucide-react';
import type { EvidenceImageLayer } from '@/types';
import { createEvidenceImage, deleteEvidenceImage, restoreEvidenceImage, updateEvidenceImage } from '@/db/evidenceImages';
import {
  EVIDENCE_IMAGE_KINDS,
  EVIDENCE_IMAGE_LAYERS,
  EVIDENCE_IMAGE_MAX_HEIGHT,
  EVIDENCE_IMAGE_MAX_WIDTH,
  EVIDENCE_IMAGE_MIN_HEIGHT,
  EVIDENCE_IMAGE_MIN_WIDTH,
  normalizeEvidenceImageChapter,
  normalizeEvidenceImageDimension,
} from '@/lib/evidenceImages';
import { useGraphStore } from '@/stores/graphStore';
import { useT } from '@/i18n';
import IllustrationPreviewModal from '@/components/IllustrationPreviewModal';

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

export interface EvidenceImageInspectorProps {
  evidenceImageId: string;
  bookId: string;
  onDeleted?: () => void;
  onDuplicated?: (newId: string) => void;
}

export default function EvidenceImageInspector({
  evidenceImageId,
  bookId,
  onDeleted,
  onDuplicated,
}: EvidenceImageInspectorProps) {
  const t = useT();
  const evidenceImages = useGraphStore((s) => s.evidenceImages);
  const addEvidenceImage = useGraphStore((s) => s.addEvidenceImage);
  const removeEvidenceImage = useGraphStore((s) => s.removeEvidenceImage);
  const updateEvidenceImageInStore = useGraphStore((s) => s.updateEvidenceImageInStore);
  const pushUndo = useGraphStore((s) => s.pushUndo);
  const [previewOpen, setPreviewOpen] = useState(false);

  const image = evidenceImages.find((item) => item.id === evidenceImageId);
  if (!image) {
    return <div style={{ padding: 16, color: 'var(--ink-500)', fontSize: 13 }}>{t('evidenceImage.notFound')}</div>;
  }

  const visibleFromChapter = normalizeEvidenceImageChapter(image.chapterIntroduced);

  async function persist(patch: Parameters<typeof updateEvidenceImage>[1]) {
    const updated = await updateEvidenceImage(evidenceImageId, patch);
    updateEvidenceImageInStore(updated);
    return updated;
  }

  async function handleTitleBlur(value: string) {
    const title = value.trim() || t('evidenceImage.defaultTitle');
    if (title === image!.title) return;
    const before = image!.title;
    await persist({ title });
    pushUndo(
      async () => {
        const updated = await updateEvidenceImage(evidenceImageId, { title: before });
        updateEvidenceImageInStore(updated);
      },
      async () => {
        const updated = await updateEvidenceImage(evidenceImageId, { title });
        updateEvidenceImageInStore(updated);
      },
    );
  }

  async function handleNotesBlur(value: string) {
    const notes = value.trim() || undefined;
    if ((notes ?? '') === (image!.notes ?? '')) return;
    const before = image!.notes;
    await persist({ notes });
    pushUndo(
      async () => {
        const updated = await updateEvidenceImage(evidenceImageId, { notes: before });
        updateEvidenceImageInStore(updated);
      },
      async () => {
        const updated = await updateEvidenceImage(evidenceImageId, { notes });
        updateEvidenceImageInStore(updated);
      },
    );
  }

  async function handleKindBlur(value: string) {
    const kind = value.trim() || 'general';
    if (kind === image!.kind) return;
    const before = image!.kind;
    await persist({ kind });
    pushUndo(
      async () => {
        const updated = await updateEvidenceImage(evidenceImageId, { kind: before });
        updateEvidenceImageInStore(updated);
      },
      async () => {
        const updated = await updateEvidenceImage(evidenceImageId, { kind });
        updateEvidenceImageInStore(updated);
      },
    );
  }

  async function handleLayerChange(layer: EvidenceImageLayer) {
    if (layer === image!.layer) return;
    const before = image!.layer;
    await persist({ layer });
    pushUndo(
      async () => {
        const updated = await updateEvidenceImage(evidenceImageId, { layer: before });
        updateEvidenceImageInStore(updated);
      },
      async () => {
        const updated = await updateEvidenceImage(evidenceImageId, { layer });
        updateEvidenceImageInStore(updated);
      },
    );
  }

  async function handleSizeBlur(field: 'width' | 'height', value: string) {
    const parsed = normalizeEvidenceImageDimension(
      value,
      image![field],
      field === 'width' ? EVIDENCE_IMAGE_MIN_WIDTH : EVIDENCE_IMAGE_MIN_HEIGHT,
      field === 'width' ? EVIDENCE_IMAGE_MAX_WIDTH : EVIDENCE_IMAGE_MAX_HEIGHT,
    );
    if (parsed === image![field]) return;
    const before = image![field];
    await persist({ [field]: parsed });
    pushUndo(
      async () => {
        const updated = await updateEvidenceImage(evidenceImageId, { [field]: before });
        updateEvidenceImageInStore(updated);
      },
      async () => {
        const updated = await updateEvidenceImage(evidenceImageId, { [field]: parsed });
        updateEvidenceImageInStore(updated);
      },
    );
  }

  async function handleChapterBlur(value: string) {
    const parsed = normalizeEvidenceImageChapter(value);
    if (parsed === visibleFromChapter) return;
    const before = visibleFromChapter;
    await persist({ chapterIntroduced: parsed });
    pushUndo(
      async () => {
        const updated = await updateEvidenceImage(evidenceImageId, { chapterIntroduced: before });
        updateEvidenceImageInStore(updated);
      },
      async () => {
        const updated = await updateEvidenceImage(evidenceImageId, { chapterIntroduced: parsed });
        updateEvidenceImageInStore(updated);
      },
    );
  }

  async function handleDuplicate() {
    const current = image!;
    const copy = await createEvidenceImage({
      bookId,
      title: current.title,
      notes: current.notes,
      kind: current.kind,
      layer: current.layer,
      dataUrl: current.dataUrl,
      mimeType: current.mimeType,
      width: current.width,
      height: current.height,
      chapterIntroduced: current.chapterIntroduced,
      position: { x: current.position.x + 36, y: current.position.y + 36 },
    });
    addEvidenceImage(copy);
    pushUndo(
      async () => { await deleteEvidenceImage(copy.id); removeEvidenceImage(copy.id); },
      async () => { await restoreEvidenceImage(copy); addEvidenceImage(copy); },
    );
    onDuplicated?.(copy.id);
  }

  async function handleDelete() {
    const snapshot = image!;
    await deleteEvidenceImage(evidenceImageId);
    removeEvidenceImage(evidenceImageId);
    pushUndo(
      async () => { await restoreEvidenceImage(snapshot); addEvidenceImage(snapshot); },
      async () => { await deleteEvidenceImage(evidenceImageId); removeEvidenceImage(evidenceImageId); },
    );
    onDeleted?.();
  }

  function openFullSize() {
    setPreviewOpen(true);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid var(--ink-200)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 9.5, color: 'var(--ink-400)', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600 }}>
              {t('app.inspectEvidenceImage')}
            </div>
            <div
              style={{
                marginTop: 6,
                fontFamily: 'var(--font-display)',
                fontSize: 16,
                color: 'var(--ink-900)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={image.title}
            >
              {image.title}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-500)', marginTop: 3 }}>
              {t('evidenceImage.chapterIntroducedShort', { chapter: visibleFromChapter })} · {image.width} x {image.height}
            </div>
          </div>
          <button type="button" onClick={openFullSize} title={t('evidenceImage.openFullSize')} style={headerButtonStyle}>
            <Maximize2 size={13} />
          </button>
          <button type="button" onClick={() => void handleDuplicate()} title={t('evidenceImage.duplicate')} style={headerButtonStyle}>
            <Copy size={13} />
          </button>
          <button type="button" onClick={() => void handleDelete()} title={t('evidenceImage.delete')} style={{ ...headerButtonStyle, color: 'var(--accent)' }}>
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div style={{ padding: 16, overflowY: 'auto', flex: 1, boxSizing: 'border-box' }}>
        <div
          style={{
            height: 166,
            marginBottom: 16,
            borderRadius: 4,
            border: '1px solid var(--ink-200)',
            background: 'var(--bg-canvas)',
            overflow: 'hidden',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <img src={image.dataUrl} alt={image.title} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>{t('evidenceImage.title')}</label>
          <input
            style={inputStyle}
            defaultValue={image.title}
            key={`title-${evidenceImageId}`}
            onKeyDown={blurOnEnter}
            onBlur={(e) => void handleTitleBlur(e.target.value)}
          />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>{t('evidenceImage.kind')}</label>
          <input
            style={inputStyle}
            list="evidence-image-kind-options"
            defaultValue={image.kind}
            key={`kind-${evidenceImageId}`}
            onKeyDown={blurOnEnter}
            onBlur={(e) => void handleKindBlur(e.target.value)}
          />
          <datalist id="evidence-image-kind-options">
            {EVIDENCE_IMAGE_KINDS.map((kind) => (
              <option key={kind} value={kind}>{t(`evidenceImage.kind.${kind}`)}</option>
            ))}
          </datalist>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>{t('evidenceImage.layer')}</label>
          <select
            style={inputStyle}
            defaultValue={image.layer}
            key={`layer-${evidenceImageId}`}
            onChange={(e) => void handleLayerChange(e.target.value as EvidenceImageLayer)}
          >
            {EVIDENCE_IMAGE_LAYERS.map((layer) => (
              <option key={layer} value={layer}>{t(`evidenceImage.layer.${layer}`)}</option>
            ))}
          </select>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>{t('evidenceImage.chapterIntroduced')}</label>
          <input
            style={inputStyle}
            type="number"
            min={1}
            defaultValue={visibleFromChapter}
            key={`chapter-${evidenceImageId}`}
            onKeyDown={blurOnEnter}
            onBlur={(e) => void handleChapterBlur(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ ...fieldStyle, flex: 1 }}>
            <label style={labelStyle}>{t('evidenceImage.width')}</label>
            <input
              style={inputStyle}
              type="number"
              min={EVIDENCE_IMAGE_MIN_WIDTH}
              defaultValue={image.width}
              key={`width-${evidenceImageId}`}
              onKeyDown={blurOnEnter}
              onBlur={(e) => void handleSizeBlur('width', e.target.value)}
            />
          </div>
          <div style={{ ...fieldStyle, flex: 1 }}>
            <label style={labelStyle}>{t('evidenceImage.height')}</label>
            <input
              style={inputStyle}
              type="number"
              min={EVIDENCE_IMAGE_MIN_HEIGHT}
              defaultValue={image.height}
              key={`height-${evidenceImageId}`}
              onKeyDown={blurOnEnter}
              onBlur={(e) => void handleSizeBlur('height', e.target.value)}
            />
          </div>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>{t('evidenceImage.notes')}</label>
          <textarea
            style={{ ...inputStyle, minHeight: 112, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
            defaultValue={image.notes ?? ''}
            key={`notes-${evidenceImageId}`}
            placeholder={t('evidenceImage.notesPlaceholder')}
            onBlur={(e) => void handleNotesBlur(e.target.value)}
          />
        </div>
      </div>
      {previewOpen && (
        <IllustrationPreviewModal
          title={image.title}
          dataUrl={image.dataUrl}
          closeLabel={t('common.close')}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </div>
  );
}

const headerButtonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 28,
  height: 28,
  background: 'transparent',
  border: '1px solid transparent',
  borderRadius: 5,
  cursor: 'pointer',
  color: 'var(--ink-600)',
  flexShrink: 0,
};
