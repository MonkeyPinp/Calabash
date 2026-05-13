import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Github, Moon, Sun, PanelLeft, PanelRight, Undo2, Redo2, LayoutGrid, StickyNote, Shield, ShieldOff, Settings as SettingsIcon, Search, UserPlus } from 'lucide-react';
import CalabashCanvas from './components/Canvas/CalabashCanvas';
import ChapterSlider from './components/Canvas/ChapterSlider';
import BookList from './components/Sidebar/BookList';
import CharacterInspector from './components/Inspector/CharacterInspector';
import RelationshipInspector from './components/Inspector/RelationshipInspector';
import StickyNoteInspector from './components/Inspector/StickyNoteInspector';
import SettingsPanel from './components/Settings/SettingsPanel';
import { useBookHydration } from './hooks/useBookHydration';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useBookStore } from './stores/bookStore';
import { useGraphStore } from './stores/graphStore';
import { useUiStore } from './stores/uiStore';
import { exportBookAsJson, importBookFromJson } from './db/importExport';
import GlobalSearch from './components/CommandBar/GlobalSearch';
import { listBooks, updateBook } from './db/books';
import { createAnnotation, deleteAnnotation, restoreAnnotation } from './db/annotations';
import { hasSpoilerSensitiveRoleAtChapter } from './lib/roles';
import { getSpoilerShieldToolbarAction } from './lib/spoilerShield';
import type { Book } from './types';

const GITHUB_URL = 'https://github.com/Guesswhat-Studio/Calabash';

const toolbarBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid transparent',
  borderRadius: 5,
  minWidth: 30,
  height: 30,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  color: 'var(--ink-600)',
  padding: '0 8px',
  flexShrink: 0,
  fontSize: 12,
  fontWeight: 500,
  gap: 6,
};

const dividerStyle: React.CSSProperties = {
  width: 1,
  height: 18,
  background: 'var(--ink-200)',
  margin: '0 6px',
  flexShrink: 0,
};

const primaryToolbarBtnStyle: React.CSSProperties = {
  ...toolbarBtnStyle,
  background: 'var(--ink-900)',
  borderColor: 'var(--ink-900)',
  color: 'var(--bg-panel)',
  padding: '0 11px 0 9px',
};

