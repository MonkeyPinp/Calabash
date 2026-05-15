import { memo, useState } from 'react';
import { NodeResizer, type NodeProps, type ResizeParams } from '@xyflow/react';
import { Copy, Maximize2, Trash2 } from 'lucide-react';
import type { EvidenceImage } from '@/types';
import { createEvidenceImage, deleteEvidenceImage, restoreEvidenceImage, updateEvidenceImage } from '@/db/evidenceImages';
import {
  EVIDENCE_IMAGE_MIN_HEIGHT,
  EVIDENCE_IMAGE_MIN_WIDTH,
  getEvidenceImageDisplayTag,
  normalizeEvidenceImage,
} from '@/lib/evidenceImages';
import { useGraphStore } from '@/stores/graphStore';
import { useT } from '@/i18n';
import IllustrationPreviewModal from '@/components/IllustrationPreviewModal';

export interface EvidenceImageNodeData {
  image: EvidenceImage;
}

function EvidenceImageNodeImpl(props: NodeProps) {
  const data = props.data as unknown as EvidenceImageNodeData;
  const image = normalizeEvidenceImage(data.image);
  const selected = props.selected ?? false;
  const t = useT();
  const displayTag = getEvidenceImageDisplayTag(image);
  const isBackground = image.layer === 'background';
  const [previewOpen, setPreviewOpen] = useState(false);

  const addEvidenceImage = useGraphStore((s) => s.addEvidenceImage);
  const removeEvidenceImage = useGraphStore((s) => s.removeEvidenceImage);
  const updateEvidenceImageInStore = useGraphStore((s) => s.updateEvidenceImageInStore);
  const pushUndo = useGraphStore((s) => s.pushUndo);

  async function handleResizeEnd(_: unknown, params: ResizeParams) {
    const oldPosition = image.position;
    const oldWidth = image.width;
    const oldHeight = image.height;
    const position = { x: Math.round(params.x), y: Math.round(params.y) };
    const width = Math.round(params.width);
    const height = Math.round(params.height);
    const positionChanged = oldPosition.x !== position.x || oldPosition.y !== position.y;
    if (!positionChanged && oldWidth === width && oldHeight === height) return;

    const updated = await updateEvidenceImage(image.id, { position, width, height });
    updateEvidenceImageInStore(updated);
    pushUndo(
      async () => {
        const restored = await updateEvidenceImage(image.id, {
          position: oldPosition,
          width: oldWidth,
          height: oldHeight,
        });
        updateEvidenceImageInStore(restored);
      },
      async () => {
        const redone = await updateEvidenceImage(image.id, { position, width, height });
        updateEvidenceImageInStore(redone);
      },
    );
  }

  async function handleDuplicate(e: React.MouseEvent) {
    e.stopPropagation();
    const copy = await createEvidenceImage({
      bookId: image.bookId,
      title: image.title,
      notes: image.notes,
      kind: image.kind,
      layer: image.layer,
      dataUrl: image.dataUrl,
      mimeType: image.mimeType,
      width: image.width,
      height: image.height,
      chapterIntroduced: image.chapterIntroduced,
      position: { x: image.position.x + 36, y: image.position.y + 36 },
    });
    addEvidenceImage(copy);
    pushUndo(
      async () => { await deleteEvidenceImage(copy.id); removeEvidenceImage(copy.id); },
      async () => { await restoreEvidenceImage(copy); addEvidenceImage(copy); },
    );
  }

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    await deleteEvidenceImage(image.id);
    removeEvidenceImage(image.id);
    pushUndo(
      async () => { await restoreEvidenceImage(image); addEvidenceImage(image); },
      async () => { await deleteEvidenceImage(image.id); removeEvidenceImage(image.id); },
    );
  }

  function handleOpen(e: React.MouseEvent) {
    e.stopPropagation();
    setPreviewOpen(true);
  }

  return (
    <>
      <NodeResizer
        minWidth={EVIDENCE_IMAGE_MIN_WIDTH}
        minHeight={EVIDENCE_IMAGE_MIN_HEIGHT}
        isVisible={selected}
        lineStyle={{ borderColor: 'var(--accent)', borderWidth: 1.5 }}
        handleStyle={{ width: 9, height: 9, background: 'var(--accent)', borderRadius: 2 }}
        onResizeEnd={handleResizeEnd}
      />
      <div
        data-testid="evidence-image-node"
        onDoubleClick={handleOpen}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 3,
          border: selected
            ? '1.5px solid var(--accent)'
            : isBackground
              ? '1px dashed color-mix(in srgb, var(--ink-500) 42%, transparent)'
              : '1px solid var(--ink-200)',
          background: isBackground
            ? 'color-mix(in srgb, var(--bg-panel) 34%, transparent)'
            : 'var(--bg-panel)',
          boxShadow: selected
            ? '0 0 0 2px color-mix(in srgb, var(--accent) 18%, transparent), var(--shadow-pop)'
            : isBackground
              ? 'none'
              : '0 2px 8px rgba(40, 28, 12, 0.14)',
          boxSizing: 'border-box',
          overflow: 'hidden',
          display: 'grid',
          gridTemplateRows: isBackground ? '1fr' : '24px 1fr',
          opacity: isBackground && !selected ? 0.72 : 1,
          position: 'relative',
          cursor: 'grab',
        }}
      >
        {!isBackground && (
          <div
            style={{
              minWidth: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '0 8px',
              borderBottom: '1px solid var(--ink-150)',
              background: 'color-mix(in srgb, var(--bg-canvas) 68%, transparent)',
              color: 'var(--ink-700)',
            }}
          >
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8.5, letterSpacing: 0, fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>
              {displayTag}
            </span>
            <span
              style={{
                minWidth: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontFamily: 'var(--font-case-title)',
                fontSize: 12,
                fontWeight: 600,
              }}
              title={image.title}
            >
              {image.title}
            </span>
          </div>
        )}

        <div style={{ minHeight: 0, position: 'relative', display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,0.18)' }}>
          <img
            src={image.dataUrl}
            alt={image.title}
            draggable={false}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              display: 'block',
              userSelect: 'none',
              pointerEvents: 'none',
            }}
          />
          {isBackground && (
            <div
              style={{
                position: 'absolute',
                left: 8,
                bottom: 8,
                maxWidth: 'calc(100% - 16px)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '3px 7px',
                borderRadius: 3,
                border: '1px solid color-mix(in srgb, var(--ink-500) 28%, transparent)',
                background: 'color-mix(in srgb, var(--bg-panel) 82%, transparent)',
                color: 'var(--ink-700)',
                boxShadow: '0 1px 3px rgba(40,28,12,.10)',
              }}
            >
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8.5, fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>{displayTag}</span>
              <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11, fontWeight: 600 }}>{image.title}</span>
            </div>
          )}
        </div>

        {selected && (
          <div
            className="nodrag"
            style={{
              position: 'absolute',
              top: 5,
              right: 5,
              display: 'flex',
              gap: 3,
              padding: 3,
              borderRadius: 4,
              border: '1px solid var(--ink-200)',
              background: 'color-mix(in srgb, var(--bg-panel) 92%, transparent)',
              boxShadow: '0 1px 4px rgba(40,28,12,.14)',
            }}
          >
            <button type="button" onClick={handleOpen} title={t('evidenceImage.openFullSize')} style={iconButtonStyle}>
              <Maximize2 size={11} />
            </button>
            <button type="button" onClick={(e) => void handleDuplicate(e)} title={t('evidenceImage.duplicate')} style={iconButtonStyle}>
              <Copy size={11} />
            </button>
            <button type="button" onClick={(e) => void handleDelete(e)} title={t('evidenceImage.delete')} style={{ ...iconButtonStyle, color: 'var(--accent)' }}>
              <Trash2 size={11} />
            </button>
          </div>
        )}
      </div>
      {previewOpen && (
        <IllustrationPreviewModal
          title={image.title}
          dataUrl={image.dataUrl}
          closeLabel={t('common.close')}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </>
  );
}

const iconButtonStyle: React.CSSProperties = {
  width: 20,
  height: 20,
  padding: 0,
  display: 'grid',
  placeItems: 'center',
  border: '1px solid transparent',
  borderRadius: 3,
  background: 'transparent',
  color: 'var(--ink-600)',
  cursor: 'pointer',
};

export default memo(EvidenceImageNodeImpl);
