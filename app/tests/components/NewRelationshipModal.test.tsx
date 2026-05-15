import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NewRelationshipModal from '@/components/Canvas/NewRelationshipModal';
import { db } from '@/db/schema';
import { useGraphStore } from '@/stores/graphStore';
import { useUiStore } from '@/stores/uiStore';

describe('NewRelationshipModal', () => {
  beforeEach(async () => {
    await db.relationships.clear();
    useUiStore.setState({
      theme: 'light',
      themePreference: 'light',
      language: 'system',
      resolvedLanguage: 'en',
      characterNodeViewMode: 'text',
    });
    useGraphStore.setState({
      characters: [
        {
          id: 'source',
          bookId: 'book',
          name: 'Source',
          aliases: [{ name: 'Source', chapterRevealed: 1 }],
          chapterIntroduced: 1,
          position: { x: 0, y: 0 },
          createdAt: 0,
          updatedAt: 0,
        },
        {
          id: 'target',
          bookId: 'book',
          name: 'Target',
          aliases: [{ name: 'Target', chapterRevealed: 1 }],
          chapterIntroduced: 1,
          position: { x: 200, y: 0 },
          createdAt: 0,
          updatedAt: 0,
        },
      ],
      relationships: [],
      stickyNotes: [],
      groupRanges: [],
      evidenceImages: [],
      undoStack: [],
      redoStack: [],
    });
  });

  it('creates the reverse single-direction relationship from the direction picker', async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();
    render(
      <NewRelationshipModal
        bookId="book"
        sourceId="source"
        targetId="target"
        currentChapter={1}
        onClose={vi.fn()}
        onCreated={onCreated}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Target -> Source' }));
    await user.click(screen.getByRole('button', { name: 'Create relationship' }));

    await waitFor(() => expect(onCreated).toHaveBeenCalled());
    expect(onCreated.mock.calls[0][0]).toMatchObject({
      sourceId: 'target',
      targetId: 'source',
      directed: true,
    });
  });
});
