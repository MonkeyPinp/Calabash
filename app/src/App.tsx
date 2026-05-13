import { useState } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import CalabashCanvas from './components/Canvas/CalabashCanvas';
import ChapterSlider from './components/Canvas/ChapterSlider';
import BookList from './components/Sidebar/BookList';
import { useBookHydration } from './hooks/useBookHydration';
import { useBookStore } from './stores/bookStore';
import { useGraphStore } from './stores/graphStore';

export default function App() {
  const { loading } = useBookHydration();
  const [inspectorOpen, setInspectorOpen] = useState(true);

  const activeBookId = useBookStore((s) => s.activeBookId);
  const currentChapter = useBookStore((s) => s.currentChapter);
  const totalChapters = useBookStore((s) => s.totalChapters);
  const setCurrentChapter = useBookStore((s) => s.setCurrentChapter);
  const setCurrentChapterAndPersist = useBookStore((s) => s.setCurrentChapterAndPersist);

  const characters = useGraphStore((s) => s.characters);
  const relationships = useGraphStore((s) => s.relationships);

  return (
    <div
      style={{
        display: 'flex',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      {/* Left sidebar — 240px */}
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

        {/* Settings placeholder */}
        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid var(--border)',
            color: 'var(--fg-muted)',
            fontSize: 12,
          }}
        >
          {/* settings icon area — placeholder */}
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
              }}
            />
          ) : activeBookId === null ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'var(--fg-muted)',
                fontSize: 14,
              }}
            >
              Create a book in the sidebar to get started
            </div>
          ) : (
            <CalabashCanvas
              characters={characters}
              relationships={relationships}
              currentChapter={currentChapter}
              bookId={activeBookId}
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
            position: 'relative',
          }}
        >
          {/* Collapse/expand toggle */}
          <button
            onClick={() => setInspectorOpen(false)}
            style={{
              position: 'absolute',
              top: 8,
              left: -16,
              width: 16,
              height: 32,
              background: 'var(--bg-panel)',
              border: '1px solid var(--border)',
              borderRight: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--fg-muted)',
              padding: 0,
            }}
            aria-label="Collapse inspector"
          >
            <ChevronRight size={12} />
          </button>

          {/* Inspector content */}
          <div
            style={{
              padding: '16px',
              color: 'var(--fg-muted)',
              fontSize: 13,
            }}
          >
            Select a character or relationship
          </div>
        </aside>
      )}

      {/* Re-open button when inspector is collapsed */}
      {!inspectorOpen && (
        <button
          onClick={() => setInspectorOpen(true)}
          style={{
            width: 16,
            flexShrink: 0,
            background: 'var(--bg-panel)',
            borderLeft: '1px solid var(--border)',
            borderTop: 'none',
            borderRight: 'none',
            borderBottom: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--fg-muted)',
            padding: 0,
          } as React.CSSProperties}
          aria-label="Expand inspector"
        >
          <ChevronLeft size={12} />
        </button>
      )}
    </div>
  );
}
