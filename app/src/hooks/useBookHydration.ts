import { useEffect, useState } from 'react';
import { listBooks } from '@/db/books';
import { listCharactersByBook } from '@/db/characters';
import { listRelationshipsByBook } from '@/db/relationships';
import { listAnnotationsByBook } from '@/db/annotations';
import { useBookStore } from '@/stores/bookStore';
import { useGraphStore } from '@/stores/graphStore';

export function useBookHydration(): { loading: boolean } {
  const [loading, setLoading] = useState(true);

  const setActiveBook = useBookStore((s) => s.setActiveBook);
  const setCurrentChapter = useBookStore((s) => s.setCurrentChapter);
  const setTotalChapters = useBookStore((s) => s.setTotalChapters);
  const setSpoilerShield = useBookStore((s) => s.setSpoilerShield);
  const activeBookId = useBookStore((s) => s.activeBookId);
  const setCharacters = useGraphStore((s) => s.setCharacters);
  const setRelationships = useGraphStore((s) => s.setRelationships);
  const setStickyNotes = useGraphStore((s) => s.setStickyNotes);

  // On mount: load books and set the most recently updated as active
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const books = await listBooks();
        if (!cancelled && books.length > 0) {
          setActiveBook(books[0].id);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When activeBookId changes: hydrate characters, relationships and currentChapter
  useEffect(() => {
    if (activeBookId === null) {
      setCharacters([]);
      setRelationships([]);
      setStickyNotes([]);
      setSpoilerShield(false);
      return;
    }

    let cancelled = false;
    (async () => {
      const [characters, relationships, books, annotations] = await Promise.all([
        listCharactersByBook(activeBookId),
        listRelationshipsByBook(activeBookId),
        listBooks(),
        listAnnotationsByBook(activeBookId),
      ]);
      if (cancelled) return;
      setCharacters(characters);
      setRelationships(relationships);
      setStickyNotes(annotations);
      const book = books.find((b) => b.id === activeBookId);
      if (book) {
        setCurrentChapter(book.currentChapter);
        setTotalChapters(book.totalChapters);
        setSpoilerShield(book.spoilerShield);
      }
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBookId]);

  return { loading };
}
