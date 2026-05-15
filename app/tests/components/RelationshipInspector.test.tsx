import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RelationshipInspector from '@/components/Inspector/RelationshipInspector';
import { db } from '@/db/schema';
import { useGraphStore } from '@/stores/graphStore';
import { useUiStore } from '@/stores/uiStore';
import type { Relationship } from '@/types';

const relationship: Relationship = {
  id: 'rel',
  bookId: 'book',
  sourceId: 'source',
  targetId: 'target',
  type: 'family',
  chapterRevealed: 1,
  certainty: 'confirmed',
  createdAt: 0,
  updatedAt: 0,
};

describe('RelationshipInspector', () => {
  beforeEach(async () => {
    await db.relationships.clear();
    await db.relationships.put(relationship);
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
      relationships: [relationship],
      stickyNotes: [],
      groupRanges: [],
      evidenceImages: [],
      undoStack: [],
      redoStack: [],
    });
  });

  it('can flip an existing relationship to the reverse single direction', async () => {
    const user = userEvent.setup();
    render(<RelationshipInspector relationshipId="rel" bookId="book" />);

    await user.click(screen.getByRole('button', { name: 'Target -> Source' }));

    await waitFor(() =>
      expect(useGraphStore.getState().relationships[0]).toMatchObject({
        sourceId: 'target',
        targetId: 'source',
        directed: true,
      }),
    );
  });
});
