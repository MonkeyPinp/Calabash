import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, MoreHorizontal, Plus } from 'lucide-react';
import type { Book, Category } from '@/types';
import { listBooks, createBook, updateBook, deleteBook, getBook } from '@/db/books';
import { createCategory, deleteCategory, listCategories, updateCategory } from '@/db/categories';
import { useBookStore } from '@/stores/bookStore';
import { useGraphStore } from '@/stores/graphStore';
import { useUserStore } from '@/stores/userStore';
import { useUiStore } from '@/stores/uiStore';
import { useT } from '@/i18n';
import { seedTutorialBook, type TutorialKind } from '@/lib/demoData';

function relativeTime(ms: number, t: ReturnType<typeof useT>): string {
  const seconds = Math.floor((Date.now() - ms) / 1000);
  if (seconds < 60) return t('time.justNow');
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t('time.minutesAgo', { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('time.hoursAgo', { count: hours });
  const days = Math.floor(hours / 24);
  if (days < 30) return t('time.daysAgo', { count: days });
  const months = Math.floor(days / 30);
  if (months < 12) return t('time.monthsAgo', { count: months });
  return t('time.yearsAgo', { count: Math.floor(months / 12) });
}

interface ConfirmDialogProps {
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({ message, confirmLabel, cancelLabel, onConfirm, onCancel }: ConfirmDialogProps) {
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
          padding: 22,
          maxWidth: 340,
          width: '90%',
          boxShadow: 'var(--shadow-modal)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <p style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--ink-800)', lineHeight: 1.5 }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            type="button"
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
            {cancelLabel}
          </button>
          <button
            type="button"
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
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BookList() {
  const t = useT();
  const activeBookId = useBookStore((s) => s.activeBookId);
  const currentChapter = useBookStore((s) => s.currentChapter);
  const activeTotalChapters = useBookStore((s) => s.totalChapters);
  const setActiveBook = useBookStore((s) => s.setActiveBook);
  const setCurrentChapter = useBookStore((s) => s.setCurrentChapter);
  const setTotalChapters = useBookStore((s) => s.setTotalChapters);
  const setSpoilerShield = useBookStore((s) => s.setSpoilerShield);
  const setSpoilerChapters = useBookStore((s) => s.setSpoilerChapters);
  const setHighlightedChapters = useBookStore((s) => s.setHighlightedChapters);
  const setCharacters = useGraphStore((s) => s.setCharacters);
  const setRelationships = useGraphStore((s) => s.setRelationships);
  const setStickyNotes = useGraphStore((s) => s.setStickyNotes);
  const setGroupRanges = useGraphStore((s) => s.setGroupRanges);
  const activeUserId = useUserStore((s) => s.activeUserId);
  const resolvedLanguage = useUiStore((s) => s.resolvedLanguage);

  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [newTotalChapters, setNewTotalChapters] = useState(30);
  const [newCategoryId, setNewCategoryId] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [renamingBookId, setRenamingBookId] = useState<string | null>(null);
  const [renameBookValue, setRenameBookValue] = useState('');
  const [renamingCategoryId, setRenamingCategoryId] = useState<string | null>(null);
  const [renameCategoryValue, setRenameCategoryValue] = useState('');
  const [menuBookId, setMenuBookId] = useState<string | null>(null);
  const [menuCategoryId, setMenuCategoryId] = useState<string | null>(null);
  const [deleteBookTarget, setDeleteBookTarget] = useState<Book | null>(null);
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<Category | null>(null);
  const [collapsedCategoryIds, setCollapsedCategoryIds] = useState<Set<string>>(new Set());

  const newTitleRef = useRef<HTMLInputElement>(null);
  const newCategoryRef = useRef<HTMLInputElement>(null);
  const renameBookRef = useRef<HTMLInputElement>(null);
  const renameCategoryRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    if (!activeUserId) {
      setBooks([]);
      setCategories([]);
      return;
    }
    const [nextBooks, nextCategories] = await Promise.all([
      listBooks(activeUserId),
      listCategories(activeUserId),
    ]);
    setBooks(nextBooks);
    setCategories(nextCategories);
  }

  useEffect(() => {
    void refresh();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBookId, activeUserId]);

  useEffect(() => {
    if (showNewForm) setTimeout(() => newTitleRef.current?.focus(), 0);
  }, [showNewForm]);

  useEffect(() => {
    if (showNewCategoryForm) setTimeout(() => newCategoryRef.current?.focus(), 0);
  }, [showNewCategoryForm]);

  useEffect(() => {
    if (renamingBookId !== null) setTimeout(() => renameBookRef.current?.focus(), 0);
  }, [renamingBookId]);

  useEffect(() => {
    if (renamingCategoryId !== null) setTimeout(() => renameCategoryRef.current?.focus(), 0);
  }, [renamingCategoryId]);

  useEffect(() => {
    if (menuBookId === null && menuCategoryId === null) return undefined;
    function handleClick() {
      setMenuBookId(null);
      setMenuCategoryId(null);
    }
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [menuBookId, menuCategoryId]);

  function clearGraphSelection() {
    setCharacters([]);
    setRelationships([]);
    setStickyNotes([]);
    setGroupRanges([]);
  }

  async function handleCreate() {
    const title = newTitle.trim();
    if (!title || !activeUserId) return;
    const totalChapters = Math.max(1, newTotalChapters);
    const book = await createBook({
      userId: activeUserId,
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
    setCurrentChapter(book.currentChapter);
    setTotalChapters(totalChapters);
    setSpoilerShield(false);
    setSpoilerChapters([]);
    setHighlightedChapters([]);
    clearGraphSelection();
  }

  async function handleCreateCategory() {
    const name = newCategoryName.trim();
    if (!name || !activeUserId) return;
    const category = await createCategory({ name, userId: activeUserId });
    setNewCategoryName('');
    setShowNewCategoryForm(false);
    setShowCreateMenu(false);
    await refresh();
    setNewCategoryId(category.id);
  }

  async function handleSeedAckroyd() {
    if (!activeUserId) return;
    const newBookId = await seedTutorialBook({ userId: activeUserId, language: resolvedLanguage, kind: 'ackroyd' });
    const book = await getBook(newBookId);
    await refresh();
    setActiveBook(newBookId);
    if (book) {
      setCurrentChapter(book.currentChapter);
      setTotalChapters(book.totalChapters);
      setSpoilerShield(book.spoilerShield);
      setSpoilerChapters(book.spoilerChapters);
      setHighlightedChapters(book.highlightedChapters);
    }
    clearGraphSelection();
    setShowCreateMenu(false);
  }

  async function handleSeedTutorial(kind: TutorialKind) {
    if (!activeUserId) return;
    const newBookId = await seedTutorialBook({ userId: activeUserId, language: resolvedLanguage, kind });
    const book = await getBook(newBookId);
    await refresh();
    setActiveBook(newBookId);
    if (book) {
      setCurrentChapter(book.currentChapter);
      setTotalChapters(book.totalChapters);
      setSpoilerShield(book.spoilerShield);
      setSpoilerChapters(book.spoilerChapters);
      setHighlightedChapters(book.highlightedChapters);
    }
    clearGraphSelection();
    setShowCreateMenu(false);
  }

  function startRenameBook(book: Book) {
    setMenuBookId(null);
    setRenamingBookId(book.id);
    setRenameBookValue(book.title);
  }

  async function commitRenameBook() {
    if (renamingBookId === null) return;
    const title = renameBookValue.trim();
    if (title) {
      await updateBook(renamingBookId, { title });
      await refresh();
    }
    setRenamingBookId(null);
  }

  function startRenameCategory(category: Category) {
    setMenuCategoryId(null);
    setRenamingCategoryId(category.id);
    setRenameCategoryValue(category.name);
  }

  async function commitRenameCategory() {
    if (renamingCategoryId === null) return;
    const name = renameCategoryValue.trim();
    if (name) {
      await updateCategory(renamingCategoryId, { name });
      await refresh();
    }
    setRenamingCategoryId(null);
  }

  async function confirmDeleteBook() {
    if (!deleteBookTarget) return;
    await deleteBook(deleteBookTarget.id);
    if (activeBookId === deleteBookTarget.id) {
      setActiveBook(null);
      setSpoilerShield(false);
      setSpoilerChapters([]);
      setHighlightedChapters([]);
      clearGraphSelection();
    }
    setDeleteBookTarget(null);
    await refresh();
  }

  async function confirmDeleteCategory() {
    if (!deleteCategoryTarget) return;
    await deleteCategory(deleteCategoryTarget.id);
    setDeleteCategoryTarget(null);
    await refresh();
  }

  async function handleBookCategoryChange(book: Book, categoryId: string) {
    await updateBook(book.id, { categoryId: categoryId || undefined });
    await refresh();
  }

  function handleRowClick(book: Book) {
    if (renamingBookId === book.id) return;
    clearGraphSelection();
    setCurrentChapter(book.currentChapter);
    setTotalChapters(book.totalChapters);
    setSpoilerShield(book.spoilerShield);
    setSpoilerChapters(book.spoilerChapters);
    setHighlightedChapters(book.highlightedChapters);
    setActiveBook(book.id);
  }

  function toggleGroup(groupId: string) {
    setCollapsedCategoryIds((current) => {
      const next = new Set(current);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }

  const groupedBooks: Array<{ id: string; name: string; category?: Category; books: Book[] }> = [
    {
      id: '__uncategorized',
      name: t('sidebar.uncategorized'),
      books: books.filter((book) => !book.categoryId || !categories.some((category) => category.id === book.categoryId)),
    },
    ...categories.map((category) => ({
      id: category.id,
      name: category.name,
      category,
      books: books.filter((book) => book.categoryId === category.id),
    })),
  ].filter((group) => group.id !== '__uncategorized' || group.books.length > 0 || categories.length === 0);

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '4px 16px 6px', display: 'flex', alignItems: 'center' }}>
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
          {t('sidebar.library')}
        </span>
        <button
          type="button"
          title={t('sidebar.newBookOrCategory')}
          aria-label={t('sidebar.newBookOrCategory')}
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
          <button type="button" onClick={() => { setShowNewForm(true); setShowCreateMenu(false); }} style={menuActionStyle}>
            {t('sidebar.book')}
          </button>
          <button type="button" onClick={() => { setShowNewCategoryForm(true); setShowCreateMenu(false); }} style={menuActionStyle}>
            {t('sidebar.category')}
          </button>
          <button type="button" onClick={() => void handleSeedAckroyd()} style={secondaryMenuActionStyle}>
            {t('sidebar.loadDemo')}
          </button>
          <button type="button" onClick={() => void handleSeedTutorial('hida')} style={secondaryMenuActionStyle}>
            {t('sidebar.createTutorial')}
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
            placeholder={t('sidebar.categoryName')}
            style={compactInputStyle}
          />
          <button type="button" onClick={() => void handleCreateCategory()} disabled={!newCategoryName.trim()} style={compactCreateButtonStyle(!newCategoryName.trim())}>
            +
          </button>
        </div>
      )}

      {showNewForm && (
        <div style={{ margin: '0 12px 8px', padding: 8, border: '1px solid var(--ink-200)', borderRadius: 5, background: 'var(--bg-canvas)', display: 'flex', flexDirection: 'column', gap: 6 }}>
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
            placeholder={t('sidebar.title')}
            style={formInputStyle}
          />
          <input
            value={newAuthor}
            onChange={(e) => setNewAuthor(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleCreate();
              if (e.key === 'Escape') {
                setShowNewForm(false);
                setNewTitle('');
                setNewAuthor('');
                setNewCategoryId('');
              }
            }}
            placeholder={t('sidebar.authorOptional')}
            style={formInputStyle}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label style={{ fontSize: 11, color: 'var(--ink-500)', whiteSpace: 'nowrap' }}>{t('sidebar.chapters')}</label>
            <input
              type="number"
              min={1}
              max={9999}
              value={newTotalChapters}
              onChange={(e) => setNewTotalChapters(Math.max(1, Number(e.target.value)))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleCreate();
                if (e.key === 'Escape') {
                  setShowNewForm(false);
                  setNewTitle('');
                  setNewAuthor('');
                  setNewCategoryId('');
                }
              }}
              style={{ ...formInputStyle, width: 64 }}
            />
          </div>
          <select
            value={newCategoryId}
            onChange={(e) => setNewCategoryId(e.target.value)}
            title={t('sidebar.bookCategory')}
            style={formInputStyle}
          >
            <option value="">{t('sidebar.uncategorized')}</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" onClick={() => void handleCreate()} disabled={!newTitle.trim()} style={primaryFormButtonStyle(!newTitle.trim())}>
              {t('sidebar.create')}
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
              style={secondaryFormButtonStyle}
            >
              {t('sidebar.cancel')}
            </button>
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '2px 0 12px' }}>
        {books.length === 0 && !showNewForm && (
          <div style={{ padding: '28px 18px', color: 'var(--ink-500)', fontSize: 13, textAlign: 'center', lineHeight: 1.6 }}>
            {t('sidebar.noBooks')}
          </div>
        )}

        {groupedBooks.map((group) => {
          const collapsed = collapsedCategoryIds.has(group.id);
          return (
            <div key={group.id} style={{ paddingTop: 6, marginBottom: 8 }}>
              <div style={groupHeaderStyle}>
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  style={{ display: 'flex', color: 'var(--ink-400)', background: 'transparent', border: 0, padding: 0, cursor: 'pointer' }}
                  aria-label={collapsed ? 'Expand category' : 'Collapse category'}
                >
                  {collapsed ? <ChevronRight size={11} /> : <ChevronDown size={11} />}
                </button>
                {renamingCategoryId === group.category?.id ? (
                  <input
                    ref={renameCategoryRef}
                    value={renameCategoryValue}
                    onChange={(e) => setRenameCategoryValue(e.target.value)}
                    onBlur={() => void commitRenameCategory()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void commitRenameCategory();
                      if (e.key === 'Escape') setRenamingCategoryId(null);
                    }}
                    style={{ ...compactInputStyle, height: 22, fontSize: 11.5 }}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      border: 0,
                      background: 'transparent',
                      padding: 0,
                      color: 'inherit',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    {group.name}
                  </button>
                )}
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-400)' }}>{group.books.length}</span>
                {group.category && (
                  <div style={{ position: 'relative' }}>
                    <button
                      type="button"
                      aria-label={t('sidebar.categoryOptions')}
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuCategoryId(menuCategoryId === group.category?.id ? null : group.category?.id ?? null);
                      }}
                      style={categoryMenuButtonStyle}
                    >
                      <MoreHorizontal size={13} />
                    </button>
                    {menuCategoryId === group.category.id && (
                      <div onClick={(e) => e.stopPropagation()} style={contextMenuStyle}>
                        <button type="button" onClick={() => startRenameCategory(group.category!)} style={contextMenuButtonStyle}>
                          {t('sidebar.rename')}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMenuCategoryId(null);
                            setDeleteCategoryTarget(group.category!);
                          }}
                          style={{ ...contextMenuButtonStyle, color: 'var(--accent)' }}
                        >
                          {t('sidebar.delete')}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {!collapsed && group.books.map((book) => {
                const isActive = book.id === activeBookId;
                const isRenaming = renamingBookId === book.id;
                const displayChapter = isActive ? currentChapter : book.currentChapter;
                const displayTotalChapters = isActive ? activeTotalChapters : book.totalChapters;
                const progressPct = Math.max(1, Math.min(100, Math.round((displayChapter / displayTotalChapters) * 100)));
                const tickCount = Math.min(displayTotalChapters, 16);

                return (
                  <div
                    key={book.id}
                    onClick={() => handleRowClick(book)}
                    style={{
                      position: 'relative',
                      margin: '1px 8px',
                      padding: '10px 14px 11px 14px',
                      cursor: 'pointer',
                      borderRadius: 4,
                      background: isActive ? 'var(--bg-selected)' : 'transparent',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 6,
                    }}
                    className="book-row"
                  >
                    {isActive && <div style={{ position: 'absolute', left: 0, top: 10, bottom: 10, width: 2, background: 'var(--accent)', borderRadius: 2 }} />}
                    {isActive && (
                      <div
                        aria-hidden="true"
                        style={{
                          position: 'absolute',
                          right: -8,
                          top: 10,
                          width: 8,
                          height: 22,
                          background: 'var(--accent)',
                          borderRadius: '0 2px 2px 0',
                          boxShadow: '0 1px 2px rgba(40, 28, 12, 0.20)',
                        }}
                      >
                        <div
                          style={{
                            position: 'absolute',
                            right: 0,
                            top: 0,
                            width: 0,
                            height: 0,
                            borderTop: '4px solid color-mix(in srgb, var(--accent) 62%, black)',
                            borderRight: '4px solid transparent',
                          }}
                        />
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {isRenaming ? (
                        <input
                          ref={renameBookRef}
                          value={renameBookValue}
                          onChange={(e) => setRenameBookValue(e.target.value)}
                          onBlur={() => void commitRenameBook()}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') void commitRenameBook();
                            if (e.key === 'Escape') setRenamingBookId(null);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          style={{ ...compactInputStyle, width: '100%', fontSize: 13, fontWeight: 600 }}
                        />
                      ) : (
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: isActive ? 500 : 400, color: 'var(--ink-900)', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {book.title}
                        </div>
                      )}
                      {book.author && (
                        <div style={{ fontSize: 10.5, color: 'var(--ink-500)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontStyle: 'italic', letterSpacing: '0.01em' }}>
                          {book.author}
                        </div>
                      )}
                      <div style={{ marginTop: 8, position: 'relative', height: 8 }}>
                        <div style={{ position: 'absolute', left: 0, right: 42, top: 3, height: 3, background: 'var(--ink-200)', borderRadius: 1.5, overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${progressPct}%`,
                              height: '100%',
                              background: isActive ? 'var(--accent)' : 'var(--ink-500)',
                            }}
                          />
                        </div>
                        {Array.from({ length: tickCount }).map((_, index) => {
                          const tickPct = tickCount <= 1 ? 0 : index / (tickCount - 1);
                          const reached = tickPct <= displayChapter / displayTotalChapters;
                          return (
                            <span
                              key={index}
                              aria-hidden="true"
                              style={{
                                position: 'absolute',
                                left: `calc(${tickPct} * (100% - 42px))`,
                                top: 0,
                                width: 1,
                                height: 2,
                                background: reached
                                  ? (isActive ? 'color-mix(in srgb, var(--accent) 70%, var(--ink-700))' : 'var(--ink-500)')
                                  : 'var(--ink-300)',
                              }}
                            />
                          );
                        })}
                        <span style={{ position: 'absolute', right: 0, top: -2, fontFamily: 'var(--font-mono)', fontSize: 9.5, color: isActive ? 'var(--ink-800)' : 'var(--ink-500)', flexShrink: 0 }}>
                          {displayChapter}/{displayTotalChapters}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 5, fontSize: 9.5, color: 'var(--ink-400)', letterSpacing: '0.02em' }}>
                        <span aria-hidden="true" style={{ fontSize: 8 }}>◇</span>
                        {relativeTime(book.updatedAt, t)}
                      </div>
                    </div>

                    <div style={{ position: 'relative' }}>
                      <button
                        type="button"
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
                        aria-label={t('sidebar.bookOptions')}
                      >
                        <MoreHorizontal size={14} />
                      </button>

                      {menuBookId === book.id && (
                        <div onClick={(e) => e.stopPropagation()} style={contextMenuStyle}>
                          <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--ink-200)' }}>
                            <label style={{ display: 'block', fontSize: 10, color: 'var(--ink-500)', marginBottom: 4 }}>
                              {t('sidebar.category')}
                            </label>
                            <select
                              value={book.categoryId ?? ''}
                              onChange={(e) => void handleBookCategoryChange(book, e.target.value)}
                              style={{ width: '100%', fontSize: 12, background: 'var(--bg-canvas)', border: '1px solid var(--ink-200)', borderRadius: 4, color: 'var(--ink-900)', padding: '4px 6px', outline: 'none' }}
                            >
                              <option value="">{t('sidebar.uncategorized')}</option>
                              {categories.map((category) => (
                                <option key={category.id} value={category.id}>{category.name}</option>
                              ))}
                            </select>
                          </div>
                          <button type="button" onClick={() => startRenameBook(book)} style={contextMenuButtonStyle}>
                            {t('sidebar.rename')}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setMenuBookId(null);
                              setDeleteBookTarget(book);
                            }}
                            style={{ ...contextMenuButtonStyle, color: 'var(--accent)' }}
                          >
                            {t('sidebar.delete')}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <style>{`
        .book-row:hover .book-menu-btn {
          opacity: 1 !important;
        }
      `}</style>

      {deleteBookTarget && (
        <ConfirmDialog
          message={t('sidebar.deleteBookConfirm', { title: deleteBookTarget.title })}
          confirmLabel={t('sidebar.delete')}
          cancelLabel={t('sidebar.cancel')}
          onConfirm={() => void confirmDeleteBook()}
          onCancel={() => setDeleteBookTarget(null)}
        />
      )}

      {deleteCategoryTarget && (
        <ConfirmDialog
          message={t('sidebar.deleteCategoryConfirm', { name: deleteCategoryTarget.name })}
          confirmLabel={t('sidebar.delete')}
          cancelLabel={t('sidebar.cancel')}
          onConfirm={() => void confirmDeleteCategory()}
          onCancel={() => setDeleteCategoryTarget(null)}
        />
      )}
    </div>
  );
}

const menuActionStyle: React.CSSProperties = {
  padding: '5px 0',
  fontSize: 12,
  background: 'transparent',
  border: 'none',
  borderRadius: 4,
  color: 'var(--ink-700)',
  cursor: 'pointer',
};

const secondaryMenuActionStyle: React.CSSProperties = {
  gridColumn: '1 / -1',
  padding: '5px 0',
  fontSize: 11,
  background: 'transparent',
  border: '1px dashed var(--ink-300)',
  borderRadius: 4,
  color: 'var(--ink-600)',
  cursor: 'pointer',
  opacity: 0.78,
};

const compactInputStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  fontSize: 12,
  padding: '5px 7px',
  background: 'var(--bg-canvas)',
  border: '1px solid var(--ink-200)',
  borderRadius: 4,
  color: 'var(--ink-900)',
  outline: 'none',
};

const formInputStyle: React.CSSProperties = {
  fontSize: 13,
  padding: '4px 8px',
  background: 'var(--bg-panel)',
  border: '1px solid var(--ink-200)',
  borderRadius: 4,
  color: 'var(--ink-900)',
  outline: 'none',
};

function compactCreateButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    width: 32,
    border: 'none',
    borderRadius: 4,
    background: 'var(--accent)',
    color: 'var(--accent-ink)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    fontSize: 13,
  };
}

function primaryFormButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    flex: 1,
    padding: '5px 0',
    fontSize: 13,
    background: 'var(--accent)',
    border: 'none',
    borderRadius: 4,
    color: 'var(--accent-ink)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  };
}

const secondaryFormButtonStyle: React.CSSProperties = {
  flex: 1,
  padding: '5px 0',
  fontSize: 13,
  background: 'transparent',
  border: '1px solid var(--ink-200)',
  borderRadius: 4,
  color: 'var(--ink-600)',
  cursor: 'pointer',
};

const groupHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '4px 16px 6px',
  color: 'var(--ink-600)',
  fontSize: 11.5,
  fontWeight: 500,
  letterSpacing: '0.01em',
};

const categoryMenuButtonStyle: React.CSSProperties = {
  width: 18,
  height: 18,
  display: 'grid',
  placeItems: 'center',
  border: 0,
  background: 'transparent',
  color: 'var(--ink-400)',
  cursor: 'pointer',
  padding: 0,
};

const contextMenuStyle: React.CSSProperties = {
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
};

const contextMenuButtonStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '8px 12px',
  fontSize: 13,
  color: 'var(--ink-800)',
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  textAlign: 'left',
};
