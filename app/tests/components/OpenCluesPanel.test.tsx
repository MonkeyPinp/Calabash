import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OpenCluesPanel from '@/components/Inspector/OpenCluesPanel';
import { createBook, createOpenClue, listOpenClues, updateOpenClue } from '@/db/books';
import { db } from '@/db/schema';
import { useUiStore } from '@/stores/uiStore';

describe('OpenCluesPanel', () => {
  beforeEach(async () => {
    await db.books.clear();
    useUiStore.setState({
      theme: 'light',
      themePreference: 'light',
      language: 'system',
      resolvedLanguage: 'en',
      characterNodeViewMode: 'text',
    });
  });

  it('keeps explained clues visible with a strikethrough at the bottom of the list', async () => {
    const book = await createBook({ title: 'Clue Case' });
    const explained = await createOpenClue({
      bookId: book.id,
      text: 'The old clue has an answer',
      chapterIntroduced: 1,
    });
    await updateOpenClue(book.id, explained.id, { status: 'explained' });
    await createOpenClue({
      bookId: book.id,
      text: 'The new clue is still open',
      chapterIntroduced: 1,
    });

    render(<OpenCluesPanel bookId={book.id} currentChapter={1} />);

    const panel = await screen.findByTestId('open-clues-panel');
    await screen.findByText('The old clue has an answer');
    expect(panel).toHaveTextContent('1 open');
    expect(panel.textContent?.indexOf('The new clue is still open')).toBeLessThan(
      panel.textContent?.indexOf('The old clue has an answer') ?? -1,
    );
    expect(screen.getByText('The old clue has an answer')).toHaveStyle({ textDecoration: 'line-through' });
    expect(screen.queryByText('No open clues for this chapter yet.')).not.toBeInTheDocument();
  });

  it('marks clues explained without deleting them and allows reopening', async () => {
    const user = userEvent.setup();
    const book = await createBook({ title: 'Clue Case' });
    const clue = await createOpenClue({
      bookId: book.id,
      text: 'Who moved the candlestick?',
      chapterIntroduced: 1,
    });

    render(<OpenCluesPanel bookId={book.id} currentChapter={1} />);

    await user.click(await screen.findByRole('button', { name: 'Mark explained' }));

    await waitFor(async () => {
      await expect(listOpenClues(book.id)).resolves.toMatchObject([
        { id: clue.id, text: 'Who moved the candlestick?', status: 'explained' },
      ]);
    });
    expect(screen.getByText('Who moved the candlestick?')).toHaveStyle({ textDecoration: 'line-through' });
    expect(within(screen.getByTestId('open-clues-panel')).getByText('0 open')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Mark open' }));

    await waitFor(async () => {
      await expect(listOpenClues(book.id)).resolves.toMatchObject([
        { id: clue.id, text: 'Who moved the candlestick?', status: 'open' },
      ]);
    });
    expect(screen.getByText('Who moved the candlestick?')).not.toHaveStyle({ textDecoration: 'line-through' });
  });
});
