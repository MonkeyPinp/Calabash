import { useState } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import CalabashCanvas from './components/Canvas/CalabashCanvas';
import type { Character, Relationship } from './types';

const DEMO_CHARACTERS: Character[] = [
  {
    id: 'demo-poirot',
    bookId: 'demo',
    name: 'Hercule Poirot',
    aliases: [{ name: 'Hercule Poirot', chapterRevealed: 1 }],
    role: 'detective',
    chapterIntroduced: 1,
    position: { x: 0, y: 0 },
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'demo-ackroyd',
    bookId: 'demo',
    name: 'Roger Ackroyd',
    aliases: [{ name: 'Roger Ackroyd', chapterRevealed: 1 }],
    role: 'victim',
    chapterIntroduced: 1,
    position: { x: 250, y: 100 },
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'demo-sheppard',
    bookId: 'demo',
    name: 'Dr. James Sheppard',
    aliases: [{ name: 'Dr. James Sheppard', chapterRevealed: 1 }],
    role: 'witness',
    chapterIntroduced: 2,
    position: { x: -250, y: 100 },
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'demo-housekeeper',
    bookId: 'demo',
    name: 'the housekeeper',
    aliases: [
      { name: 'the housekeeper', chapterRevealed: 3 },
      { name: 'Ursula Bourne',   chapterRevealed: 18 },
    ],
    role: 'suspect',
    chapterIntroduced: 3,
    position: { x: 0, y: 220 },
    createdAt: 0,
    updatedAt: 0,
  },
];

const DEMO_RELATIONSHIPS: Relationship[] = [
  {
    id: 'demo-r1', bookId: 'demo',
    sourceId: 'demo-poirot', targetId: 'demo-ackroyd',
    type: 'professional', chapterRevealed: 2, certainty: 'confirmed',
    createdAt: 0, updatedAt: 0,
  },
  {
    id: 'demo-r2', bookId: 'demo',
    sourceId: 'demo-sheppard', targetId: 'demo-ackroyd',
    type: 'professional', chapterRevealed: 1, certainty: 'confirmed',
    createdAt: 0, updatedAt: 0,
  },
  {
    id: 'demo-r3', bookId: 'demo',
    sourceId: 'demo-poirot', targetId: 'demo-housekeeper',
    type: 'suspicion', chapterRevealed: 8, certainty: 'suspected',
    createdAt: 0, updatedAt: 0,
  },
];

export default function App() {
  const [currentChapter, _setCurrentChapter] = useState(30);
  const [inspectorOpen, setInspectorOpen] = useState(true);

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

        {/* Books placeholder */}
        <div
          style={{
            flex: 1,
            padding: '8px 16px',
            color: 'var(--fg-muted)',
            fontSize: 13,
          }}
        >
          Books
        </div>

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
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <CalabashCanvas
            characters={DEMO_CHARACTERS}
            relationships={DEMO_RELATIONSHIPS}
            currentChapter={currentChapter}
          />
        </div>

        {/* Chapter slider placeholder */}
        <div
          style={{
            padding: '10px 16px',
            borderTop: '1px solid var(--border)',
            background: 'var(--bg-panel)',
            color: 'var(--fg-muted)',
            fontSize: 12,
          }}
        >
          chapter slider goes here
        </div>
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
