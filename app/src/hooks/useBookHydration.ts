import { useEffect, useState } from 'react';
import { getBook, listBooks } from '@/db/books';
import { listCharactersByBook } from '@/db/characters';
import { listRelationshipsByBook } from '@/db/relationships';
import { listAnnotationsByBook } from '@/db/annotations';
import { listGroupRangesByBook } from '@/db/groupRanges';
import { useBookStore } from '@/stores/bookStore';
import { useGraphStore } from '@/stores/graphStore';
import { useUserStore } from '@/stores/userStore';

export function useBookHydration(): { loading: boolean } {
  const [loading, setLoading] = useState(true);

  const setActiveBook = useBookStore((s) => s.setActiveBook);
  const setCurrentChapter = useBookStore((s) => s.setCurrentChapter);
  const setTotalChapters = useBookStore((s) => s.setTotalChapters);
  const setSpoilerShield = useBookStore((s) => s.setSpoilerShield);
  const setSpoilerChapters = useBookStore((s) => s.setSpoilerChapters);
  const setHighlightedChapters = useBookStore((s) => s.setHighlightedChapters);
  const activeBookId = useBookStore((s) => s.activeBookId);
  const setCharacters = useGraphStore((s) => s.setCharacters);
  const setRelationships = useGraphStore((s) => s.setRelationships);
  const setStickyNotes = useGraphStore((s) => s.setStickyNotes);
  const setGroupRanges = useGraphStore((s) => s.setGroupRanges);
  const activeUserId = useUserStore((s) => s.activeUserId);
  const usersHydrated = useUserStore((s) => s.hydrated);
  const hydrateUsers = useUserStore((s) => s.hydrateUsers);

  // On mount: ensure a local reader profile exists, then profile-scoped books load below.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await hydrateUsers();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When profile changes: open that reader's most recent book, or clear the board.
  useEffect(() => {
    if (!usersHydrated) return;
    if (!activeUserId) {
      setActiveBook(null);
      setCharacters([]);
      setRelationships([]);
      setStickyNotes([]);
      setGroupRanges([]);
      setSpoilerShield(false);
      setSpoilerChapters([]);
      setHighlightedChapters([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const books = await listBooks(activeUserId);
        if (!cancelled) setActiveBook(books[0]?.id ?? null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usersHydrated, activeUserId]);

  // When activeBookId changes: hydrate characters, relationships and currentChapter
  useEffect(() => {
    if (activeBookId === null) {
      setCharacters([]);
      setRelationships([]);
      setStickyNotes([]);
      setGroupRanges([]);
      setSpoilerShield(false);
      setSpoilerChapters([]);
      setHighlightedChapters([]);
      return;
    }

    let cancelled = false;
    (async () => {
      const [characters, relationships, book, annotations, groupRanges] = await Promise.all([
        listCharactersByBook(activeBookId),
        listRelationshipsByBook(activeBookId),
        getBook(activeBookId),
        listAnnotationsByBook(activeBookId),
        listGroupRangesByBook(activeBookId),
      ]);
      if (cancelled) return;
      setCharacters(characters);
      setRelationships(relationships);
      setStickyNotes(annotations);
      setGroupRanges(groupRanges);
      if (book) {
        setCurrentChapter(book.currentChapter);
        setTotalChapters(book.totalChapters);
        setSpoilerShield(book.spoilerShield);
        setSpoilerChapters(book.spoilerChapters);
        setHighlightedChapters(book.highlightedChapters);
      }
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBookId]);

  return { loading };
}