export default function App() {
  const { loading } = useBookHydration();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newCharacterRequestId, setNewCharacterRequestId] = useState(0);
  const [startEdgeRequestId, setStartEdgeRequestId] = useState(0);
  const [startEdgeSourceId, setStartEdgeSourceId] = useState<string | null>(null);
  const [revealedSpoilerKey, setRevealedSpoilerKey] = useState<string | null>(null);
  const [spoilerConfirmOpen, setSpoilerConfirmOpen] = useState(false);
  const [activeBookSummary, setActiveBookSummary] = useState<Book | null>(null);

  const activeBookId = useBookStore((s) => s.activeBookId);
  const setActiveBook = useBookStore((s) => s.setActiveBook);
  const currentChapter = useBookStore((s) => s.currentChapter);
  const totalChapters = useBookStore((s) => s.totalChapters);
  const spoilerShield = useBookStore((s) => s.spoilerShield);
  const setCurrentChapter = useBookStore((s) => s.setCurrentChapter);
  const setCurrentChapterAndPersist = useBookStore((s) => s.setCurrentChapterAndPersist);
  const setTotalChapters = useBookStore((s) => s.setTotalChapters);
  const setSpoilerShield = useBookStore((s) => s.setSpoilerShield);

  const characters = useGraphStore((s) => s.characters);
  const relationships = useGraphStore((s) => s.relationships);
  const stickyNotes = useGraphStore((s) => s.stickyNotes);
  const addStickyNote = useGraphStore((s) => s.addStickyNote);
  const removeStickyNote = useGraphStore((s) => s.removeStickyNote);
  const pushUndo = useGraphStore((s) => s.pushUndo);
  const undo = useGraphStore((s) => s.undo);
  const redo = useGraphStore((s) => s.redo);
  const undoStack = useGraphStore((s) => s.undoStack);
  const redoStack = useGraphStore((s) => s.redoStack);

  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);

  useEffect(() => {
    let cancelled = false;
    if (!activeBookId) {
      setActiveBookSummary(null);
      return;
    }
    void listBooks().then((books) => {
      if (!cancelled) setActiveBookSummary(books.find((book) => book.id === activeBookId) ?? null);
    });
    return () => { cancelled = true; };
  }, [activeBookId]);

  // Inspector selection state
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
  const [selectedRelId, setSelectedRelId] = useState<string | null>(null);
  const [selectedStickyNoteId, setSelectedStickyNoteId] = useState<string | null>(null);

  // Reset selection when active book changes
  useEffect(() => {
    setSelectedCharId(null);
    setSelectedRelId(null);
    setSelectedStickyNoteId(null);
    setRevealedSpoilerKey(null);
    setSpoilerConfirmOpen(false);
  }, [activeBookId]);

  useEffect(() => {
    if (spoilerShield) setRevealedSpoilerKey(null);
    setSpoilerConfirmOpen(false);
  }, [spoilerShield]);

  // Auto-open inspector panel when a node or edge is selected
  useEffect(() => {
    if (selectedCharId || selectedRelId || selectedStickyNoteId) setInspectorOpen(true);
  }, [selectedCharId, selectedRelId, selectedStickyNoteId]);

  // fitView ref — populated by CalabashCanvas on mount
  const fitViewRef = useRef<((opts?: { padding?: number }) => void) | undefined>(undefined);
  const handleFitViewReady = useCallback((fn: () => void) => {
    fitViewRef.current = fn;
  }, []);

  // Layout ref — populated by CalabashCanvas (layout logic lives there for direct rfNodes access)
  const layoutRef = useRef<(() => Promise<void>) | undefined>(undefined);
  const handleLayoutReady = useCallback((fn: () => Promise<void>) => {
    layoutRef.current = fn;
  }, []);

  // Export handler
  async function handleExport() {
    if (!activeBookId) return;
    const data = await exportBookAsJson(activeBookId);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.book.title.replace(/[^a-z0-9]/gi, '_')}.calabash.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Import handler
  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const payload = JSON.parse(text);
      const newBookId = await importBookFromJson(payload);
      setActiveBook(newBookId);
    } catch {
      alert('Invalid Calabash JSON file.');
    }
    e.target.value = '';
  }

  // Add sticky note at canvas centre, with undo support
  async function handleAddStickyNote() {
    if (!activeBookId) return;
    const note = await createAnnotation({
      bookId: activeBookId,
      content: '',
      position: { x: (Math.random() - 0.5) * 200, y: (Math.random() - 0.5) * 200 },
    });
    addStickyNote(note);
    pushUndo(
      async () => { await deleteAnnotation(note.id); removeStickyNote(note.id); },
      async () => { await restoreAnnotation(note); addStickyNote(note); },
    );
  }

  const chapterHasSpoilers = useMemo(
    () => hasSpoilerSensitiveRoleAtChapter(characters, currentChapter),
    [characters, currentChapter],
  );
  const currentSpoilerKey = activeBookId && chapterHasSpoilers
    ? `${activeBookId}:${currentChapter}`
    : null;
  const spoilerShieldCoverActive =
    spoilerShield &&
    currentSpoilerKey !== null &&
    revealedSpoilerKey !== currentSpoilerKey;
  const shieldButtonGuarding = spoilerShieldCoverActive;

  async function handleToggleSpoilerShield() {
    if (!activeBookId) return;

    const action = getSpoilerShieldToolbarAction({
      activeBookId,
      spoilerShield,
      spoilerShieldCoverActive,
      currentSpoilerKey,
      revealedSpoilerKey,
    });

    if (action === 'prompt-reveal') {
      setSpoilerConfirmOpen(true);
      return;
    }
    if (action === 'cover-current-reveal') {
      setRevealedSpoilerKey(null);
      setSpoilerConfirmOpen(false);
      return;
    }
    if (action === 'none') return;

    const next = action === 'enable-shield';
    setSpoilerShield(next);
    setRevealedSpoilerKey(null);
    setSpoilerConfirmOpen(false);
    await updateBook(activeBookId, { spoilerShield: next });
  }

  useEffect(() => {
    if (!spoilerShieldCoverActive) setSpoilerConfirmOpen(false);
  }, [spoilerShieldCoverActive]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    fitView: () => fitViewRef.current?.(),
    onNewCharacter: () => setNewCharacterRequestId((id) => id + 1),
    onStartEdge: () => {
      setStartEdgeSourceId(selectedCharId);
      setStartEdgeRequestId((id) => id + 1);
    },
    openSearch: () => setSearchOpen(true),
  });

  return (
    <div
      style={{
        display: 'flex',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: 'var(--bg-canvas)',
        color: 'var(--ink-900)',
        fontFamily: 'var(--font-ui)',
      }}
    >
      {/* Left sidebar */}
      <aside
        style={{
          width: sidebarOpen ? 264 : 0,
          minWidth: 0,
          flexShrink: 0,
          overflow: 'hidden',
          transition: 'width var(--transition-panel)',
          borderRight: sidebarOpen ? '1px solid var(--ink-200)' : 'none',
        }}
      >
        <div style={{ width: 264, height: '100%', background: 'var(--bg-panel)', display: 'flex', flexDirection: 'column' }}>
          {/* App title */}
          <div
            style={{
              padding: '18px 18px 12px',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-case-title)',
                fontSize: 22,
                fontWeight: 400,
                color: 'var(--ink-900)',
                letterSpacing: '-0.005em',
                lineHeight: 1.1,
              }}
            >
              Calabash
            </div>
            <div
              style={{
                marginTop: 4,
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--ink-500)',
              }}
            >
              Reader&apos;s case file
            </div>
          </div>

          <div style={{ padding: '4px 14px 12px' }}>
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '7px 10px',
                background: 'var(--bg-canvas)',
                border: '1px solid var(--ink-200)',
                borderRadius: 5,
                color: 'var(--ink-500)',
                fontSize: 12,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <Search size={13} />
              <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Search books · characters
              </span>
              <span
                style={{
                  marginLeft: 'auto',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10.5,
                  color: 'var(--ink-400)',
                  letterSpacing: '0.04em',
                }}
              >
                /
              </span>
            </button>
          </div>

          {/* Book list */}
          <BookList />

          <div style={{ borderTop: '1px solid var(--ink-200)' }}>
            <div
              style={{
                padding: '7px 10px 6px',
                borderBottom: '1px solid var(--ink-150)',
                display: 'flex',
                gap: 6,
              }}
            >
              <button
                onClick={() => void handleExport()}
                disabled={!activeBookId}
                style={{
                  flex: 1,
                  height: 26,
                  fontSize: 11,
                  background: 'transparent',
                  border: '1px solid var(--ink-200)',
                  borderRadius: 4,
                  color: activeBookId ? 'var(--ink-600)' : 'var(--ink-300)',
                  cursor: activeBookId ? 'pointer' : 'not-allowed',
                }}
              >
                Export
              </button>
              <label
                style={{
                  flex: 1,
                  height: 26,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  background: 'transparent',
                  border: '1px solid var(--ink-200)',
                  borderRadius: 4,
                  color: 'var(--ink-600)',
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                Import
                <input
                  type="file"
                  accept="application/json,.json"
                  style={{ display: 'none' }}
                  onChange={(e) => void handleImport(e)}
                />
              </label>
            </div>

            <div
              style={{
                height: 52,
                padding: '8px 10px',
                color: 'var(--ink-600)',
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <button
                onClick={() => setSettingsOpen(true)}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: '1px solid transparent',
                  borderRadius: 5,
                  padding: '6px 10px',
                  cursor: 'pointer',
                  color: 'var(--ink-600)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  gap: 6,
                  fontSize: 13,
                  fontWeight: 400,
                }}
                title="Settings"
                aria-label="Settings"
              >
                <SettingsIcon size={13} />
                Settings
              </button>
              <button
                onClick={toggleTheme}
                style={{
                  background: 'transparent',
                  border: '1px solid transparent',
                  borderRadius: 5,
                  width: 30,
                  height: 30,
                  cursor: 'pointer',
                  color: 'var(--ink-600)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                }}
                title="Switch theme"
                aria-label="Switch theme"
              >
                {theme === 'light' ? <Moon size={13} /> : <Sun size={13} />}
              </button>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noreferrer"
                title="GitHub"
                aria-label="GitHub"
                style={{
                  width: 30,
                  height: 30,
                  background: 'transparent',
                  border: '1px solid transparent',
                  borderRadius: 5,
                  color: 'var(--ink-600)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textDecoration: 'none',
                }}
              >
                <Github size={14} />
              </a>
            </div>
          </div>
        </div>
      </aside>

      {/* Centre canvas area — flex-grow */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-canvas)',
          overflow: 'hidden',
        }}
      >
        {/* Top toolbar */}
        <div
          style={{
            height: 48,
            flexShrink: 0,
            borderBottom: '1px solid var(--ink-200)',
            background: 'var(--bg-panel)',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '0 12px',
            zIndex: 1,
          }}
        >
          {/* Sidebar toggle */}
          <button
            className="toolbar-btn"
            onClick={() => setSidebarOpen((v) => !v)}
            title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
            style={{
              ...toolbarBtnStyle,
              padding: 0,
              minWidth: 30,
              color: sidebarOpen ? 'var(--ink-900)' : 'var(--ink-600)',
              background: sidebarOpen ? 'var(--bg-hover)' : 'transparent',
              borderColor: sidebarOpen ? 'var(--ink-200)' : 'transparent',
            }}
          >
            <PanelLeft size={15} />
          </button>

          <div style={dividerStyle} />

          <button
            className="toolbar-btn"
            onClick={() => setNewCharacterRequestId((id) => id + 1)}
            disabled={!activeBookId}
            title="Add character (N)"
            style={primaryToolbarBtnStyle}
          >
            <UserPlus size={13} />
            Add character
            <span
              style={{
                marginLeft: 2,
                padding: '1px 5px',
                fontFamily: 'var(--font-mono)',
                fontSize: 9.5,
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.18)',
                color: 'rgba(255,255,255,0.78)',
                borderRadius: 3,
              }}
            >
              N
            </span>
          </button>

          {/* Sticky note */}
          <button
            className="toolbar-btn"
            onClick={() => void handleAddStickyNote()}
            disabled={!activeBookId}
            title="Add sticky note"
            style={toolbarBtnStyle}
          >
            <StickyNote size={13} />
            Note
          </button>

          <div style={dividerStyle} />

          {/* Undo */}
          <button
            className="toolbar-btn"
            onClick={() => void undo()}
            disabled={undoStack.length === 0}
            title="Undo (Ctrl+Z)"
            style={{ ...toolbarBtnStyle, padding: 0 }}
          >
            <Undo2 size={15} />
          </button>

          {/* Redo */}
          <button
            className="toolbar-btn"
            onClick={() => void redo()}
            disabled={redoStack.length === 0}
            title="Redo (Ctrl+Shift+Z)"
            style={{ ...toolbarBtnStyle, padding: 0 }}
          >
            <Redo2 size={15} />
          </button>

          <div
            style={{
              flex: 1,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'baseline',
              gap: 8,
              minWidth: 0,
              padding: '0 16px',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 15,
                color: 'var(--ink-900)',
                letterSpacing: '-0.005em',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                minWidth: 140,
                maxWidth: 280,
              }}
            >
              {activeBookSummary?.title ?? 'No active book'}
            </span>
            {activeBookSummary?.author && (
              <>
                <span style={{ color: 'var(--ink-400)' }}>·</span>
                <span
                  style={{
                    fontSize: 11,
                    color: 'var(--ink-500)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: 120,
                  }}
                >
                  {activeBookSummary.author}
                </span>
              </>
            )}
          </div>

          {/* Auto-layout */}
          <button
            className="toolbar-btn"
            onClick={() => void layoutRef.current?.()}
            disabled={!activeBookId}
            title="Auto-layout — rearrange all visible nodes"
            style={toolbarBtnStyle}
          >
            <LayoutGrid size={13} />
            Layout
          </button>

          {/* Spoiler Shield */}
          <button
            className="toolbar-btn"
            onClick={() => void handleToggleSpoilerShield()}
            disabled={!activeBookId}
            title={
              shieldButtonGuarding
                ? 'Reveal covered spoilers'
                : spoilerShield && currentSpoilerKey !== null && revealedSpoilerKey === currentSpoilerKey
                  ? 'Cover spoilers again'
                : spoilerShield
                  ? 'Spoiler Shield enabled for spoiler chapters'
                  : 'Enable Spoiler Shield'
            }
            style={{
              ...toolbarBtnStyle,
              color: shieldButtonGuarding ? 'var(--accent)' : 'var(--ink-600)',
              borderColor: shieldButtonGuarding ? 'color-mix(in srgb, var(--accent) 36%, transparent)' : 'transparent',
              background: shieldButtonGuarding ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'transparent',
            }}
          >
            {shieldButtonGuarding ? <ShieldOff size={13} /> : <Shield size={13} />}
            Shield
          </button>

          <div style={dividerStyle} />

          {/* Inspector toggle */}
          <button
            className="toolbar-btn"
            onClick={() => setInspectorOpen((v) => !v)}
            title={inspectorOpen ? 'Hide inspector' : 'Show inspector'}
            style={{
              ...toolbarBtnStyle,
              padding: 0,
              minWidth: 30,
              color: inspectorOpen ? 'var(--ink-900)' : 'var(--ink-600)',
              background: inspectorOpen ? 'var(--bg-hover)' : 'transparent',
              borderColor: inspectorOpen ? 'var(--ink-200)' : 'transparent',
            }}
          >
            <PanelRight size={15} />
          </button>
        </div>

        {/* Canvas fills remaining space */}
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          {loading ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'var(--ink-500)',
                fontSize: 14,
                gap: 10,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83">
                  <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
                </path>
              </svg>
              Loading…
            </div>
          ) : activeBookId === null ? (
            <div style={{
              display: 'grid',
              placeItems: 'center',
              height: '100%',
              color: 'var(--ink-600)',
              fontSize: 13,
              textAlign: 'center',
              padding: 30,
            }}>
              <div>
                <div
                  style={{
                    fontFamily: 'var(--font-case-title)',
                    fontSize: 26,
                    color: 'var(--ink-800)',
                    letterSpacing: '-0.01em',
                  }}
                >
                  A board for your next case file.
                </div>
                <div style={{ maxWidth: 380, margin: '8px auto 0', lineHeight: 1.6 }}>
                  Create a book in the sidebar, then add characters as you meet them.
                  The chapter slider keeps the board spoiler-safe as you read.
                </div>
              </div>
            </div>
          ) : (
            <div style={{ width: '100%', height: '100%', position: 'relative' }}>
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  filter: spoilerShieldCoverActive ? 'blur(9px)' : 'none',
                  transform: 'translateZ(0)',
                  transition: 'filter 160ms ease',
                  pointerEvents: spoilerShieldCoverActive ? 'none' : 'auto',
                }}
              >
                <CalabashCanvas
                  characters={characters}
                  relationships={relationships}
                  stickyNotes={stickyNotes}
                  currentChapter={currentChapter}
                  bookId={activeBookId}
                  newCharacterRequestId={newCharacterRequestId}
                  startEdgeRequestId={startEdgeRequestId}
                  startEdgeSourceId={startEdgeSourceId}
                  onNodeSelect={(id) => {
                    setSelectedCharId(id);
                    if (id) {
                      setSelectedRelId(null);
                      setSelectedStickyNoteId(null);
                    }
                  }}
                  onEdgeSelect={(id) => {
                    setSelectedRelId(id);
                    if (id) {
                      setSelectedCharId(null);
                      setSelectedStickyNoteId(null);
                    }
                  }}
                  onStickyNoteSelect={(id) => {
                    setSelectedStickyNoteId(id);
                    if (id) {
                      setSelectedCharId(null);
                      setSelectedRelId(null);
                    }
                  }}
                  onFitViewReady={handleFitViewReady}
                  onLayoutReady={handleLayoutReady}
                />
              </div>
              {spoilerShieldCoverActive && (
                <button
                  onClick={() => setSpoilerConfirmOpen(true)}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: 20,
                  border: 'none',
                    background: 'color-mix(in srgb, var(--bg-canvas) 70%, transparent)',
                    color: 'var(--ink-900)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    gap: 10,
                    font: 'inherit',
                  }}
                >
                  <Shield size={28} color="var(--accent)" />
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 500 }}>Spoiler Shield</span>
                  <span style={{ fontSize: 12, color: 'var(--ink-500)' }}>
                    Chapter {currentChapter} contains spoiler-sensitive reveals
                  </span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Chapter slider */}
        {activeBookId !== null && (
          <ChapterSlider
            bookId={activeBookId}
            totalChapters={totalChapters}
            currentChapter={currentChapter}
            onChange={setCurrentChapter}
            onCommit={(n) => void setCurrentChapterAndPersist(activeBookId, n)}
            onTotalChaptersChange={async (n) => {
              setTotalChapters(n);
              await updateBook(activeBookId, { totalChapters: n });
            }}
          />
        )}
      </main>

      {/* Right inspector panel */}
      <aside
        style={{
          width: inspectorOpen ? 340 : 0,
          minWidth: 0,
          flexShrink: 0,
          overflow: 'hidden',
          transition: 'width var(--transition-panel)',
          borderLeft: inspectorOpen ? '1px solid var(--ink-200)' : 'none',
        }}
      >
        <div style={{ width: 340, height: '100%', background: 'var(--bg-panel)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {selectedCharId && activeBookId ? (
              <CharacterInspector
                characterId={selectedCharId}
                bookId={activeBookId}
                onDeleted={() => setSelectedCharId(null)}
                onDuplicated={(id) => setSelectedCharId(id)}
              />
            ) : selectedRelId && activeBookId ? (
              <RelationshipInspector
                relationshipId={selectedRelId}
                bookId={activeBookId}
                onDeleted={() => setSelectedRelId(null)}
                onDuplicated={(id) => setSelectedRelId(id)}
              />
            ) : selectedStickyNoteId && activeBookId ? (
              <StickyNoteInspector
                stickyNoteId={selectedStickyNoteId}
                onDeleted={() => setSelectedStickyNoteId(null)}
              />
            ) : (
              <div style={{ padding: 18, color: 'var(--ink-500)', fontSize: 13, lineHeight: 1.55 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--ink-900)', marginBottom: 6 }}>
                  Nothing selected
                </div>
                Select a character, relationship, or sticky note to edit its case-file details.
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Global search overlay */}
      {searchOpen && (
        <GlobalSearch
          onSelectCharacter={(id) => {
            setSelectedCharId(id);
            setSelectedRelId(null);
            setInspectorOpen(true);
          }}
          onSelectRelationship={(id) => {
            setSelectedRelId(id);
            setSelectedCharId(null);
            setInspectorOpen(true);
          }}
          onClose={() => setSearchOpen(false)}
        />
      )}

      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}

      {spoilerConfirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Reveal spoilers"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'color-mix(in srgb, var(--ink-900) 34%, transparent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setSpoilerConfirmOpen(false)}
        >
          <div
            style={{
              width: 380,
              maxWidth: 'calc(100vw - 32px)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--ink-200)',
              borderRadius: 8,
              boxShadow: 'var(--shadow-modal)',
              color: 'var(--ink-900)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '18px 22px 6px' }}>
              <Shield size={16} color="var(--accent)" />
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 500 }}>Reveal spoilers?</div>
            </div>
            <p style={{ margin: '4px 22px 16px', fontSize: 13, lineHeight: 1.6, color: 'var(--ink-600)' }}>
              Chapter {currentChapter} contains spoiler-sensitive reveals you recorded. Revealing will uncover them until the next chapter change.
            </p>
            <div
              style={{
                padding: '12px 16px',
                borderTop: '1px solid var(--ink-150)',
                background: 'var(--bg-panel)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 8,
              }}
            >
              <button
                onClick={() => setSpoilerConfirmOpen(false)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 5,
                  border: '1px solid var(--ink-200)',
                  background: 'transparent',
                  color: 'var(--ink-700)',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                Keep covered
              </button>
              <button
                onClick={() => {
                  setRevealedSpoilerKey(currentSpoilerKey);
                  setSpoilerConfirmOpen(false);
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: 5,
                  border: 'none',
                  background: 'var(--accent)',
                  color: 'var(--accent-ink)',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                Reveal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
