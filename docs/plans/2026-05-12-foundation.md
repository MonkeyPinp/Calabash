# Calabash Foundation Implementation Plan (Plan A)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the Phase 1 foundation — installed dependencies, a working dev server, a fully-tested data layer (Dexie + DAOs + JSON I/O), Zustand stores, and a minimal React Flow canvas rendering hardcoded test data. After Plan A the next plans can attach real CRUD, the chapter slider, and certainty interactions on top of solid scaffolding.

**Architecture:**
- **Local-first**: all data in IndexedDB via Dexie; no backend.
- **Pure-utility layer (`lib/`)** is the foundation: alias resolution, type-directionality table, certainty cycling — all framework-free, exhaustively unit-tested.
- **Data layer (`db/`)** wraps Dexie in narrow DAOs (one file per table) so every Dexie call sits behind a typed function. Tests use `fake-indexeddb` so they run in Node.
- **Stores (`stores/`)** are Zustand slices. Plan A defines their shape and write-through actions for *book settings* and *chapter cursor* only; full CRUD wiring comes in Plan B.
- **Canvas (`components/Canvas/`)** uses `@xyflow/react`. Custom node + edge components consume props; Plan A renders from hardcoded data so we can verify visual fidelity before wiring stores.

**Tech Stack:** React 18, TypeScript 5 (strict), Vite 5, Zustand 5, Dexie 4, @xyflow/react 12, Tailwind CSS 3, Vitest + `fake-indexeddb` + `@testing-library/react`.

**Out of scope for Plan A:** Inspector panels, chapter slider, real CRUD, undo/redo, keyboard shortcuts, dark mode toggle UI, force-directed layout, multi-book sidebar. Those are Plans B–F.

---

## File Structure

All paths relative to repo root. The `app/` directory holds the Phase 1 web app.

**Created in Plan A:**

```
app/
├── index.html                                  # Task 1
├── postcss.config.js                           # Task 16
├── tailwind.config.ts                          # Task 16
├── vitest.config.ts                            # Task 2
├── src/
│   ├── main.tsx                                # Task 20
│   ├── App.tsx                                 # Task 20
│   ├── types.ts                                # Task 3 — all domain types
│   ├── lib/
│   │   ├── relationshipTypes.ts                # Task 4 — RELATIONSHIP_TYPE_META + isDirected()
│   │   ├── aliases.ts                          # Task 5 — resolveDisplayName(aliases, chapter)
│   │   └── certainty.ts                        # Task 6 — cycleCertainty(level)
│   ├── db/
│   │   ├── schema.ts                           # Task 7 — Dexie DB class
│   │   ├── books.ts                            # Task 8 — Book CRUD
│   │   ├── characters.ts                       # Task 9 — Character CRUD
│   │   ├── relationships.ts                    # Task 10 — Relationship CRUD
│   │   ├── portraits.ts                        # Task 11 — Portrait Blob CRUD
│   │   └── importExport.ts                     # Task 12 — JSON round-trip
│   ├── stores/
│   │   ├── bookStore.ts                        # Task 13
│   │   ├── graphStore.ts                       # Task 14
│   │   └── uiStore.ts                          # Task 15
│   ├── components/
│   │   └── Canvas/
│   │       ├── CharacterNode.tsx               # Task 17
│   │       ├── RelationshipEdge.tsx            # Task 18
│   │       └── CalabashCanvas.tsx              # Task 19
│   └── styles/
│       ├── globals.css                         # Task 16
│       └── themes.css                          # Task 16
└── tests/
    ├── setup.ts                                # Task 2
    ├── lib/
    │   ├── relationshipTypes.test.ts           # Task 4
    │   ├── aliases.test.ts                     # Task 5
    │   └── certainty.test.ts                   # Task 6
    ├── db/
    │   ├── books.test.ts                       # Task 8
    │   ├── characters.test.ts                  # Task 9
    │   ├── relationships.test.ts               # Task 10
    │   ├── portraits.test.ts                   # Task 11
    │   └── importExport.test.ts                # Task 12
    └── stores/
        ├── bookStore.test.ts                   # Task 13
        ├── graphStore.test.ts                  # Task 14
        └── uiStore.test.ts                     # Task 15
```

**Modified in Plan A:** `app/package.json` (Tasks 1, 2, 16 — adding deps).

---

## Phase 1: Bootstrap

### Task 1: Install dependencies and create entry HTML

**Files:**
- Modify: `app/package.json` (already exists with deps listed; just install)
- Create: `app/index.html`

- [ ] **Step 1: Install dependencies**

Run from repo root:

```bash
cd app && npm install
```

Expected: `node_modules/` is created under `app/`; no errors. (Some peer-dep warnings from React 18 are OK.)

- [ ] **Step 2: Create `app/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Calabash</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 3: Create a stub `app/src/main.tsx` and `app/src/App.tsx` so dev server can boot**

`app/src/App.tsx`:

```tsx
export default function App() {
  return <div style={{ padding: 24, fontFamily: 'system-ui' }}>Calabash — scaffold ready</div>;
}
```

`app/src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 4: Verify dev server boots**

```bash
cd app && npm run dev
```

Expected: Vite prints `Local: http://localhost:5173/`. Open it; the page shows "Calabash — scaffold ready". Stop the server (Ctrl+C).

- [ ] **Step 5: Verify type-check passes**

```bash
cd app && npm run typecheck
```

Expected: exits 0, no diagnostics.

- [ ] **Step 6: Commit**

```bash
git add app/package.json app/package-lock.json app/index.html app/src/main.tsx app/src/App.tsx
git commit -m "feat(scaffold): install deps and add entry HTML + stub App"
```

---

### Task 2: Add Vitest + testing infrastructure

**Files:**
- Modify: `app/package.json` (add devDeps + test script)
- Create: `app/vitest.config.ts`
- Create: `app/tests/setup.ts`
- Create: `app/tests/lib/smoke.test.ts` (will be deleted at end of task)

- [ ] **Step 1: Add testing dev-deps**

```bash
cd app && npm install -D vitest @vitest/ui jsdom fake-indexeddb @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

Expected: installs without error.

- [ ] **Step 2: Add `test` script to `app/package.json`**

In the `scripts` block, add:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Create `app/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
  },
});
```

- [ ] **Step 4: Create `app/tests/setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
```

`fake-indexeddb/auto` patches the global `indexedDB` so Dexie works in Node.

- [ ] **Step 5: Write a smoke test that passes — and run it**

Create `app/tests/lib/smoke.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

describe('test infrastructure', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });

  it('has indexedDB available', () => {
    expect(typeof indexedDB).toBe('object');
  });
});
```

Run:

```bash
cd app && npm test
```

Expected: 2 tests pass.

- [ ] **Step 6: Delete the smoke test and commit**

```bash
rm app/tests/lib/smoke.test.ts
git add app/package.json app/package-lock.json app/vitest.config.ts app/tests/setup.ts
git commit -m "feat(test): add Vitest + fake-indexeddb + testing-library"
```

---

## Phase 2: Pure utilities & types

### Task 3: Define core domain types

**Files:**
- Create: `app/src/types.ts`

There is no runtime behaviour to test in this file; downstream tasks will fail to compile if it's wrong, so the implicit verification is `npm run typecheck` at the end.

- [ ] **Step 1: Create `app/src/types.ts`**

```ts
export type CertaintyLevel = 'confirmed' | 'suspected' | 'disproven';

export type CharacterRole =
  | 'detective'
  | 'suspect'
  | 'victim'
  | 'witness'
  | 'bystander'
  | 'other';

export type RelationshipType =
  | 'family'
  | 'professional'
  | 'romantic'
  | 'hostile'
  | 'suspicion'
  | 'other';

export interface Alias {
  name: string;
  chapterRevealed: number; // 1-indexed
}

export interface Book {
  id: string;
  title: string;
  author?: string;
  totalChapters: number;
  currentChapter: number;
  createdAt: number;
  updatedAt: number;
}

export interface Character {
  id: string;
  bookId: string;
  name: string;
  aliases: Alias[];
  role: CharacterRole;
  profession?: string;
  socialPosition?: string;
  notes?: string;
  portraitId?: string;
  chapterIntroduced: number;
  position: { x: number; y: number };
  createdAt: number;
  updatedAt: number;
}

