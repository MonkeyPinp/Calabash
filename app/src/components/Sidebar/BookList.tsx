import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, MoreHorizontal, Plus } from 'lucide-react';
import type { Book, Category } from '@/types';
import { listBooks, createBook, updateBook, deleteBook } from '@/db/books';
import { createCategory, listCategories } from '@/db/categories';
import { useBookStore } from '@/stores/bookStore';
import { useGraphStore } from '@/stores/graphStore';
import { seedRogerAckroyd } from '@/lib/demoData';

// ─── Relative time helper ────────────────────────────────────────────────────

function relativeTime(ms: number): string {
  const seconds = Math.floor((Date.now() - ms) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

// ─── Confirm dialog ──────────────────────────────────────────────────────────

interface ConfirmDeleteProps {
  title: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDelete({ title, onConfirm, onCancel }: ConfirmDeleteProps) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'color-mix(in srgb, var(--ink-900) 34%, transparent)',
        zIndex: 1000,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--ink-200)',
          borderRadius: 8,
          padding: 24,
          maxWidth: 320,
          width: '90%',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <p
          style={{
            margin: '0 0 16px',
            fontSize: 14,
            color: 'var(--ink-800)',
            lineHeight: 1.5,
          }}
        >
          Delete &ldquo;{title}&rdquo; and all its characters?
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '6px 14px',
              fontSize: 13,
              background: 'transparent',
              border: '1px solid var(--ink-200)',
              borderRadius: 4,
              color: 'var(--ink-600)',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '6px 14px',
              fontSize: 13,
              background: 'var(--accent)',
              border: 'none',
              borderRadius: 4,
              color: 'var(--accent-ink)',
              cursor: 'pointer',
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── BookList ────────────────────────────────────────────────────────────────

export default function BookList() {
  const activeBookId = useBookStore((s) => s.activeBookId);
  const setActiveBook = useBookStore((s) => s.setActiveBook);
  const setCharacters = useGraphStore((s) => s.setCharacters);
  const setRelationships = useGraphStore((s) => s.setRelationships);
  const setStickyNotes = useGraphStore((s) => s.setStickyNotes);

  const setTotalChapters = useBookStore((s) => s.setTotalChapters);
  const setSpoilerShield = useBookStore((s) => s.setSpoilerShield);

  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [newTotalChapters, setNewTotalChapters] = useState(30);
  const [newCategoryId, setNewCategoryId] = useState('');
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // inline rename state
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // context menu state
  const [menuBookId, setMenuBookId] = useState<string | null>(null);

  // delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Book | null>(null);

  const newTitleRef = useRef<HTMLInputElement>(null);
  const newCategoryRef = useRef<HTMLInputElement>(null);
  const renameRef = useRef<HTMLInputElement>(null);

  // ── Load books ──────────────────────────────────────────────────────────
  async function refresh() {
    const [updated, nextCategories] = await Promise.all([listBooks(), listCategories()]);
    setBooks(updated);
    setCategories(nextCategories);
  }

  useEffect(() => {
    void refresh();
  }, [activeBookId]);

  // Focus new title input when form opens
  useEffect(() => {
    if (showNewForm) {
      setTimeout(() => newTitleRef.current?.focus(), 0);
    }
  }, [showNewForm]);

  useEffect(() => {
    if (showNewCategoryForm) {
      setTimeout(() => newCategoryRef.current?.focus(), 0);
    }
  }, [showNewCategoryForm]);

  // Focus rename input when renaming starts
  useEffect(() => {
    if (renamingId !== null) {
      setTimeout(() => renameRef.current?.focus(), 0);
    }
  }, [renamingId]);

  // Close menu when clicking elsewhere
  useEffect(() => {
    if (menuBookId === null) return;
    function handleClick() { setMenuBookId(null); }
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [menuBookId]);

  // ── Create ──────────────────────────────────────────────────────────────
  async function handleCreate() {
    const title = newTitle.trim();
    if (!title) return;
    const totalChapters = Math.max(1, newTotalChapters);
    const book = await createBook({
      title,
      author: newAuthor.trim() || undefined,
      totalChapters,
      categoryId: newCategoryId || undefined,
    });
    setNewTitle('');
    setNewAuthor('');
    setNewTotalChapters(30);
    setNewCategoryId('');
    setShowNewForm(false);
    setShowCreateMenu(false);
    await refresh();
    setActiveBook(book.id);
    setTotalChapters(totalChapters);
    setSpoilerShield(false);
    setCharacters([]);
    setRelationships([]);
    setStickyNotes([]);
  }

  async function handleCreateCategory() {
    const name = newCategoryName.trim();
    if (!name) return;
    const category = await createCategory({ name });
    setNewCategoryName('');
    setShowNewCategoryForm(false);
    setShowCreateMenu(false);
    await refresh();
    setNewCategoryId(category.id);
  }

  // ── Rename ──────────────────────────────────────────────────────────────
  function startRename(book: Book) {
    setMenuBookId(null);
    setRenamingId(book.id);
    setRenameValue(book.title);
  }

  async function commitRename() {
    if (renamingId === null) return;
    const title = renameValue.trim();
    if (title) {
      await updateBook(renamingId, { title });
      await refresh();
    }
    setRenamingId(null);
  }

  // ── Delete ──────────────────────────────────────────────────────────────
  function requestDelete(book: Book) {
    setMenuBookId(null);
    setDeleteTarget(book);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    await deleteBook(deleteTarget.id);
    if (activeBookId === deleteTarget.id) {
      setActiveBook(null);
      setSpoilerShield(false);
      setCharacters([]);
      setRelationships([]);
      setStickyNotes([]);
    }
    setDeleteTarget(null);
    await refresh();
  }

  async function handleBookCategoryChange(book: Book, categoryId: string) {
    await updateBook(book.id, { categoryId: categoryId || undefined });
    await refresh();
  }

  // ── Row click ───────────────────────────────────────────────────────────
  function handleRowClick(book: Book) {
    if (renamingId === book.id) return; // don't switch while renaming
    setCharacters([]);
    setRelationships([]);
    setStickyNotes([]);
    setTotalChapters(book.totalChapters);
    setSpoilerShield(book.spoilerShield);
    setActiveBook(book.id);
  }

  const groupedBooks: Array<{ id: string; name: string; category?: Category; books: Book[] }> = [
    {
      id: '',
      name: 'Uncategorized',
      books: books.filter((book) => !book.categoryId || !categories.some((category) => category.id === book.categoryId)),
    },
    ...categories.map((category) => ({
      id: category.id,
      name: category.name,
      category,
      books: books.filter((book) => book.categoryId === category.id),
    })),
  ].filter((group) => group.id || group.books.length > 0 || categories.length === 0);

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '4px 16px 6px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <span
          style={{
            flex: 1,
            fontSize: 10.5,
            fontWeight: 600,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--ink-500)',
          }}
        >
          Library
        </span>
        <button
          type="button"
          title="New book or category"
          aria-label="New book or category"
          onClick={() => {
            setShowCreateMenu((open) => !open);
            setShowNewForm(false);
            setShowNewCategoryForm(false);
          }}
          style={{
            width: 22,
            height: 22,
            padding: 0,
            display: 'grid',
            placeItems: 'center',
            background: 'transparent',
            color: 'var(--ink-600)',
            border: '1px solid var(--ink-200)',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          <Plus size={12} />
        </button>
      </div>

      {showCreateMenu && !showNewForm && !showNewCategoryForm && (
        <div
          style={{
            margin: '0 12px 8px',
            padding: 4,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 4,
            border: '1px solid var(--ink-200)',
            borderRadius: 5,
            background: 'var(--bg-canvas)',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setShowNewForm(true);
              setShowCreateMenu(false);
            }}
            style={{
              padding: '5px 0',
              fontSize: 12,
              background: 'transparent',
              border: 'none',
              borderRadius: 4,
              color: 'var(--ink-700)',
              cursor: 'pointer',
            }}
          >
            Book
          </button>
          <button
            type="button"
            onClick={() => {
              setShowNewCategoryForm(true);
              setShowCreateMenu(false);
            }}
            style={{
              padding: '5px 0',
              fontSize: 12,
              background: 'transparent',
              border: 'none',
              borderRadius: 4,
              color: 'var(--ink-700)',
              cursor: 'pointer',
            }}
          >
            Category
          </button>
          <button
            type="button"
            onClick={async () => {
              const newBookId = await seedRogerAckroyd();
              await refresh();
              setActiveBook(newBookId);
              setSpoilerShield(true);
              setCharacters([]);
              setRelationships([]);
              setStickyNotes([]);
              setShowCreateMenu(false);
            }}
            style={{
              gridColumn: '1 / -1',
              padding: '5px 0',
              fontSize: 11,
              background: 'transparent',
              border: '1px dashed var(--ink-300)',
              borderRadius: 4,
              color: 'var(--ink-600)',
              cursor: 'pointer',
              opacity: 0.72,
            }}
          >
            Load Ackroyd demo
          </button>
        </div>
      )}

      {showNewCategoryForm && (
        <div style={{ display: 'flex', gap: 4, margin: '0 12px 8px' }}>
          <input
            ref={newCategoryRef}
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleCreateCategory();
              if (e.key === 'Escape') {
                setShowNewCategoryForm(false);
                setNewCategoryName('');
              }
            }}
            placeholder="Category name"
            style={{
              flex: 1,
              minWidth: 0,
              fontSize: 12,
              padding: '5px 7px',
              background: 'var(--bg-canvas)',
              border: '1px solid var(--ink-200)',
              borderRadius: 4,
              color: 'var(--ink-900)',
              outline: 'none',
            }}
          />
          <button
            type="button"
            onClick={() => void handleCreateCategory()}
            disabled={!newCategoryName.trim()}
            style={{
              width: 32,
              border: 'none',
              borderRadius: 4,
              background: 'var(--accent)',
              color: 'var(--accent-ink)',
              cursor: newCategoryName.trim() ? 'pointer' : 'not-allowed',
              opacity: newCategoryName.trim() ? 1 : 0.5,
              fontSize: 13,
            }}
          >
            +
          </button>
        </div>
      )}

      {/* New book form */}
      {showNewForm && (
        <div
          style={{
            margin: '0 12px 8px',
            padding: '8px',
            border: '1px solid var(--ink-200)',
            borderRadius: 5,
            background: 'var(--bg-canvas)',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <input
            ref={newTitleRef}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleCreate();
              if (e.key === 'Escape') {
                setShowNewForm(false);
                setNewTitle('');
                setNewAuthor('');
                setNewCategoryId('');
              }
            }}
            placeholder="Title"
            style={{
              fontSize: 13,
              padding: '4px 8px',
              background: 'var(--bg-panel)',
              border: '1px solid var(--ink-200)',
              borderRadius: 4,
              color: 'var(--ink-900)',
              outline: 'none',
            }}
          />
          <input
            value={newAuthor}
            onChange={(e) => setNewAuthor(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleCreate();
              if (e.key === 'Escape') { setShowNewForm(false); setNewTitle(''); setNewAuthor(''); setNewCategoryId(''); }
            }}
            placeholder="Author (optional)"
            style={{
              fontSize: 13, padding: '4px 8px',
              background: 'var(--bg-panel)', border: '1px solid var(--ink-200)',
              borderRadius: 4, color: 'var(--ink-900)', outline: 'none',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label style={{ fontSize: 11, color: 'var(--ink-500)', whiteSpace: 'nowrap' }}>
              Chapters
            </label>
            <input
              type="number"
              min={1}
              max={9999}
              value={newTotalChapters}
              onChange={(e) => setNewTotalChapters(Math.max(1, Number(e.target.value)))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleCreate();
                if (e.key === 'Escape') { setShowNewForm(false); setNewTitle(''); setNewAuthor(''); setNewCategoryId(''); }
              }}
              style={{
                width: '60px', fontSize: 13, padding: '4px 8px',
                background: 'var(--bg-panel)', border: '1px solid var(--ink-200)',
                borderRadius: 4, color: 'var(--ink-900)', outline: 'none',
              }}
            />
          </div>
          <select
            value={newCategoryId}
            onChange={(e) => setNewCategoryId(e.target.value)}
            title="Book category"
            style={{
              fontSize: 13,
              padding: '4px 8px',
              background: 'var(--bg-panel)',
              border: '1px solid var(--ink-200)',
              borderRadius: 4,
              color: 'var(--ink-900)',
              outline: 'none',
            }}
          >
            <option value="">Uncategorized</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              onClick={() => void handleCreate()}
              disabled={!newTitle.trim()}
              style={{
                flex: 1,
                padding: '5px 0',
                fontSize: 13,
                background: 'var(--accent)',
                border: 'none',
                borderRadius: 4,
                color: 'var(--accent-ink)',
                cursor: newTitle.trim() ? 'pointer' : 'not-allowed',
                opacity: newTitle.trim() ? 1 : 0.5,
              }}
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => {
                setShowNewForm(false);
                setNewTitle('');
                setNewAuthor('');
                setNewTotalChapters(30);
                setNewCategoryId('');
              }}
              style={{
                flex: 1,
                padding: '5px 0',
                fontSize: 13,
                background: 'transparent',
                border: '1px solid var(--ink-200)',
                borderRadius: 4,
                color: 'var(--ink-600)',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Scrollable book list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '2px 0 12px' }}>
        {books.length === 0 && !showNewForm && (
          <div
            style={{
              padding: '28px 18px',
              color: 'var(--ink-500)',
              fontSize: 13,
              textAlign: 'center',
              lineHeight: 1.6,
            }}
          >
            No books yet — create one to start
          </div>
        )}

        {groupedBooks.map((group) => (
          <div key={group.id || 'uncategorized'} style={{ paddingTop: 6, marginBottom: 8 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 16px 6px',
                color: 'var(--ink-600)',
                fontSize: 11.5,
                fontWeight: 500,
                letterSpacing: '0.01em',
              }}
            >
              <span style={{ display: 'flex', color: 'var(--ink-400)' }}>
                {group.books.length > 0 ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
              </span>
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {group.name}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-400)' }}>{group.books.length}</span>
            </div>

            {group.books.map((book) => {
              const isActive = book.id === activeBookId;
              const isRenaming = renamingId === book.id;

              return (
                <div
                  key={book.id}
                  onClick={() => handleRowClick(book)}
                  style={{
                    position: 'relative',
                    margin: '1px 8px',
                    padding: '9px 12px 10px 14px',
                    cursor: 'pointer',
                    borderLeft: 'none',
                    borderRadius: 4,
                    background: isActive
                      ? 'var(--bg-selected)'
                      : 'transparent',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 6,
                  }}
                  className="book-row"
                >
                  {isActive && (
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 10,
                        bottom: 10,
                        width: 2,
                        background: 'var(--accent)',
                        borderRadius: 2,
                      }}
                    />
                  )}
                  {/* Text section */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {isRenaming ? (
                      <input
                        ref={renameRef}
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => void commitRename()}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void commitRename();
                          if (e.key === 'Escape') setRenamingId(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          width: '100%',
                          fontSize: 13,
                          fontWeight: 600,
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--accent)',
                          borderRadius: 3,
                          padding: '2px 5px',
                          color: 'var(--ink-900)',
                          outline: 'none',
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: 14,
                          fontWeight: isActive ? 500 : 400,
                          color: 'var(--ink-900)',
                          lineHeight: 1.2,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {book.title}
                      </div>
                    )}
                    {book.author && (
                      <div
                        style={{
                          fontSize: 11,
                          color: 'var(--ink-500)',
                          marginTop: 3,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {book.author}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                      <div style={{ flex: 1, height: 2, background: 'var(--ink-200)', borderRadius: 1, overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${Math.max(1, Math.min(100, Math.round((book.currentChapter / book.totalChapters) * 100)))}%`,
                            height: '100%',
                            background: isActive ? 'var(--accent)' : 'var(--ink-500)',
                          }}
                        />
                      </div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--ink-500)', flexShrink: 0 }}>
                        {book.currentChapter}/{book.totalChapters}
                      </span>
                      <span style={{ fontSize: 9.5, color: 'var(--ink-400)', flexShrink: 0 }}>
                        {relativeTime(book.updatedAt)}
                      </span>
                    </div>
                  </div>

                  {/* ⋯ menu button — visible on hover via CSS */}
                  <div style={{ position: 'relative' }}>
                    <button
                      className="book-menu-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuBookId(menuBookId === book.id ? null : book.id);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        padding: '2px 4px',
                        cursor: 'pointer',
                        color: 'var(--ink-500)',
                        borderRadius: 3,
                        display: 'flex',
                        alignItems: 'center',
                        opacity: menuBookId === book.id ? 1 : 0,
                        transition: 'opacity 0.1s',
                      }}
                      aria-label="Book options"
                    >
                      <MoreHorizontal size={14} />
                    </button>

                    {menuBookId === book.id && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          position: 'absolute',
                          right: 0,
                          top: '100%',
                          background: 'var(--bg-panel)',
                          border: '1px solid var(--ink-200)',
                          borderRadius: 4,
                          boxShadow: 'var(--shadow-pop)',
                          zIndex: 100,
                          minWidth: 160,
                          overflow: 'hidden',
                        }}
                      >
                        <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--ink-200)' }}>
                          <label style={{ display: 'block', fontSize: 10, color: 'var(--ink-500)', marginBottom: 4 }}>
                            Category
                          </label>
                          <select
                            value={book.categoryId ?? ''}
                            onChange={(e) => void handleBookCategoryChange(book, e.target.value)}
                            style={{
                              width: '100%',
                              fontSize: 12,
                              background: 'var(--bg-canvas)',
                              border: '1px solid var(--ink-200)',
                              borderRadius: 4,
                              color: 'var(--ink-900)',
                              padding: '4px 6px',
                              outline: 'none',
                            }}
                          >
                            <option value="">Uncategorized</option>
                            {categories.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <button
                          onClick={() => startRename(book)}
                          style={{
                            display: 'block',
                            width: '100%',
                            padding: '8px 12px',
                            fontSize: 13,
                            color: 'var(--ink-800)',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            textAlign: 'left',
                          }}
                        >
                          Rename
                        </button>
                        <button
                          onClick={() => requestDelete(book)}
                          style={{
                            display: 'block',
                            width: '100%',
                            padding: '8px 12px',
                            fontSize: 13,
                            color: 'var(--accent)',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            textAlign: 'left',
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Hover show menu button style */}
      <style>{`
        .book-row:hover .book-menu-btn {
          opacity: 1 !important;
        }
      `}</style>

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <ConfirmDelete
          title={deleteTarget.title}
          onConfirm={() => void confirmDelete()}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
