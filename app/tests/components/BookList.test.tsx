import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import BookList from '@/components/Sidebar/BookList';
import { createBook } from '@/db/books';
import { db } from '@/db/schema';
import { useBookStore } from '@/stores/bookStore';
import { useGraphStore } from '@/stores/graphStore';
import { useUiStore } from '@/stores/uiStore';
import { useUserStore } from '@/stores/userStore';
import type { Character } from '@/types';

const character: Character = {
  id: 'char-1',
  bookId: 'book-1',
  name: 'Poirot',
  aliases: [{ name: 'Poirot', chapterRevealed: 1 }],
  role: 'detective',
  chapterIntroduced: 1,
  position: { x: 0, y: 0 },
  createdAt: 0,
  updatedAt: 0,
};

describe('BookList', () => {
  beforeEach(async () => {
    await Promise.all([
      db.books.clear(),
      db.categories.clear(),
      db.characters.clear(),
      db.relationships.clear(),
      db.portraits.clear(),
      db.annotations.clear(),
      db.groupRanges.clear(),
      db.evidenceImages.clear(),
      db.users.clear(),
    ]);
    useBookStore.setState({
      activeBookId: null,
      currentChapter: 1,
      totalChapters: 30,
      spoilerShield: false,
      spoilerChapters: [],
      highlightedChapters: [],
    });
    useGraphStore.setState({
      characters: [],
      relationships: [],
      stickyNotes: [],
      groupRanges: [],
      evidenceImages: [],
      undoStack: [],
      redoStack: [],
    });
    useUserStore.setState({
      users: [],
      activeUserId: 'reader-1',
      hydrated: true,
    });
    useUiStore.setState({
      theme: 'light',
      themePreference: 'light',
      language: 'system',
      resolvedLanguage: 'en',
      characterNodeViewMode: 'text',
    });
  });

  it('does not clear the graph when the active book is clicked again', async () => {
    const book = await createBook({ id: 'book-1', userId: 'reader-1', title: 'The Active Case' });
    useBookStore.getState().setActiveBook(book.id);
    useGraphStore.getState().setCharacters([character]);

    render(<BookList />);
    await waitFor(() => expect(screen.getByText('The Active Case')).toBeInTheDocument());

    fireEvent.click(screen.getByText('The Active Case'));

    expect(useBookStore.getState().activeBookId).toBe(book.id);
    expect(useGraphStore.getState().characters).toEqual([character]);
  });

  it('asks how to start a new book before showing the blank form', async () => {
    render(<BookList />);

    fireEvent.click(screen.getByLabelText('New book or category'));
    fireEvent.click(screen.getByText('Book'));

    expect(screen.getByText('Start from scratch')).toBeInTheDocument();
    expect(screen.getByText('Import book JSON')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Start from scratch'));
    expect(screen.getByPlaceholderText('Title')).toBeInTheDocument();
  });

  it('imports a single-book JSON from the new-book choice', async () => {
    const { container } = render(<BookList />);
    fireEvent.click(screen.getByLabelText('New book or category'));
    fireEvent.click(screen.getByText('Book'));

    const file = new File([
      JSON.stringify({
        importType: 'book',
        book: { title: 'Imported Party Case', totalChapters: 3 },
        characters: [
          { key: 'host', name: 'Host', role: 'victim' },
          { key: 'guest', name: 'Guest', role: 'suspect' },
        ],
        relationships: [
          { source: 'guest', target: 'host', type: 'motive', certainty: 'suspected' },
        ],
      }),
    ], 'case.calabash.json', { type: 'application/json' });
    Object.defineProperty(file, 'text', {
      value: () => Promise.resolve(JSON.stringify({
        importType: 'book',
        book: { title: 'Imported Party Case', totalChapters: 3 },
        characters: [
          { key: 'host', name: 'Host', role: 'victim' },
          { key: 'guest', name: 'Guest', role: 'suspect' },
        ],
        relationships: [
          { source: 'guest', target: 'host', type: 'motive', certainty: 'suspected' },
        ],
      })),
    });

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(screen.getByText('Imported Party Case')).toBeInTheDocument());
    expect(useBookStore.getState().activeBookId).toBeTruthy();
    expect(await db.characters.count()).toBe(2);
    expect(await db.relationships.count()).toBe(1);
  });
});
