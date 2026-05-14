import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import NewCharacterModal from '@/components/Canvas/NewCharacterModal';
import { useUiStore } from '@/stores/uiStore';

describe('NewCharacterModal', () => {
  beforeEach(() => {
    useUiStore.setState({
      theme: 'light',
      themePreference: 'light',
      language: 'system',
      resolvedLanguage: 'en',
      characterNodeViewMode: 'text',
    });
  });

  it('escapes transformed canvas containers so the role preset menu has full modal width', () => {
    render(
      <div data-testid="canvas-shell" style={{ width: 120, transform: 'translateZ(0)' }}>
        <NewCharacterModal
          position={{ x: 0, y: 0 }}
          bookId="book"
          currentChapter={1}
          onClose={vi.fn()}
          onCreated={vi.fn()}
        />
      </div>,
    );

    const shell = screen.getByTestId('canvas-shell');
    const dialog = screen.getByRole('dialog');

    expect(shell).not.toContainElement(dialog);
    expect(dialog.parentElement).toBe(document.body);
  });
});
