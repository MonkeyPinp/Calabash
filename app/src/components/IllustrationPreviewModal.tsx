import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface IllustrationPreviewModalProps {
  title: string;
  dataUrl: string;
  closeLabel: string;
  onClose: () => void;
}

export default function IllustrationPreviewModal({
  title,
  dataUrl,
  closeLabel,
  onClose,
}: IllustrationPreviewModalProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      data-testid="illustration-preview-modal"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        background: 'color-mix(in srgb, var(--ink-900) 68%, transparent)',
        display: 'grid',
        gridTemplateRows: 'auto 1fr',
        color: 'var(--bg-panel)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          minWidth: 0,
          height: 48,
          padding: '0 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: 'color-mix(in srgb, var(--ink-900) 74%, transparent)',
          borderBottom: '1px solid color-mix(in srgb, var(--bg-panel) 22%, transparent)',
        }}
      >
        <div
          style={{
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontFamily: 'var(--font-case-title)',
            fontSize: 15,
            fontWeight: 600,
          }}
          title={title}
        >
          {title}
        </div>
        <button
          type="button"
          aria-label={closeLabel}
          title={closeLabel}
          onClick={onClose}
          style={{
            width: 30,
            height: 30,
            display: 'grid',
            placeItems: 'center',
            padding: 0,
            border: '1px solid color-mix(in srgb, var(--bg-panel) 26%, transparent)',
            borderRadius: 4,
            background: 'transparent',
            color: 'var(--bg-panel)',
            cursor: 'pointer',
          }}
        >
          <X size={15} />
        </button>
      </div>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          minHeight: 0,
          display: 'grid',
          placeItems: 'center',
          padding: 24,
          boxSizing: 'border-box',
        }}
      >
        <img
          src={dataUrl}
          alt={title}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            boxShadow: '0 14px 44px rgba(0,0,0,.36)',
            background: 'var(--bg-canvas)',
          }}
        />
      </div>
    </div>,
    document.body,
  );
}
