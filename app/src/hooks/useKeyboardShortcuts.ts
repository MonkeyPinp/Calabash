import { useEffect } from 'react';
import { useGraphStore } from '@/stores/graphStore';

interface KeyboardShortcutOptions {
  onNewCharacter?: () => void;
  fitView?: () => void;
}

function isInputFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || (el as HTMLElement).isContentEditable;
}

export function useKeyboardShortcuts({ onNewCharacter, fitView }: KeyboardShortcutOptions) {
  const undo = useGraphStore((s) => s.undo);
  const redo = useGraphStore((s) => s.redo);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;

      // Undo: Cmd/Ctrl+Z
      if (meta && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        void undo();
        return;
      }

      // Redo: Cmd/Ctrl+Shift+Z
      if (meta && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        void redo();
        return;
      }

      // Skip remaining shortcuts when an input is focused
      if (isInputFocused()) return;

      // F — fit view
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        fitView?.();
        return;
      }

      // / — focus search input
      if (e.key === '/') {
        e.preventDefault();
        const searchInput = document.getElementById('book-search') as HTMLInputElement | null;
        searchInput?.focus();
        return;
      }

      // N — new character
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        onNewCharacter?.();
        return;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, fitView, onNewCharacter]);
}
