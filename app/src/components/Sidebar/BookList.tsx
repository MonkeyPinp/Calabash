import { useEffect, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import type { Book } from '@/types';
import { listBooks, createBook, updateBook, deleteBook } from '@/db/books';
import { useBookStore } from '@/stores/bookStore';
import { useGraphStore } from '@/stores/graphStore';
import { seedRogerAckroyd, seedHundredYearsSolitude } from '@/lib/demoData';

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
        background: 'rgba(0,0,0,0.4)',
        zIndex: 1000,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: 'var(--bg-panel)',
          border: '1px solid var(--border)',
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
            color: 'var(--fg-primary)',
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
              border: '1px solid var(--border)',
              borderRadius: 4,
              color: 'var(--fg-muted)',
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
              color: '#fff',
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

  const setTotalChapters = useBookStore((s) => s.setTotalChapters);

  const [books, setBooks] = useState<Book[]>([]);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [newTotalChapters, setNewTotalChapters] = useState(30);

  // inline rename state
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // context menu state
  const [menuBookId, setMenuBookId] = useState<string | null>(null);

  // delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Book | null>(null);

  const newTitleRef = useRef<HTMLInputElement>(null);
  const renameRef = useRef<HTMLInputElement>(null);

  // ── Load books ──────────────────────────────────────────────────────────
  async function refresh() {
    const updated = await listBooks();
    setBooks(updated);
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
    const book = await createBook({ title, author: newAuthor.trim() || undefined, totalChapters });
    setNewTitle('');
    setNewAuthor('');
    setNewTotalChapters(30);
    setShowNewForm(false);
    await refresh();
    setActiveBook(book.id);
    setTotalChapters(totalChapters);
    setCharacters([]);
    setRelationships([]);
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
      setCharacters([]);
      setRelationships([]);
    }
    setDeleteTarget(null);
    await refresh();
  }

  // ── Row click ───────────────────────────────────────────────────────────
  function handleRowClick(book: Book) {
    if (renamingId === book.id) return; // don't switch while renaming
    setActiveBook(book.id);
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Scrollable book list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {books.length === 0 && !showNewForm && (
          <div
            style={{
              padding: '24px 16px',
              color: 'var(--fg-muted)',
              fontSize: 13,
              textAlign: 'center',
              lineHeight: 1.6,
            }}
          >
            No books yet — create one to start
          </div>
        )}

        {books.map((book) => {
          const isActive = book.id === activeBookId;
          const isRenaming = renamingId === book.id;

          return (
            <div
              key={book.id}
              onClick={() => handleRowClick(book)}
              style={{
                position: 'relative',
                padding: '8px 12px 8px 14px',
                cursor: 'pointer',
                borderLeft: isActive
                  ? '3px solid var(--accent)'
                  : '3px solid transparent',
                background: isActive
                  ? 'color-mix(in srgb, var(--accent) 8%, var(--bg-panel))'
                  : 'transparent',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 6,
              }}
              className="book-row"
            >
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
                      background: 'var(--bg-canvas)',
                      border: '1px solid var(--accent)',
                      borderRadius: 3,
                      padding: '1px 4px',
                      color: 'var(--fg-primary)',
                      outline: 'none',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--fg-primary)',
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
                      color: 'var(--fg-muted)',
                      marginTop: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {book.author}
                  </div>
                )}
                <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 2 }}>
                  {relativeTime(book.updatedAt)}
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
                    color: 'var(--fg-muted)',
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
                      border: '1px solid var(--border)',
                      borderRadius: 4,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      zIndex: 100,
                      minWidth: 120,
                      overflow: 'hidden',
                    }}
                  >
                    <button
                      onClick={() => startRename(book)}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '8px 12px',
                        fontSize: 13,
                        color: 'var(--fg-primary)',
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

      {/* New book form */}
      {showNewForm && (
        <div
          style={{
            padding: '10px 12px',
            borderTop: '1px solid var(--border)',
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
              }
            }}
            placeholder="Title"
            style={{
              fontSize: 13,
              padding: '4px 8px',
              background: 'var(--bg-canvas)',
              border: '1px solid var(--border)',
              borderRadius: 4,
              color: 'var(--fg-primary)',
              outline: 'none',
            }}
          />
          <input
            value={newAuthor}
            onChange={(e) => setNewAuthor(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleCreate();
              if (e.key === 'Escape') { setShowNewForm(false); setNewTitle(''); setNewAuthor(''); }
            }}
            placeholder="Author (optional)"
            style={{
              fontSize: 13, padding: '4px 8px',
              background: 'var(--bg-canvas)', border: '1px solid var(--border)',
              borderRadius: 4, color: 'var(--fg-primary)', outline: 'none',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label style={{ fontSize: 11, color: 'var(--fg-muted)', whiteSpace: 'nowrap' }}>
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
                if (e.key === 'Escape') { setShowNewForm(false); setNewTitle(''); setNewAuthor(''); }
              }}
              style={{
                width: '60px', fontSize: 13, padding: '4px 8px',
                background: 'var(--bg-canvas)', border: '1px solid var(--border)',
                borderRadius: 4, color: 'var(--fg-primary)', outline: 'none',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => void handleCreate()}
              disabled={!newTitle.trim()}
              style={{
                flex: 1,
                padding: '5px 0',
                fontSize: 13,
                background: 'var(--accent)',
                border: 'none',
                borderRadius: 4,
                color: '#fff',
                cursor: newTitle.trim() ? 'pointer' : 'not-allowed',
                opacity: newTitle.trim() ? 1 : 0.5,
              }}
            >
              Create
            </button>
            <button
              onClick={() => {
                setShowNewForm(false);
                setNewTitle('');
                setNewAuthor('');
                setNewTotalChapters(30);
              }}
              style={{
                flex: 1,
                padding: '5px 0',
                fontSize: 13,
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: 4,
                color: 'var(--fg-muted)',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* + New Book button */}
      {!showNewForm && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, margin: '6px 12px 8px' }}>
          <button
            onClick={() => setShowNewForm(true)}
            style={{
              padding: '6px 0', fontSize: 13,
              background: 'transparent', border: '1px dashed var(--border)',
              borderRadius: 4, color: 'var(--fg-muted)', cursor: 'pointer', textAlign: 'center',
            }}
          >
            + New Book
          </button>
          <button
            onClick={async () => {
              const newBookId = await seedRogerAckroyd();
              await refresh();
              setActiveBook(newBookId);
              setCharacters([]);
              setRelationships([]);
            }}
            style={{
              padding: '5px 0', fontSize: 11,
              background: 'transparent', border: '1px dashed var(--border)',
              borderRadius: 4, color: 'var(--fg-muted)', cursor: 'pointer', textAlign: 'center',
              opacity: 0.7,
            }}
          >
            ↓ Load Ackroyd demo
          </button>
          <button
            onClick={async () => {
              const newBookId = await seedHundredYearsSolitude();
              await refresh();
              setActiveBook(newBookId);
              setCharacters([]);
              setRelationships([]);
            }}
            style={{
              padding: '5px 0', fontSize: 11,
              background: 'transparent', border: '1px dashed var(--border)',
              borderRadius: 4, color: 'var(--fg-muted)', cursor: 'pointer', textAlign: 'center',
              opacity: 0.7,
            }}
          >
            ↓ Load Solitude demo
          </button>
        </div>
      )}

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