export interface Relationship {
  id: string;
  bookId: string;
  sourceId: string;
  targetId: string;
  type: RelationshipType;
  label?: string;
  notes?: string;
  chapterRevealed: number;
  certainty: CertaintyLevel;
  createdAt: number;
  updatedAt: number;
}

export interface Portrait {
  id: string;
  bookId: string;
  blob: Blob;
  mimeType: string;
  createdAt: number;
}
```

- [ ] **Step 2: Verify typecheck**

```bash
cd app && npm run typecheck
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add app/src/types.ts
git commit -m "feat(types): define core domain types"
```

---

### Task 4: relationshipTypes.ts — directionality table

**Files:**
- Test: `app/tests/lib/relationshipTypes.test.ts`
- Create: `app/src/lib/relationshipTypes.ts`

- [ ] **Step 1: Write the failing test**

`app/tests/lib/relationshipTypes.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { isDirected, RELATIONSHIP_TYPE_META } from '@/lib/relationshipTypes';

describe('relationship type directionality', () => {
  it('treats family/professional/romantic/other as symmetric', () => {
    expect(isDirected('family')).toBe(false);
    expect(isDirected('professional')).toBe(false);
    expect(isDirected('romantic')).toBe(false);
    expect(isDirected('other')).toBe(false);
  });

  it('treats hostile/suspicion as directed', () => {
    expect(isDirected('hostile')).toBe(true);
    expect(isDirected('suspicion')).toBe(true);
  });

  it('exposes the full table', () => {
    expect(Object.keys(RELATIONSHIP_TYPE_META).sort()).toEqual(
      ['family', 'hostile', 'other', 'professional', 'romantic', 'suspicion'],
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd app && npm test -- relationshipTypes
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`app/src/lib/relationshipTypes.ts`:

```ts
import type { RelationshipType } from '@/types';

export const RELATIONSHIP_TYPE_META: Record<RelationshipType, { directed: boolean }> = {
  family:       { directed: false },
  professional: { directed: false },
  romantic:     { directed: false },
  hostile:      { directed: true  },
  suspicion:    { directed: true  },
  other:        { directed: false },
};

export function isDirected(type: RelationshipType): boolean {
  return RELATIONSHIP_TYPE_META[type].directed;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd app && npm test -- relationshipTypes
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/relationshipTypes.ts app/tests/lib/relationshipTypes.test.ts
git commit -m "feat(lib): add relationship-type directionality table"
```

---

### Task 5: aliases.ts — display-name resolution

**Files:**
- Test: `app/tests/lib/aliases.test.ts`
- Create: `app/src/lib/aliases.ts`

The function resolves "what name should this character display at chapter N" given an `Alias[]`. The rule: pick the alias with the **largest** `chapterRevealed` such that `chapterRevealed <= currentChapter`. If none qualify (chapter too early — should not happen in practice because the primary `name` should be the alias at the earliest revealed chapter), fall back to a placeholder.

- [ ] **Step 1: Write the failing test**

`app/tests/lib/aliases.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { resolveDisplayName } from '@/lib/aliases';

describe('resolveDisplayName', () => {
  it('returns the only alias when one exists and is visible', () => {
    expect(
      resolveDisplayName([{ name: 'Mary', chapterRevealed: 1 }], 5),
    ).toBe('Mary');
  });

  it('returns the latest revealed alias at or before currentChapter', () => {
    const aliases = [
      { name: 'the housekeeper', chapterRevealed: 2 },
      { name: 'Mary Smith',      chapterRevealed: 12 },
    ];
    expect(resolveDisplayName(aliases, 5)).toBe('the housekeeper');
    expect(resolveDisplayName(aliases, 12)).toBe('Mary Smith');
    expect(resolveDisplayName(aliases, 20)).toBe('Mary Smith');
  });

  it('returns the placeholder when no alias is visible yet', () => {
    expect(
      resolveDisplayName([{ name: 'Mary', chapterRevealed: 10 }], 5),
    ).toBe('???');
  });

  it('returns the placeholder for an empty alias list', () => {
    expect(resolveDisplayName([], 5)).toBe('???');
  });

  it('handles unsorted alias arrays', () => {
    const aliases = [
      { name: 'Mary Smith',      chapterRevealed: 12 },
      { name: 'the housekeeper', chapterRevealed: 2 },
    ];
    expect(resolveDisplayName(aliases, 5)).toBe('the housekeeper');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd app && npm test -- aliases
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`app/src/lib/aliases.ts`:

```ts
import type { Alias } from '@/types';

export const UNKNOWN_NAME = '???';

export function resolveDisplayName(aliases: Alias[], currentChapter: number): string {
  let best: Alias | undefined;
  for (const alias of aliases) {
    if (alias.chapterRevealed <= currentChapter) {
      if (!best || alias.chapterRevealed > best.chapterRevealed) {
        best = alias;
      }
    }
  }
  return best?.name ?? UNKNOWN_NAME;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd app && npm test -- aliases
```

Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/aliases.ts app/tests/lib/aliases.test.ts
git commit -m "feat(lib): add chapter-aware display name resolution"
```

---

### Task 6: certainty.ts — cycle function

**Files:**
- Test: `app/tests/lib/certainty.test.ts`
- Create: `app/src/lib/certainty.ts`

- [ ] **Step 1: Write the failing test**

`app/tests/lib/certainty.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { cycleCertainty } from '@/lib/certainty';

describe('cycleCertainty', () => {
  it('confirmed -> suspected', () => {
    expect(cycleCertainty('confirmed')).toBe('suspected');
  });
  it('suspected -> disproven', () => {
    expect(cycleCertainty('suspected')).toBe('disproven');
  });
  it('disproven -> confirmed', () => {
    expect(cycleCertainty('disproven')).toBe('confirmed');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd app && npm test -- certainty
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`app/src/lib/certainty.ts`:

```ts
import type { CertaintyLevel } from '@/types';

const NEXT: Record<CertaintyLevel, CertaintyLevel> = {
  confirmed: 'suspected',
  suspected: 'disproven',
  disproven: 'confirmed',
};

export function cycleCertainty(level: CertaintyLevel): CertaintyLevel {
  return NEXT[level];
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd app && npm test -- certainty
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/certainty.ts app/tests/lib/certainty.test.ts
git commit -m "feat(lib): add certainty-level cycle function"
```

---

## Phase 3: Data layer

### Task 7: Dexie schema

**Files:**
- Test: covered indirectly by Tasks 8–11
- Create: `app/src/db/schema.ts`

This task defines the database class only. It has no behaviour beyond opening; the real coverage comes from the DAO tests that follow.

- [ ] **Step 1: Implement**

`app/src/db/schema.ts`:

```ts
import Dexie, { type Table } from 'dexie';
import type { Book, Character, Relationship, Portrait } from '@/types';

export class CalabashDB extends Dexie {
  books!:         Table<Book, string>;
  characters!:    Table<Character, string>;
  relationships!: Table<Relationship, string>;
  portraits!:     Table<Portrait, string>;

  constructor() {
    super('calabash');
    this.version(1).stores({
      books:         'id, updatedAt',
      characters:    'id, bookId, chapterIntroduced',
      relationships: 'id, bookId, sourceId, targetId, chapterRevealed',
      portraits:     'id, bookId',
    });
  }
}

export const db = new CalabashDB();
```

- [ ] **Step 2: Verify typecheck**

```bash
cd app && npm run typecheck
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add app/src/db/schema.ts
git commit -m "feat(db): add Dexie schema with 4 tables"
```

---

### Task 8: Book DAO

**Files:**
- Test: `app/tests/db/books.test.ts`
- Create: `app/src/db/books.ts`

- [ ] **Step 1: Write the failing test**

`app/tests/db/books.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/db/schema';
import { createBook, getBook, listBooks, updateBook, deleteBook } from '@/db/books';

describe('books DAO', () => {
  beforeEach(async () => {
    await db.books.clear();
  });

  it('createBook returns a Book with a UUID, timestamps, and default totalChapters', async () => {
    const book = await createBook({ title: 'And Then There Were None' });
    expect(book.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(book.title).toBe('And Then There Were None');
    expect(book.totalChapters).toBe(30);
    expect(book.currentChapter).toBe(1);
    expect(book.createdAt).toBeGreaterThan(0);
    expect(book.updatedAt).toBe(book.createdAt);
  });

  it('getBook retrieves by id', async () => {
    const created = await createBook({ title: 'X' });
    const fetched = await getBook(created.id);
    expect(fetched?.title).toBe('X');
  });

  it('getBook returns undefined for unknown id', async () => {
    expect(await getBook('nope')).toBeUndefined();
  });

  it('listBooks returns all books ordered by updatedAt descending', async () => {
    const a = await createBook({ title: 'A' });
    await new Promise((r) => setTimeout(r, 2));
    const b = await createBook({ title: 'B' });
    const books = await listBooks();
    expect(books.map((x) => x.id)).toEqual([b.id, a.id]);
  });

  it('updateBook merges fields and bumps updatedAt', async () => {
    const book = await createBook({ title: 'X' });
    await new Promise((r) => setTimeout(r, 2));
    const updated = await updateBook(book.id, { title: 'Y', currentChapter: 5 });
    expect(updated.title).toBe('Y');
    expect(updated.currentChapter).toBe(5);
    expect(updated.updatedAt).toBeGreaterThan(book.updatedAt);
  });

  it('deleteBook removes the row', async () => {
    const book = await createBook({ title: 'X' });
    await deleteBook(book.id);
    expect(await getBook(book.id)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run to confirm it fails**

```bash
cd app && npm test -- books
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`app/src/db/books.ts`:

```ts
import { db } from './schema';
import type { Book } from '@/types';

export async function createBook(input: {
  title: string;
  author?: string;
  totalChapters?: number;
}): Promise<Book> {
  const now = Date.now();
  const book: Book = {
    id: crypto.randomUUID(),
    title: input.title,
    author: input.author,
    totalChapters: input.totalChapters ?? 30,
    currentChapter: 1,
    createdAt: now,
    updatedAt: now,
  };
  await db.books.add(book);
  return book;
}

export async function getBook(id: string): Promise<Book | undefined> {
  return db.books.get(id);
}

export async function listBooks(): Promise<Book[]> {
  const all = await db.books.toArray();
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function updateBook(
  id: string,
  patch: Partial<Omit<Book, 'id' | 'createdAt'>>,
): Promise<Book> {
  const existing = await db.books.get(id);
  if (!existing) throw new Error(`Book ${id} not found`);
  const next: Book = { ...existing, ...patch, updatedAt: Date.now() };
  await db.books.put(next);
  return next;
}

export async function deleteBook(id: string): Promise<void> {
  await db.books.delete(id);
}
```

- [ ] **Step 4: Run to confirm it passes**

```bash
cd app && npm test -- books
```

Expected: 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/src/db/books.ts app/tests/db/books.test.ts
git commit -m "feat(db): add Book DAO with CRUD"
```

---

### Task 9: Character DAO

**Files:**
- Test: `app/tests/db/characters.test.ts`
- Create: `app/src/db/characters.ts`

- [ ] **Step 1: Write the failing test**

`app/tests/db/characters.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/db/schema';
import {
  createCharacter,
  getCharacter,
  listCharactersByBook,
  updateCharacter,
  deleteCharacter,
} from '@/db/characters';

const BOOK_ID = 'book-1';

describe('characters DAO', () => {
  beforeEach(async () => {
    await db.characters.clear();
  });

  it('createCharacter assigns a UUID, timestamps, and defaults', async () => {
    const c = await createCharacter({
      bookId: BOOK_ID,
      name: 'Hercule Poirot',
      role: 'detective',
      chapterIntroduced: 1,
    });
    expect(c.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(c.aliases).toEqual([{ name: 'Hercule Poirot', chapterRevealed: 1 }]);
    expect(c.position).toEqual({ x: 0, y: 0 });
    expect(c.createdAt).toBeGreaterThan(0);
  });

  it('createCharacter accepts custom aliases and position', async () => {
    const c = await createCharacter({
      bookId: BOOK_ID,
      name: 'the housekeeper',
      role: 'suspect',
      chapterIntroduced: 2,
      aliases: [
        { name: 'the housekeeper', chapterRevealed: 2 },
        { name: 'Mary Smith',      chapterRevealed: 12 },
      ],
      position: { x: 100, y: 50 },
    });
    expect(c.aliases).toHaveLength(2);
    expect(c.position).toEqual({ x: 100, y: 50 });
  });

  it('listCharactersByBook returns only characters for that book', async () => {
    await createCharacter({ bookId: 'book-A', name: 'A', role: 'detective', chapterIntroduced: 1 });
    await createCharacter({ bookId: 'book-B', name: 'B', role: 'suspect',   chapterIntroduced: 1 });
    const aOnly = await listCharactersByBook('book-A');
    expect(aOnly).toHaveLength(1);
    expect(aOnly[0].name).toBe('A');
  });

  it('updateCharacter merges and bumps updatedAt', async () => {
    const c = await createCharacter({
      bookId: BOOK_ID, name: 'X', role: 'suspect', chapterIntroduced: 1,
    });
    await new Promise((r) => setTimeout(r, 2));
    const u = await updateCharacter(c.id, { notes: 'suspicious' });
    expect(u.notes).toBe('suspicious');
    expect(u.updatedAt).toBeGreaterThan(c.updatedAt);
  });

  it('deleteCharacter removes the row', async () => {
    const c = await createCharacter({
      bookId: BOOK_ID, name: 'X', role: 'suspect', chapterIntroduced: 1,
    });
    await deleteCharacter(c.id);
    expect(await getCharacter(c.id)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run to confirm it fails**

```bash
cd app && npm test -- characters
```

Expected: FAIL.

- [ ] **Step 3: Implement**

`app/src/db/characters.ts`:

```ts
import { db } from './schema';
import type { Character, Alias, CharacterRole } from '@/types';

export interface CreateCharacterInput {
  bookId: string;
  name: string;
  role: CharacterRole;
  chapterIntroduced: number;
  aliases?: Alias[];
  profession?: string;
  socialPosition?: string;
  notes?: string;
  portraitId?: string;
  position?: { x: number; y: number };
}

export async function createCharacter(input: CreateCharacterInput): Promise<Character> {
  const now = Date.now();
  const character: Character = {
    id: crypto.randomUUID(),
    bookId: input.bookId,
    name: input.name,
    aliases: input.aliases ?? [{ name: input.name, chapterRevealed: input.chapterIntroduced }],
    role: input.role,
    profession: input.profession,
    socialPosition: input.socialPosition,
    notes: input.notes,
    portraitId: input.portraitId,
    chapterIntroduced: input.chapterIntroduced,
    position: input.position ?? { x: 0, y: 0 },
    createdAt: now,
    updatedAt: now,
  };
  await db.characters.add(character);
  return character;
}

export async function getCharacter(id: string): Promise<Character | undefined> {
  return db.characters.get(id);
}

export async function listCharactersByBook(bookId: string): Promise<Character[]> {
  return db.characters.where('bookId').equals(bookId).toArray();
}

export async function updateCharacter(
  id: string,
  patch: Partial<Omit<Character, 'id' | 'bookId' | 'createdAt'>>,
): Promise<Character> {
  const existing = await db.characters.get(id);
  if (!existing) throw new Error(`Character ${id} not found`);
  const next: Character = { ...existing, ...patch, updatedAt: Date.now() };
  await db.characters.put(next);
  return next;
}

export async function deleteCharacter(id: string): Promise<void> {
  await db.characters.delete(id);
}
```

- [ ] **Step 4: Run to confirm it passes**

```bash
cd app && npm test -- characters
```

Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/src/db/characters.ts app/tests/db/characters.test.ts
git commit -m "feat(db): add Character DAO with CRUD"
```

---

### Task 10: Relationship DAO

**Files:**
- Test: `app/tests/db/relationships.test.ts`
- Create: `app/src/db/relationships.ts`

- [ ] **Step 1: Write the failing test**

`app/tests/db/relationships.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/db/schema';
import {
  createRelationship,
  getRelationship,
  listRelationshipsByBook,
  updateRelationship,
  deleteRelationship,
} from '@/db/relationships';

describe('relationships DAO', () => {
  beforeEach(async () => {
    await db.relationships.clear();
  });

  it('createRelationship assigns id and defaults certainty to suspected', async () => {
    const r = await createRelationship({
      bookId: 'b', sourceId: 's', targetId: 't',
      type: 'suspicion', chapterRevealed: 3,
    });
    expect(r.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(r.certainty).toBe('suspected');
  });

  it('createRelationship honours explicit certainty', async () => {
    const r = await createRelationship({
      bookId: 'b', sourceId: 's', targetId: 't',
      type: 'family', chapterRevealed: 1, certainty: 'confirmed',
    });
    expect(r.certainty).toBe('confirmed');
  });

  it('listRelationshipsByBook scopes to one book', async () => {
    await createRelationship({ bookId: 'A', sourceId: 's', targetId: 't', type: 'family', chapterRevealed: 1 });
    await createRelationship({ bookId: 'B', sourceId: 's', targetId: 't', type: 'family', chapterRevealed: 1 });
    const a = await listRelationshipsByBook('A');
    expect(a).toHaveLength(1);
    expect(a[0].bookId).toBe('A');
  });

  it('updateRelationship merges fields', async () => {
    const r = await createRelationship({
      bookId: 'b', sourceId: 's', targetId: 't', type: 'suspicion', chapterRevealed: 1,
    });
    const u = await updateRelationship(r.id, { certainty: 'confirmed' });
    expect(u.certainty).toBe('confirmed');
  });

  it('deleteRelationship removes the row', async () => {
    const r = await createRelationship({
      bookId: 'b', sourceId: 's', targetId: 't', type: 'family', chapterRevealed: 1,
    });
    await deleteRelationship(r.id);
    expect(await getRelationship(r.id)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run to confirm it fails**

```bash
cd app && npm test -- relationships
```

Expected: FAIL.

- [ ] **Step 3: Implement**

`app/src/db/relationships.ts`:

```ts
import { db } from './schema';
import type { Relationship, RelationshipType, CertaintyLevel } from '@/types';

export interface CreateRelationshipInput {
  bookId: string;
  sourceId: string;
  targetId: string;
  type: RelationshipType;
  chapterRevealed: number;
  label?: string;
  notes?: string;
  certainty?: CertaintyLevel;
}

export async function createRelationship(input: CreateRelationshipInput): Promise<Relationship> {
  const now = Date.now();
  const rel: Relationship = {
    id: crypto.randomUUID(),
    bookId: input.bookId,
    sourceId: input.sourceId,
    targetId: input.targetId,
    type: input.type,
    label: input.label,
    notes: input.notes,
    chapterRevealed: input.chapterRevealed,
    certainty: input.certainty ?? 'suspected',
    createdAt: now,
    updatedAt: now,
  };
  await db.relationships.add(rel);
  return rel;
}

export async function getRelationship(id: string): Promise<Relationship | undefined> {
  return db.relationships.get(id);
}

export async function listRelationshipsByBook(bookId: string): Promise<Relationship[]> {
  return db.relationships.where('bookId').equals(bookId).toArray();
}

export async function updateRelationship(
  id: string,
  patch: Partial<Omit<Relationship, 'id' | 'bookId' | 'createdAt'>>,
): Promise<Relationship> {
  const existing = await db.relationships.get(id);
  if (!existing) throw new Error(`Relationship ${id} not found`);
  const next: Relationship = { ...existing, ...patch, updatedAt: Date.now() };
  await db.relationships.put(next);
  return next;
}

export async function deleteRelationship(id: string): Promise<void> {
  await db.relationships.delete(id);
}
```

- [ ] **Step 4: Run to confirm it passes**

```bash
cd app && npm test -- relationships
```

Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/src/db/relationships.ts app/tests/db/relationships.test.ts
git commit -m "feat(db): add Relationship DAO with CRUD"
```

---

### Task 11: Portrait DAO

**Files:**
- Test: `app/tests/db/portraits.test.ts`
- Create: `app/src/db/portraits.ts`

- [ ] **Step 1: Write the failing test**

`app/tests/db/portraits.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/db/schema';
import { savePortrait, getPortrait, deletePortrait } from '@/db/portraits';

describe('portraits DAO', () => {
  beforeEach(async () => {
    await db.portraits.clear();
  });

  it('savePortrait stores a Blob and returns a Portrait with a UUID id', async () => {
    const blob = new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'image/png' });
    const p = await savePortrait({ bookId: 'b', blob, mimeType: 'image/png' });
    expect(p.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(p.mimeType).toBe('image/png');
  });

  it('getPortrait retrieves the stored Blob with correct byte length', async () => {
    const bytes = new Uint8Array([10, 20, 30, 40, 50]);
    const blob = new Blob([bytes], { type: 'image/jpeg' });
    const saved = await savePortrait({ bookId: 'b', blob, mimeType: 'image/jpeg' });

    const fetched = await getPortrait(saved.id);
    expect(fetched).toBeDefined();
    expect(fetched!.mimeType).toBe('image/jpeg');
    const arr = new Uint8Array(await fetched!.blob.arrayBuffer());
    expect(Array.from(arr)).toEqual([10, 20, 30, 40, 50]);
  });

  it('deletePortrait removes the row', async () => {
    const p = await savePortrait({
      bookId: 'b', blob: new Blob([]), mimeType: 'image/png',
    });
    await deletePortrait(p.id);
    expect(await getPortrait(p.id)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run to confirm it fails**

```bash
cd app && npm test -- portraits
```

Expected: FAIL.

- [ ] **Step 3: Implement**

`app/src/db/portraits.ts`:

```ts
import { db } from './schema';
import type { Portrait } from '@/types';

export interface SavePortraitInput {
  bookId: string;
  blob: Blob;
  mimeType: string;
}

export async function savePortrait(input: SavePortraitInput): Promise<Portrait> {
  const portrait: Portrait = {
    id: crypto.randomUUID(),
    bookId: input.bookId,
    blob: input.blob,
    mimeType: input.mimeType,
    createdAt: Date.now(),
  };
  await db.portraits.add(portrait);
  return portrait;
}

export async function getPortrait(id: string): Promise<Portrait | undefined> {
  return db.portraits.get(id);
}

export async function deletePortrait(id: string): Promise<void> {
  await db.portraits.delete(id);
}
```

- [ ] **Step 4: Run to confirm it passes**

```bash
cd app && npm test -- portraits
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/src/db/portraits.ts app/tests/db/portraits.test.ts
git commit -m "feat(db): add Portrait DAO with Blob storage"
```

---

### Task 12: JSON import / export

**Files:**
- Test: `app/tests/db/importExport.test.ts`
- Create: `app/src/db/importExport.ts`

Round-trip: export reads `book + characters + relationships + portraits (with blobs converted to data URLs)`. Import accepts the same shape and writes everything back; it generates **new IDs** so importing the same JSON twice doesn't clash.

- [ ] **Step 1: Write the failing test**

`app/tests/db/importExport.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/db/schema';
import { createBook } from '@/db/books';
import { createCharacter, listCharactersByBook } from '@/db/characters';
import { createRelationship, listRelationshipsByBook } from '@/db/relationships';
import { savePortrait, getPortrait } from '@/db/portraits';
import { exportBookAsJson, importBookFromJson } from '@/db/importExport';

describe('importExport', () => {
  beforeEach(async () => {
    await Promise.all([
      db.books.clear(),
      db.characters.clear(),
      db.relationships.clear(),
      db.portraits.clear(),
    ]);
  });

  it('exports an empty book with no characters or portraits', async () => {
    const book = await createBook({ title: 'Empty' });
    const json = await exportBookAsJson(book.id);
    expect(json.calabashVersion).toBe('0.1.0');
    expect(json.book.title).toBe('Empty');
    expect(json.characters).toEqual([]);
    expect(json.relationships).toEqual([]);
    expect(json.portraits).toEqual([]);
  });

  it('round-trips a book with characters, relationships, and a portrait', async () => {
    const book = await createBook({ title: 'Murder of Roger Ackroyd' });
    const portrait = await savePortrait({
      bookId: book.id,
      blob: new Blob([new Uint8Array([200, 201, 202])], { type: 'image/png' }),
      mimeType: 'image/png',
    });
    const c1 = await createCharacter({
      bookId: book.id, name: 'Hercule Poirot', role: 'detective',
      chapterIntroduced: 1, portraitId: portrait.id,
    });
    const c2 = await createCharacter({
      bookId: book.id, name: 'James Sheppard', role: 'witness',
      chapterIntroduced: 1,
    });
    await createRelationship({
      bookId: book.id, sourceId: c1.id, targetId: c2.id,
      type: 'professional', chapterRevealed: 1, certainty: 'confirmed',
    });

    const exported = await exportBookAsJson(book.id);
    expect(exported.portraits).toHaveLength(1);
    expect(exported.portraits[0].dataUrl).toMatch(/^data:image\/png;base64,/);

    // Clear everything and re-import.
    await Promise.all([
      db.books.clear(), db.characters.clear(), db.relationships.clear(), db.portraits.clear(),
    ]);

    const newBookId = await importBookFromJson(exported);
    const reBook = await db.books.get(newBookId);
    expect(reBook?.title).toBe('Murder of Roger Ackroyd');
    expect(reBook?.id).not.toBe(book.id); // new id

    const reChars = await listCharactersByBook(newBookId);
    expect(reChars).toHaveLength(2);

    const reRels = await listRelationshipsByBook(newBookId);
    expect(reRels).toHaveLength(1);

    const rePortraitId = reChars.find((c) => c.name === 'Hercule Poirot')?.portraitId;
    expect(rePortraitId).toBeDefined();
    const rePortrait = await getPortrait(rePortraitId!);
    expect(rePortrait).toBeDefined();
    const reBytes = new Uint8Array(await rePortrait!.blob.arrayBuffer());
    expect(Array.from(reBytes)).toEqual([200, 201, 202]);
  });

  it('throws when exporting an unknown book id', async () => {
    await expect(exportBookAsJson('nope')).rejects.toThrow(/not found/);
  });
});
```

- [ ] **Step 2: Run to confirm it fails**

```bash
cd app && npm test -- importExport
```

Expected: FAIL.

- [ ] **Step 3: Implement**

`app/src/db/importExport.ts`:

```ts
import { db } from './schema';
import type { Book, Character, Relationship } from '@/types';

const CALABASH_VERSION = '0.1.0';

export interface PortraitExport {
  id: string;
  bookId: string;
  mimeType: string;
  dataUrl: string;
}

export interface CalabashExport {
  calabashVersion: string;
  book: Book;
  characters: Character[];
  relationships: Relationship[];
  portraits: PortraitExport[];
}

async function blobToDataUrl(blob: Blob, mimeType: string): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const base64 = btoa(binary);
  return `data:${mimeType};base64,${base64}`;
}

function dataUrlToBlob(dataUrl: string): Blob {
  const match = /^data:([^;]+);base64,(.*)$/.exec(dataUrl);
  if (!match) throw new Error('Invalid data URL');
  const [, mimeType, base64] = match;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}

export async function exportBookAsJson(bookId: string): Promise<CalabashExport> {
  const book = await db.books.get(bookId);
  if (!book) throw new Error(`Book ${bookId} not found`);
  const characters    = await db.characters.where('bookId').equals(bookId).toArray();
  const relationships = await db.relationships.where('bookId').equals(bookId).toArray();
  const portraitRows  = await db.portraits.where('bookId').equals(bookId).toArray();
  const portraits: PortraitExport[] = await Promise.all(
    portraitRows.map(async (p) => ({
      id: p.id,
      bookId: p.bookId,
      mimeType: p.mimeType,
      dataUrl: await blobToDataUrl(p.blob, p.mimeType),
    })),
  );
  return { calabashVersion: CALABASH_VERSION, book, characters, relationships, portraits };
}

export async function importBookFromJson(payload: CalabashExport): Promise<string> {
  const now = Date.now();
  const newBookId = crypto.randomUUID();
  const charIdMap = new Map<string, string>();        // old -> new
  const portraitIdMap = new Map<string, string>();    // old -> new

  // Portraits first so character.portraitId can be remapped.
  const newPortraits = payload.portraits.map((p) => {
    const newId = crypto.randomUUID();
    portraitIdMap.set(p.id, newId);
    return {
      id: newId,
      bookId: newBookId,
      blob: dataUrlToBlob(p.dataUrl),
      mimeType: p.mimeType,
      createdAt: now,
    };
  });

  const newCharacters = payload.characters.map((c) => {
    const newId = crypto.randomUUID();
    charIdMap.set(c.id, newId);
    return {
      ...c,
      id: newId,
      bookId: newBookId,
      portraitId: c.portraitId ? portraitIdMap.get(c.portraitId) : undefined,
      createdAt: now,
      updatedAt: now,
    };
  });

  const newRelationships = payload.relationships.map((r) => ({
    ...r,
    id: crypto.randomUUID(),
    bookId: newBookId,
    sourceId: charIdMap.get(r.sourceId) ?? r.sourceId,
    targetId: charIdMap.get(r.targetId) ?? r.targetId,
    createdAt: now,
    updatedAt: now,
  }));

  await db.transaction('rw', db.books, db.characters, db.relationships, db.portraits, async () => {
    await db.books.put({ ...payload.book, id: newBookId, createdAt: now, updatedAt: now });
    if (newPortraits.length)     await db.portraits.bulkAdd(newPortraits);
    if (newCharacters.length)    await db.characters.bulkAdd(newCharacters);
    if (newRelationships.length) await db.relationships.bulkAdd(newRelationships);
  });

  return newBookId;
}
```

- [ ] **Step 4: Run to confirm it passes**

```bash
cd app && npm test -- importExport
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/src/db/importExport.ts app/tests/db/importExport.test.ts
git commit -m "feat(db): add JSON import/export with portrait base64 round-trip"
```

---

## Phase 4: Store layer

Plan A stores hold the shape and the simplest write-through actions. Plan B will add CRUD-bound actions that sync to Dexie.

### Task 13: bookStore

**Files:**
- Test: `app/tests/stores/bookStore.test.ts`
- Create: `app/src/stores/bookStore.ts`

- [ ] **Step 1: Write the failing test**

`app/tests/stores/bookStore.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useBookStore } from '@/stores/bookStore';

describe('bookStore', () => {
  beforeEach(() => {
    useBookStore.setState({ activeBookId: null, currentChapter: 1 });
  });

  it('initial state', () => {
    const s = useBookStore.getState();
    expect(s.activeBookId).toBeNull();
    expect(s.currentChapter).toBe(1);
  });

  it('setActiveBook updates activeBookId', () => {
    useBookStore.getState().setActiveBook('book-1');
    expect(useBookStore.getState().activeBookId).toBe('book-1');
  });

  it('setCurrentChapter updates currentChapter', () => {
    useBookStore.getState().setCurrentChapter(7);
    expect(useBookStore.getState().currentChapter).toBe(7);
  });
});
```

- [ ] **Step 2: Run to confirm it fails**

```bash
cd app && npm test -- bookStore
```

Expected: FAIL.

- [ ] **Step 3: Implement**

`app/src/stores/bookStore.ts`:

```ts
import { create } from 'zustand';

interface BookStoreState {
  activeBookId: string | null;
  currentChapter: number;
  setActiveBook: (id: string | null) => void;
  setCurrentChapter: (n: number) => void;
}

export const useBookStore = create<BookStoreState>((set) => ({
  activeBookId: null,
  currentChapter: 1,
  setActiveBook: (id) => set({ activeBookId: id }),
  setCurrentChapter: (n) => set({ currentChapter: n }),
}));
```

- [ ] **Step 4: Run to confirm it passes**

```bash
cd app && npm test -- bookStore
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/src/stores/bookStore.ts app/tests/stores/bookStore.test.ts
git commit -m "feat(store): add bookStore (active book + chapter cursor)"
```

---

### Task 14: graphStore

**Files:**
- Test: `app/tests/stores/graphStore.test.ts`
- Create: `app/src/stores/graphStore.ts`

Plan A's graphStore holds in-memory `characters` and `relationships` and exposes setters used by the canvas. CRUD-with-Dexie actions come in Plan B.

- [ ] **Step 1: Write the failing test**

`app/tests/stores/graphStore.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import type { Character, Relationship } from '@/types';
import { useGraphStore } from '@/stores/graphStore';

const c: Character = {
  id: 'c1', bookId: 'b', name: 'A', aliases: [{ name: 'A', chapterRevealed: 1 }],
  role: 'suspect', chapterIntroduced: 1, position: { x: 0, y: 0 },
  createdAt: 0, updatedAt: 0,
};
const r: Relationship = {
  id: 'r1', bookId: 'b', sourceId: 'c1', targetId: 'c2',
  type: 'family', chapterRevealed: 1, certainty: 'confirmed',
  createdAt: 0, updatedAt: 0,
};

describe('graphStore', () => {
  beforeEach(() => {
    useGraphStore.setState({ characters: [], relationships: [] });
  });

  it('initial state is empty', () => {
    const s = useGraphStore.getState();
    expect(s.characters).toEqual([]);
    expect(s.relationships).toEqual([]);
  });

  it('setCharacters replaces the list', () => {
    useGraphStore.getState().setCharacters([c]);
    expect(useGraphStore.getState().characters).toHaveLength(1);
  });

  it('setRelationships replaces the list', () => {
    useGraphStore.getState().setRelationships([r]);
    expect(useGraphStore.getState().relationships).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run to confirm it fails**

```bash
cd app && npm test -- graphStore
```

Expected: FAIL.

- [ ] **Step 3: Implement**

`app/src/stores/graphStore.ts`:

```ts
import { create } from 'zustand';
import type { Character, Relationship } from '@/types';

interface GraphStoreState {
  characters: Character[];
  relationships: Relationship[];
  setCharacters: (cs: Character[]) => void;
  setRelationships: (rs: Relationship[]) => void;
}

export const useGraphStore = create<GraphStoreState>((set) => ({
  characters: [],
  relationships: [],
  setCharacters: (characters) => set({ characters }),
  setRelationships: (relationships) => set({ relationships }),
}));
```

- [ ] **Step 4: Run to confirm it passes**

```bash
cd app && npm test -- graphStore
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/src/stores/graphStore.ts app/tests/stores/graphStore.test.ts
git commit -m "feat(store): add graphStore shape (characters + relationships)"
```

---

### Task 15: uiStore

**Files:**
- Test: `app/tests/stores/uiStore.test.ts`
- Create: `app/src/stores/uiStore.ts`

- [ ] **Step 1: Write the failing test**

`app/tests/stores/uiStore.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useUiStore } from '@/stores/uiStore';

describe('uiStore', () => {
  beforeEach(() => {
    useUiStore.setState({ theme: 'light' });
  });

  it('default theme is light', () => {
    expect(useUiStore.getState().theme).toBe('light');
  });

  it('toggleTheme flips light <-> dark', () => {
    useUiStore.getState().toggleTheme();
    expect(useUiStore.getState().theme).toBe('dark');
    useUiStore.getState().toggleTheme();
    expect(useUiStore.getState().theme).toBe('light');
  });
});
```

- [ ] **Step 2: Run to confirm it fails**

```bash
cd app && npm test -- uiStore
```

Expected: FAIL.

- [ ] **Step 3: Implement**

`app/src/stores/uiStore.ts`:

```ts
import { create } from 'zustand';

type Theme = 'light' | 'dark';

interface UiStoreState {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

export const useUiStore = create<UiStoreState>((set) => ({
  theme: 'light',
  toggleTheme: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
  setTheme: (theme) => set({ theme }),
}));
```

- [ ] **Step 4: Run to confirm it passes**

```bash
cd app && npm test -- uiStore
```

Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/src/stores/uiStore.ts app/tests/stores/uiStore.test.ts
git commit -m "feat(store): add uiStore with theme toggle"
```

---

## Phase 5: Canvas + visible artifact

### Task 16: Tailwind + theme CSS

**Files:**
- Modify: `app/package.json` (Tailwind plugins already installed in Task 1; no change here)
- Create: `app/postcss.config.js`
- Create: `app/tailwind.config.ts`
- Create: `app/src/styles/themes.css`
- Create: `app/src/styles/globals.css`
- Modify: `app/src/main.tsx` (import globals.css)

- [ ] **Step 1: Create `app/postcss.config.js`**

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 2: Create `app/tailwind.config.ts`**

```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-canvas':   'var(--bg-canvas)',
        'bg-panel':    'var(--bg-panel)',
        'fg-primary':  'var(--fg-primary)',
        'fg-muted':    'var(--fg-muted)',
        'border-soft': 'var(--border)',
        accent:        'var(--accent)',
      },
    },
  },
  plugins: [],
};
export default config;
```

- [ ] **Step 3: Create `app/src/styles/themes.css`**

```css
:root[data-theme='light'] {
  --bg-canvas: #fafaf7;
  --bg-panel: #ffffff;
  --fg-primary: #1a1a1a;
  --fg-muted: #6b6b6b;
  --border: #e5e5e0;
  --accent: #8b2e2e;
  --node-detective: #2c5f7c;
  --node-suspect: #8b2e2e;
  --node-victim: #5c5c5c;
  --node-witness: #7c6f2c;
  --node-bystander: #b8b8b3;
  --node-other: #8a8a85;
  --edge-confirmed: #1a1a1a;
  --edge-suspected: #6b6b6b;
  --edge-disproven: #b8b8b3;
}

:root[data-theme='dark'] {
  --bg-canvas: #14140f;
  --bg-panel: #1d1d18;
  --fg-primary: #f3f3ee;
  --fg-muted: #a0a09a;
  --border: #2c2c25;
  --accent: #c45a5a;
  --node-detective: #5fa3c8;
  --node-suspect: #c45a5a;
  --node-victim: #9a9a95;
  --node-witness: #c9b855;
  --node-bystander: #5c5c57;
  --node-other: #757570;
  --edge-confirmed: #f3f3ee;
  --edge-suspected: #a0a09a;
  --edge-disproven: #5c5c57;
}
```

- [ ] **Step 4: Create `app/src/styles/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import './themes.css';

html, body, #root {
  height: 100%;
  margin: 0;
}

body {
  background: var(--bg-canvas);
  color: var(--fg-primary);
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
}
```

- [ ] **Step 5: Modify `app/src/main.tsx` to import globals + set theme attribute**

Replace its contents with:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/globals.css';

document.documentElement.setAttribute('data-theme', 'light');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 6: Verify dev server boots and stylesheet applies**

```bash
cd app && npm run dev
```

Open `http://localhost:5173`. Page background should be soft paper (#fafaf7), not pure white. Stop server.

- [ ] **Step 7: Verify build succeeds**

```bash
cd app && npm run build
```

Expected: exits 0; `app/dist/` is produced.

- [ ] **Step 8: Commit**

```bash
git add app/postcss.config.js app/tailwind.config.ts app/src/styles app/src/main.tsx
git commit -m "feat(styles): wire Tailwind + theme CSS variables"
```

---

### Task 17: CharacterNode component

**Files:**
- Test: `app/tests/components/CharacterNode.test.tsx`
- Create: `app/src/components/Canvas/CharacterNode.tsx`

- [ ] **Step 1: Write the failing test**

`app/tests/components/CharacterNode.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import CharacterNode from '@/components/Canvas/CharacterNode';

function renderInFlow(ui: React.ReactElement) {
  return render(<ReactFlowProvider>{ui}</ReactFlowProvider>);
}

describe('CharacterNode', () => {
  it('renders the character name', () => {
    renderInFlow(
      <CharacterNode
        id="c1"
        type="character"
        data={{
          name: 'Hercule Poirot',
          role: 'detective',
        }}
        dragging={false}
        isConnectable={true}
        positionAbsoluteX={0}
        positionAbsoluteY={0}
        selected={false}
        zIndex={0}
        // @ts-expect-error - React Flow's NodeProps requires more, we pass minimum
        xPos={0}
        yPos={0}
      />,
    );
    expect(screen.getByText('Hercule Poirot')).toBeInTheDocument();
  });

  it('applies a role-driven CSS variable for the border color', () => {
    const { container } = renderInFlow(
      <CharacterNode
        id="c2"
        type="character"
        data={{ name: 'X', role: 'suspect' }}
        dragging={false}
        isConnectable={true}
        positionAbsoluteX={0}
        positionAbsoluteY={0}
        selected={false}
        zIndex={0}
        // @ts-expect-error
        xPos={0}
        yPos={0}
      />,
    );
    const root = container.querySelector('[data-testid="character-node"]');
    expect(root).toBeTruthy();
    expect(root!.getAttribute('style')).toMatch(/--node-suspect/);
  });
});
```

- [ ] **Step 2: Run to confirm it fails**

```bash
cd app && npm test -- CharacterNode
```

Expected: FAIL.

- [ ] **Step 3: Implement**

`app/src/components/Canvas/CharacterNode.tsx`:

```tsx
import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { CharacterRole } from '@/types';

export interface CharacterNodeData {
  name: string;
  role: CharacterRole;
}

function CharacterNodeImpl(props: NodeProps) {
  const data = props.data as unknown as CharacterNodeData;
  const borderVar = `var(--node-${data.role})`;
  return (
    <div
      data-testid="character-node"
      style={{
        padding: '8px 12px',
        background: 'var(--bg-panel)',
        color: 'var(--fg-primary)',
        border: `2px solid ${borderVar}`,
        borderRadius: 8,
        minWidth: 120,
        textAlign: 'center',
        fontSize: 14,
        '--current-role-color': borderVar,
      } as React.CSSProperties}
    >
      <Handle type="target" position={Position.Top} style={{ background: 'var(--accent)' }} />
      {data.name}
      <Handle type="source" position={Position.Bottom} style={{ background: 'var(--accent)' }} />
    </div>
  );
}

export default memo(CharacterNodeImpl);
```

Note: the test asserts on a `--node-suspect` substring in the inline style. The implementation writes `border: 2px solid var(--node-suspect)` into the style, satisfying the match.

- [ ] **Step 4: Run to confirm it passes**

```bash
cd app && npm test -- CharacterNode
```

Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/src/components/Canvas/CharacterNode.tsx app/tests/components/CharacterNode.test.tsx
git commit -m "feat(canvas): add CharacterNode with role-driven border color"
```

---

### Task 18: RelationshipEdge component

**Files:**
- Test: `app/tests/components/RelationshipEdge.test.tsx`
- Create: `app/src/components/Canvas/RelationshipEdge.tsx`

The badge cycle on click is wired in Plan D. Plan A renders the static badge and styled line only.

- [ ] **Step 1: Write the failing test**

`app/tests/components/RelationshipEdge.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReactFlowProvider, ReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import RelationshipEdge from '@/components/Canvas/RelationshipEdge';

const nodes = [
  { id: 'a', type: 'default', position: { x: 0,   y: 0 }, data: { label: 'A' } },
  { id: 'b', type: 'default', position: { x: 200, y: 0 }, data: { label: 'B' } },
];

function flowWith(edge: { certainty: 'confirmed' | 'suspected' | 'disproven'; type: 'family' | 'suspicion' }) {
  return (
    <div style={{ width: 600, height: 400 }}>
      <ReactFlow
        nodes={nodes}
        edges={[
          { id: 'e1', source: 'a', target: 'b', type: 'relationship', data: edge },
        ]}
        edgeTypes={{ relationship: RelationshipEdge }}
      />
    </div>
  );
}

describe('RelationshipEdge', () => {
  it('renders a ✓ badge for confirmed', () => {
    render(<ReactFlowProvider>{flowWith({ certainty: 'confirmed', type: 'family' })}</ReactFlowProvider>);
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('renders a ? badge for suspected', () => {
    render(<ReactFlowProvider>{flowWith({ certainty: 'suspected', type: 'suspicion' })}</ReactFlowProvider>);
    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('renders a ✗ badge for disproven', () => {
    render(<ReactFlowProvider>{flowWith({ certainty: 'disproven', type: 'family' })}</ReactFlowProvider>);
    expect(screen.getByText('✗')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to confirm it fails**

```bash
cd app && npm test -- RelationshipEdge
```

Expected: FAIL.

- [ ] **Step 3: Implement**

`app/src/components/Canvas/RelationshipEdge.tsx`:

```tsx
import { memo } from 'react';
import { BaseEdge, EdgeLabelRenderer, getStraightPath, type EdgeProps } from '@xyflow/react';
import type { CertaintyLevel, RelationshipType } from '@/types';
import { isDirected } from '@/lib/relationshipTypes';

export interface RelationshipEdgeData {
  certainty: CertaintyLevel;
  type: RelationshipType;
}

const BADGE_TEXT: Record<CertaintyLevel, string> = {
  confirmed: '✓',
  suspected: '?',
  disproven: '✗',
};

const EDGE_STYLE: Record<CertaintyLevel, { stroke: string; strokeDasharray: string; opacity: number }> = {
  confirmed: { stroke: 'var(--edge-confirmed)', strokeDasharray: '0',     opacity: 1   },
  suspected: { stroke: 'var(--edge-suspected)', strokeDasharray: '6 4',   opacity: 0.8 },
  disproven: { stroke: 'var(--edge-disproven)', strokeDasharray: '6 4',   opacity: 0.4 },
};

function RelationshipEdgeImpl(props: EdgeProps) {
  const data = props.data as unknown as RelationshipEdgeData;
  const [pathD, labelX, labelY] = getStraightPath({
    sourceX: props.sourceX, sourceY: props.sourceY,
    targetX: props.targetX, targetY: props.targetY,
  });
  const style = EDGE_STYLE[data.certainty];
  const markerEnd = isDirected(data.type) ? 'url(#arrow)' : undefined;

  return (
    <>
      <BaseEdge
        id={props.id}
        path={pathD}
        markerEnd={markerEnd}
        style={{
          stroke: style.stroke,
          strokeDasharray: style.strokeDasharray,
          opacity: style.opacity,
          strokeWidth: 2,
        }}
      />
      <EdgeLabelRenderer>
        <div
          data-testid="certainty-badge"
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            background: 'var(--bg-panel)',
            border: '1px solid var(--border)',
            color: 'var(--fg-primary)',
            borderRadius: '50%',
            width: 24,
            height: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            pointerEvents: 'all',
            cursor: 'pointer',
          }}
        >
          {BADGE_TEXT[data.certainty]}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export default memo(RelationshipEdgeImpl);
```

- [ ] **Step 4: Run to confirm it passes**

```bash
cd app && npm test -- RelationshipEdge
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/src/components/Canvas/RelationshipEdge.tsx app/tests/components/RelationshipEdge.test.tsx
git commit -m "feat(canvas): add RelationshipEdge with certainty badge and styles"
```

---

### Task 19: CalabashCanvas wrapper

**Files:**
- Test: `app/tests/components/CalabashCanvas.test.tsx`
- Create: `app/src/components/Canvas/CalabashCanvas.tsx`

- [ ] **Step 1: Write the failing test**

`app/tests/components/CalabashCanvas.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Character, Relationship } from '@/types';
import CalabashCanvas from '@/components/Canvas/CalabashCanvas';

const characters: Character[] = [
  { id: 'a', bookId: 'b', name: 'Poirot',  aliases: [{ name: 'Poirot', chapterRevealed: 1 }], role: 'detective', chapterIntroduced: 1, position: { x: 0,   y: 0 }, createdAt: 0, updatedAt: 0 },
  { id: 'b', bookId: 'b', name: 'Suspect', aliases: [{ name: 'Suspect', chapterRevealed: 1 }], role: 'suspect',   chapterIntroduced: 1, position: { x: 200, y: 0 }, createdAt: 0, updatedAt: 0 },
];

const relationships: Relationship[] = [
  { id: 'r1', bookId: 'b', sourceId: 'a', targetId: 'b', type: 'suspicion', chapterRevealed: 1, certainty: 'suspected', createdAt: 0, updatedAt: 0 },
];

describe('CalabashCanvas', () => {
  it('renders nodes for every character and the certainty badge for every edge', () => {
    render(
      <div style={{ width: 800, height: 600 }}>
        <CalabashCanvas characters={characters} relationships={relationships} currentChapter={10} />
      </div>,
    );
    expect(screen.getByText('Poirot')).toBeInTheDocument();
    expect(screen.getByText('Suspect')).toBeInTheDocument();
    expect(screen.getByText('?')).toBeInTheDocument(); // suspected badge
  });

  it('filters out characters introduced after currentChapter', () => {
    const future: Character = {
      ...characters[0], id: 'c', name: 'FutureGuy', chapterIntroduced: 50,
    };
    render(
      <div style={{ width: 800, height: 600 }}>
        <CalabashCanvas
          characters={[characters[0], future]}
          relationships={[]}
          currentChapter={10}
        />
      </div>,
    );
    expect(screen.getByText('Poirot')).toBeInTheDocument();
    expect(screen.queryByText('FutureGuy')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to confirm it fails**

```bash
cd app && npm test -- CalabashCanvas
```

Expected: FAIL.

- [ ] **Step 3: Implement**

`app/src/components/Canvas/CalabashCanvas.tsx`:

```tsx
import { useMemo } from 'react';
import { ReactFlow, ReactFlowProvider, Background, Controls, type Node, type Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { Character, Relationship } from '@/types';
import CharacterNode from './CharacterNode';
import RelationshipEdge from './RelationshipEdge';
import { resolveDisplayName } from '@/lib/aliases';

const nodeTypes = { character: CharacterNode };
const edgeTypes = { relationship: RelationshipEdge };

export interface CalabashCanvasProps {
  characters: Character[];
  relationships: Relationship[];
  currentChapter: number;
}

function CalabashCanvasInner({ characters, relationships, currentChapter }: CalabashCanvasProps) {
  const nodes: Node[] = useMemo(
    () =>
      characters
        .filter((c) => c.chapterIntroduced <= currentChapter)
        .map((c) => ({
          id: c.id,
          type: 'character',
          position: c.position,
          data: {
            name: resolveDisplayName(c.aliases, currentChapter),
            role: c.role,
          },
        })),
    [characters, currentChapter],
  );

  const visibleCharIds = useMemo(() => new Set(nodes.map((n) => n.id)), [nodes]);

  const edges: Edge[] = useMemo(
    () =>
      relationships
        .filter(
          (r) =>
            r.chapterRevealed <= currentChapter &&
            visibleCharIds.has(r.sourceId) &&
            visibleCharIds.has(r.targetId),
        )
        .map((r) => ({
          id: r.id,
          source: r.sourceId,
          target: r.targetId,
          type: 'relationship',
          data: { certainty: r.certainty, type: r.type },
        })),
    [relationships, visibleCharIds, currentChapter],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      panOnDrag
      selectionOnDrag={false}
      fitView
    >
      <Background />
      <Controls />
    </ReactFlow>
  );
}

export default function CalabashCanvas(props: CalabashCanvasProps) {
  return (
    <ReactFlowProvider>
      <CalabashCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
```

- [ ] **Step 4: Run to confirm it passes**

```bash
cd app && npm test -- CalabashCanvas
```

Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/src/components/Canvas/CalabashCanvas.tsx app/tests/components/CalabashCanvas.test.tsx
git commit -m "feat(canvas): add CalabashCanvas with chapter-aware filtering"
```

---

### Task 20: Wire App.tsx with hardcoded demo data

**Files:**
- Modify: `app/src/App.tsx`

- [ ] **Step 1: Replace `app/src/App.tsx`**

```tsx
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
```

- [ ] **Step 2: Verify type-check passes**

```bash
cd app && npm run typecheck
```

Expected: exits 0.

- [ ] **Step 3: Verify build succeeds**

```bash
cd app && npm run build
```

Expected: exits 0.

- [ ] **Step 4: Run full test suite**

```bash
cd app && npm test
```

Expected: all tests pass. Capture totals (~40 tests across 11 files).

- [ ] **Step 5: Visual smoke test in the browser**

```bash
cd app && npm run dev
```

Open `http://localhost:5173`. Verify:
- Soft-paper background
- Four nodes visible: Poirot, Roger Ackroyd, Dr. James Sheppard, Ursula Bourne (the housekeeper alias since `currentChapter=30 ≥ 18`)
- Three edges: two solid (confirmed), one dashed with `?` badge (suspected)
- The `suspicion` edge (Poirot → housekeeper) has an arrow; `professional` edges have no arrow
- React Flow controls (zoom, fit-view) appear in the lower-left
- Dragging on empty canvas pans the view
- Dragging a node moves it

Stop the server.

- [ ] **Step 6: Commit**

```bash
git add app/src/App.tsx
git commit -m "feat(app): wire CalabashCanvas with hardcoded demo data"
```

---

### Task 21: Lock the foundation — add README + final verification

**Files:**
- Create: `README.md` (at repo root)

- [ ] **Step 1: Create `README.md`**

```markdown
# Calabash

> A relationship-mapping companion for readers of detective fiction.

**No AI. By design.** See [PLAN.md](./PLAN.md) §0 for the manifesto.

## Status

Phase 1 foundation (Plan A) — data layer, stores, and a hardcoded-data canvas.
See [docs/plans/](./docs/plans/) for the implementation plans.

## Develop

```bash
cd app
npm install
npm run dev       # http://localhost:5173
npm test          # run all tests
npm run build     # production build
npm run typecheck # tsc --noEmit
```

## Layout

- `PLAN.md` — canonical product + technical spec
- `docs/plans/` — implementation plans
- `app/` — Phase 1 web application

## License

MIT
```

- [ ] **Step 2: Run the full verification triple**

```bash
cd app && npm run typecheck && npm test && npm run build
```

Expected: all three exit 0.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add root README summarising layout and dev commands"
```

---

## Plan A Verification (`superpowers:verification-before-completion`)

Before declaring Plan A complete, run from repo root:

```bash
cd app && npm run typecheck && npm test && npm run build
```

All three must exit 0. Then visually verify by running `npm run dev` and inspecting `http://localhost:5173` against Task 20 Step 5's checklist.

## What Plan A explicitly does NOT do

These are deferred to later plans — do not implement them in Plan A even if tempting:
- ❌ Add/edit/delete characters in the UI (Plan B)
- ❌ Inspector panels (Plan B)
- ❌ Chapter slider (Plan C)
- ❌ Connection handles + click-to-cycle certainty badge (Plan D)
- ❌ Keyboard shortcuts (Plan E)
- ❌ Theme toggle UI (Plan E)
- ❌ JSON import/export UI buttons (Plan E)
- ❌ Undo/redo (deferred — likely between Plans B and C)
- ❌ Force-directed layout button (Plan F polish)
- ❌ Multi-book sidebar (Plan F or earlier if it blocks development)

## Self-Review (filled in at plan-write time)

**Spec coverage:**
- §2.1 Library management → not in Plan A (deferred to Plan B/F)
- §2.1 Character management → data layer covered (Task 9); UI deferred
- §2.1 Relationship management → data layer covered (Task 10); UI deferred
- §2.1 Canvas interaction → rendering + chapter filtering covered (Tasks 17–19); editing/handles deferred
- §2.1 Chapter slider → component deferred (Plan C); filtering math is already in CalabashCanvas
- §2.1 Visual encoding of certainty → solid/dashed/opacity covered; badge cycle interaction deferred
- §2.1 Keyboard shortcuts → deferred
- §2.1 Persistence → data layer covered (Tasks 7–12); store wiring to Dexie deferred to Plan B
- §2.1 Theming → CSS variables + theme switching in DOM covered (Task 16); UI toggle deferred
- §3.3 Data model → fully covered in Tasks 3–12
- §3.6 Persistence behaviour → DAOs are write-through (Task 8–11); logical-boundary commit logic comes when stores wire to DAOs (Plan B)

**Placeholder scan:** none — every step has runnable code or a runnable command.

**Type consistency:** `Character`, `Relationship`, `Alias`, `Portrait` are defined once in `types.ts` (Task 3) and re-used by every downstream task. `CertaintyLevel`, `RelationshipType` likewise. DAO function names follow the `verb + entity` pattern (`createBook`, `updateRelationship`, etc.) consistently.

**Ambiguity:** `Character.aliases` always contains at least one entry (the primary name); `createCharacter` enforces this when no aliases are passed. This is asserted in Task 9 Step 1's first test.
