import { useState, useEffect, useRef, useCallback } from 'react';
import { Moon, Sun, PanelLeft, PanelRight, Undo2, Redo2, LayoutGrid } from 'lucide-react';
import CalabashCanvas from './components/Canvas/CalabashCanvas';
import ChapterSlider from './components/Canvas/ChapterSlider';
import BookList from './components/Sidebar/BookList';
import CharacterInspector from './components/Inspector/CharacterInspector';
import RelationshipInspector from './components/Inspector/RelationshipInspector';
import { useBookHydration } from './hooks/useBookHydration';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useBookStore } from './stores/bookStore';
import { useGraphStore } from './stores/graphStore';
import { useUiStore } from './stores/uiStore';
import { exportBookAsJson, importBookFromJson } from './db/importExport';
import GlobalSearch from './components/CommandBar/GlobalSearch';
import { computeForceLayout } from './lib/layout';
import { updateCharacter } from './db/characters';
import { updateBook } from './db/books';

const toolbarBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid transparent',
  borderRadius: 4,
  width: 28,
  height: 28,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  color: 'var(--fg-muted)',
  padding: 0,
  flexShrink: 0,
};

export default function App() {
  const { loading } = useBookHydration();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);

  const activeBookId = useBookStore((s) => s.activeBookId);
  const setActiveBook = useBookStore((s) => s.setActiveBook);
  const currentChapter = useBookStore((s) => s.currentChapter);
  const totalChapters = useBookStore((s) => s.totalChapters);
  const setCurrentChapter = useBookStore((s) => s.setCurrentChapter);
  const setCurrentChapterAndPersist = useBookStore((s) => s.setCurrentChapterAndPersist);
  const setTotalChapters = useBookStore((s) => s.setTotalChapters);

  const characters = useGraphStore((s) => s.characters);
  const relationships = useGraphStore((s) => s.relationships);
  const updateCharacterInStore = useGraphStore((s) => s.updateCharacterInStore);
  const undo = useGraphStore((s) => s.undo);
  const redo = useGraphStore((s) => s.redo);
  const undoStack = useGraphStore((s) => s.undoStack);
  const redoStack = useGraphStore((s) => s.redoStack);

  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);

  // Inspector selection state
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
  const [selectedRelId, setSelectedRelId] = useState<string | null>(null);

  // Reset selection when active book changes
  useEffect(() => {
    setSelectedCharId(null);
    setSelectedRelId(null);
  }, [activeBookId]);

  // Auto-open inspector panel when a node or edge is selected
  useEffect(() => {
    if (selectedCharId || selectedRelId) setInspectorOpen(true);
  }, [selectedCharId, selectedRelId]);

  // fitView ref — populated by CalabashCanvas on mount
  const fitViewRef = useRef<(() => void) | undefined>(undefined);
  const handleFitViewReady = useCallback((fn: () => void) => {
    fitViewRef.current = fn;
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

  // Auto-layout: run force-directed layout on all visible characters
  async function handleAutoLayout() {
    if (!activeBookId) return;
    const visible = characters.filter((c) => c.chapterIntroduced <= currentChapter);
    const visibleIds = new Set(visible.map((c) => c.id));
    const visibleEdges = relationships
      .filter((r) => r.chapterRevealed <= currentChapter && visibleIds.has(r.sourceId) && visibleIds.has(r.targetId))
      .map((r) => ({ source: r.sourceId, target: r.targetId }));

    const positions = computeForceLayout(visible.map((c) => c.id), visibleEdges);

    await Promise.all(
      visible.map(async (c) => {
        const pos = positions.get(c.id);
        if (!pos) return;
        await updateCharacter(c.id, { position: pos });
        updateCharacterInStore({ ...c, position: pos });
      }),
    );
    setTimeout(() => fitViewRef.current?.(), 50);
  }

  // Keyboard shortcuts
  useKeyboardShortcuts({
    fitView: () => fitViewRef.current?.(),
    openSearch: () => setSearchOpen(true),
  });

  return (
    <div
      style={{
        display: 'flex',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      {/* Left sidebar — 240px, collapsible */}
      {sidebarOpen && (
        <aside
          style={{
            width: 240,
            flexShrink: 0,
            background: 'var(--bg-panel)',
            borderRight: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* App title */}
          <div
            style={{
              padding: '16px 16px 12px',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--fg-muted)',
              letterSpacing: '0.05em',
            }}
          >
            Calabash
          </div>

          {/* Book list */}
          <BookList />

          {/* Settings / footer */}
          <div
            style={{
              padding: '12px 16px',
              borderTop: '1px solid var(--border)',
              color: 'var(--fg-muted)',
              fontSize: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {/* Theme toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={toggleTheme}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: 4,
                  padding: '3px 6px',
                  cursor: 'pointer',
                  color: 'var(--fg-muted)',
                  display: 'flex',
                  alignItems: 'center',
                }}
                aria-label="Toggle theme"
              >
                {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
              </button>
              <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
                {theme === 'light' ? 'Dark mode' : 'Light mode'}
              </span>
            </div>

            {/* Export / Import */}
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => void handleExport()}
                disabled={!activeBookId}
                style={{
                  flex: 1,
                  padding: '4px 0',
                  fontSize: 11,
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: 4,
                  color: activeBookId ? 'var(--fg-muted)' : 'var(--border)',
                  cursor: activeBookId ? 'pointer' : 'not-allowed',
                }}
              >
                Export
              </button>
              <label
                style={{
                  flex: 1,
                  padding: '4px 0',
                  fontSize: 11,
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: 4,
                  color: 'var(--fg-muted)',
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
          </div>
        </aside>
      )}


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
        {/* Top toolbar: panel toggles + undo/redo */}
        <div
          style={{
            height: 36,
            flexShrink: 0,
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg-panel)',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            padding: '0 8px',
          }}
        >
          {/* Sidebar toggle */}
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
            style={toolbarBtnStyle}
          >
            <PanelLeft size={15} />
          </button>

          <div style={{ flex: 1 }} />

          {/* Undo */}
          <button
            onClick={() => void undo()}
            disabled={undoStack.length === 0}
            title="Undo (Ctrl+Z)"
            style={toolbarBtnStyle}
          >
            <Undo2 size={15} />
          </button>

          {/* Auto-layout */}
          <button
            onClick={() => void handleAutoLayout()}
            disabled={!activeBookId}
            title="Auto-layout (force-directed)"
            style={toolbarBtnStyle}
          >
            <LayoutGrid size={15} />
          </button>

          {/* Redo */}
          <button
            onClick={() => void redo()}
            disabled={redoStack.length === 0}
            title="Redo (Ctrl+Shift+Z)"
            style={toolbarBtnStyle}
          >
            <Redo2 size={15} />
          </button>

          <div style={{ flex: 1 }} />

          {/* Inspector toggle */}
          <button
            onClick={() => setInspectorOpen((v) => !v)}
            title={inspectorOpen ? 'Hide inspector' : 'Show inspector'}
            style={toolbarBtnStyle}
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
                color: 'var(--fg-muted)',
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
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              height: '100%', color: 'var(--fg-muted)', fontSize: 14,
            }}>
              Create a book in the sidebar — or load the Ackroyd demo ↙
            </div>
          ) : (
            <CalabashCanvas
              characters={characters}
              relationships={relationships}
              currentChapter={currentChapter}
              bookId={activeBookId}
              onNodeSelect={setSelectedCharId}
              onEdgeSelect={setSelectedRelId}
              onFitViewReady={handleFitViewReady}
            />
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

      {/* Right inspector panel — 320px, collapsible */}
      {inspectorOpen && (
        <aside
          style={{
            width: 320,
            flexShrink: 0,
            background: 'var(--bg-panel)',
            borderLeft: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {selectedCharId && activeBookId ? (
              <CharacterInspector
                characterId={selectedCharId}
                bookId={activeBookId}
              />
            ) : selectedRelId ? (
              <RelationshipInspector relationshipId={selectedRelId} />
            ) : (
              <div style={{ padding: 16, color: 'var(--fg-muted)', fontSize: 13 }}>
                Select a character or relationship
              </div>
            )}
          </div>
        </aside>
      )}

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
    </div>
  );
}
