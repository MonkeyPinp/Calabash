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
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <CalabashCanvas
        characters={DEMO_CHARACTERS}
        relationships={DEMO_RELATIONSHIPS}
        currentChapter={30}
      />
    </div>
  );
}
