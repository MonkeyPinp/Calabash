# Calabash — Project Specification

> A relationship-mapping companion for readers of detective fiction.
> Named after Sherlock Holmes' iconic curved pipe — the tool that doesn't solve cases, but sits in your hand while you do.

---

## 0. Manifesto (place at top of README)

**No AI. By design.**

A detective novel is not a problem to be optimized. It is a problem to be inhabited. Every character you record by hand is a character you are choosing to notice. Every edge you draw is a hypothesis you are committing to. Every "suspected" you toggle to "confirmed" is a small victory of attention.

AI tools that auto-extract characters and relationships from text turn reading into a summarization task. That is the opposite of what we want. Calabash is a deliberate place to do the work yourself — because the work *is* the joy.

---

## 1. Product Overview

### 1.1 What it is
A lightweight, local-first relationship graph editor designed specifically for readers (not writers) of character-dense fiction — detective novels in particular, but also fantasy, historical fiction, and any book with 10+ characters.

### 1.2 Who it is for
- Detective novel readers who lose track of characters across long books
- Readers of multi-volume series (Agatha Christie, Ellery Queen, Higashino Keigo, etc.)
- Anyone who wants to actively reason about a story rather than passively consume it

### 1.3 Core differentiation (vs. all existing tools)
1. **Chapter-based progressive revelation** — the graph filters to "what the reader knew at chapter N"
2. **Certainty levels on edges** — confirmed / suspected / disproven, with distinct visual encoding
3. **Spoiler-safe by construction** — re-share the graph with a friend capped at their current chapter
4. **No AI** — manual entry is the feature, not the bug

### 1.4 What it is NOT
- Not a book tracker (Goodreads, StoryGraph already do this)
- Not a writing tool (Plottr, Scrivener already do this)
- Not a generic mind-map (Miro, ProcessOn already do this)
- Not a social/sharing platform
- Not an ePub reader

---

## 2. MVP Scope

### 2.1 In scope (must ship)

**Library management**
- Create / rename / delete books
- Switch between books from a sidebar
- Each book has its own independent graph

**Character (node) management**
- Add character with: name, aliases (each with the chapter it was revealed in), role/profession, family/social position, notes, optional portrait image, **chapter introduced**
- Edit and delete characters
- Role tag: Detective / Suspect / Victim / Witness / Bystander / Other (drives node border color)
- Display-name rule: the node label shows the earliest alias whose `chapterRevealed <= currentChapter` (the primary `name` is treated as the alias with the lowest `chapterRevealed`). This preserves spoiler safety when sharing or scrubbing.

**Relationship (edge) management**
- Add edge with: type (family / professional / romantic / hostile / suspicion / other), label text, notes, **chapter revealed**, **certainty** (confirmed / suspected / disproven)
- Edit and delete edges
- Directionality is **derived from `type`**, not stored as a separate field. Symmetric types (`family`, `professional`, `romantic`, `other`) render without arrows; asymmetric types (`hostile`, `suspicion`) render with an arrow from `sourceId` to `targetId`. The data model still uses `sourceId`/`targetId` because React Flow requires them, but for symmetric types the choice of which endpoint is source is semantically irrelevant.

**Canvas interaction**
- Drag nodes to position
- Pan and zoom — default drag on empty canvas = **pan** (reader-friendly; matches map/Miro mental model, not Figma)
- Auto-layout on demand (force-directed, one-shot, manual button — not continuous)
- Fit-to-screen button
- Multi-select via **Shift + drag rectangle** (for bulk delete / move). Marquee select is the non-default action because readers pan far more often than they bulk-select.
- Edge creation uses React Flow **connection handles** — small circular targets on the node perimeter that fade in on hover/selection and disappear otherwise. They are sized for touch (≥16 px hit area on tablet) and styled with `--accent`. Drag from a handle to another node = create edge. This replaces any "long-press a node and drag" gesture on tablet, removing conflict with the long-press context menu.

**The chapter slider (the soul of the product)**
- Horizontal slider docked at the bottom of the canvas
- Set the book's total chapter count in book settings (default 30)
- Slider position N filters: only nodes with `chapter_introduced <= N` and edges with `chapter_revealed <= N` are visible
- Slider scrub is real-time and smooth
- A small "current chapter" indicator label
- Default position: latest chapter

**Visual encoding of certainty**
- Edge `confirmed` → solid line, full opacity
- Edge `suspected` → dashed line, 80% opacity
- Edge `disproven` → dashed line, 40% opacity, strikethrough effect (a red `×` overlay or grey-out)
- A small certainty badge (✓ / ? / ✗) is rendered at the edge midpoint using React Flow's `<EdgeLabelRenderer>`. **Clicking the badge** cycles confirmed → suspected → disproven (with undo). **Clicking the edge body** (anywhere else along the edge) selects it and opens the RelationshipInspector, symmetrical to clicking a node. The two interactions are visually and behaviorally separate.

**Keyboard shortcuts**
- `N` — new character at cursor
- `E` — start edge from selected node, click target to complete
- `/` — focus global search
- `Cmd/Ctrl + Z` / `Cmd/Ctrl + Shift + Z` — undo / redo
- `Delete` / `Backspace` — delete selected element(s)
- `F` — fit canvas to content
- `Space + drag` — pan (redundant with default drag; preserved for Figma-muscle-memory users)
- `Shift + drag` — marquee multi-select on empty canvas
- Right-drag — pan

**Persistence**
- All data in IndexedDB via Dexie.js
- Auto-save commits on **logical boundaries** (drag end, input blur, discrete actions immediate) — see §3.6 for the full contract
- Manual export: download book as JSON file (portraits inlined as data URLs)
- Manual import: load book from JSON file
- "New book from JSON" path for future sharing

**Theming**
- Light and dark themes, toggle in settings
- Use CSS variables throughout so future themes are a stylesheet swap

### 2.2 Out of scope (deliberate, do not add)

- ❌ AI features of any kind (no extraction, no suggestion, no summary)
- ❌ Cloud sync, accounts, login
- ❌ Sharing, comments, multi-user
- ❌ Mobile phone layout (iPad and desktop only — see §3.5)
- ❌ ePub / PDF reader integration
- ❌ Event timeline (chapter slider already handles 80% of the value)
- ❌ Backend / server of any kind in MVP
- ❌ Analytics / telemetry

### 2.3 Nice-to-have (only if MVP core is rock solid)

- Suspicion pins: a "question node" type that lists candidate characters with ranking
- Search/filter panel (by role, chapter range, certainty)
- Mini-map for navigating large graphs
- Print/export-to-image for the current view

---

## 3. Technical Architecture

### 3.1 Stack

| Layer | Choice | Rationale |
|---|---|---|
| Language | TypeScript (strict) | Type safety for a data-heavy app |
| Build tool | Vite | Fast HMR, modern, minimal config |
| Framework | React 18 | Largest ecosystem for graph libraries |
| Graph renderer | React Flow (`@xyflow/react`) | Custom nodes are React components — essential for portraits and rich styling |
| State | Zustand | Lightweight, React Flow's official recommendation |
| Storage (web) | Dexie.js over IndexedDB | Type-safe IndexedDB wrapper |
| Storage (desktop) | SQLite via `tauri-plugin-sql` (Phase 2) | Switch at desktop port time |
| UI primitives | shadcn/ui (copy-paste, not a heavy dep) | Customizable, no vendor lock-in |
| Icons | lucide-react | Clean, consistent, MIT |
| Styling | Tailwind CSS + CSS variables | Theme swap = variable swap |
| Forms | React Hook Form + Zod | Validation for character/edge editing |
| Desktop shell (Phase 2) | Tauri 2 | ~5 MB binary, Rust core, web frontend |

### 3.2 Why React Flow over Cytoscape.js

We considered Cytoscape.js for raw performance. We chose React Flow because:
- Custom nodes are arbitrary React components → character portraits, role badges, certainty indicators are trivial
- Idiomatic React state flow → easier for AI-assisted development (Claude Code) and future contributors
- The realistic node ceiling for fiction is ~100-300 characters; React Flow with `React.memo` and viewport culling handles this comfortably
- If we hit a performance wall above ~1000 nodes, the data model is portable to Cytoscape (only the rendering layer changes)

### 3.3 Data model

```typescript
// All IDs are UUID v4 (use `crypto.randomUUID()`)

type CertaintyLevel = 'confirmed' | 'suspected' | 'disproven';

type CharacterRole =
  | 'detective'
  | 'suspect'
  | 'victim'
  | 'witness'
  | 'bystander'
  | 'other';

type RelationshipType =
  | 'family'
  | 'professional'
  | 'romantic'
  | 'hostile'
  | 'suspicion'
  | 'other';

// Directionality is a code constant, not a per-edge field.
// Symmetric types render without arrows; asymmetric types render with an arrow source -> target.
// Lives in `src/lib/relationshipTypes.ts`.
const RELATIONSHIP_TYPE_META: Record<RelationshipType, { directed: boolean }> = {
  family:       { directed: false },
  professional: { directed: false },
  romantic:     { directed: false },
  hostile:      { directed: true  },
  suspicion:    { directed: true  },
  other:        { directed: false },
};

interface Alias {
  name: string;
  chapterRevealed: number; // 1-indexed; the primary `name` field is the alias with the lowest chapterRevealed
}

interface Book {
  id: string;
  title: string;
  author?: string;
  totalChapters: number; // default 30
  currentChapter: number; // last slider position, for restore-on-open
  createdAt: number; // epoch ms
  updatedAt: number;
}

interface Character {
  id: string;
  bookId: string;
  name: string; // primary display name (= alias with the lowest chapterRevealed)
  aliases: Alias[]; // includes the primary name as the first entry; additional aliases each carry their own chapterRevealed
  role: CharacterRole;
  profession?: string;
  socialPosition?: string; // family / social standing notes
  notes?: string; // freeform markdown
  portraitId?: string; // FK -> Portrait.id; binary blob lives in the portraits table
  chapterIntroduced: number; // 1-indexed
  position: { x: number; y: number }; // saved canvas position
  createdAt: number;
  updatedAt: number;
}

interface Relationship {
  id: string;
  bookId: string;
  sourceId: string; // Character.id
  targetId: string;
  type: RelationshipType; // directionality of the rendered arrow is derived from RELATIONSHIP_TYPE_META[type]
  label?: string; // short edge text, e.g. "father of", "blackmails"
  notes?: string; // freeform markdown
  chapterRevealed: number; // 1-indexed
  certainty: CertaintyLevel;
  createdAt: number;
  updatedAt: number;
}

// Binary portrait storage is split into its own table so the Character row stays light and queries stay fast.
// At runtime, the Blob is resolved to an object URL via URL.createObjectURL(); the URL is revoked when the character is unmounted.
// JSON export inlines portraits as data URLs for portability; import does the reverse.
interface Portrait {
  id: string;       // = Character.portraitId
  bookId: string;
  blob: Blob;
  mimeType: string; // e.g. 'image/jpeg', 'image/png'
  createdAt: number;
}

// IndexedDB schema (Dexie)
// books:         id (pk), updatedAt
// characters:    id (pk), bookId (idx), chapterIntroduced (idx)
// relationships: id (pk), bookId (idx), sourceId (idx), targetId (idx), chapterRevealed (idx)
// portraits:     id (pk), bookId (idx)
```

### 3.4 File structure

```
calabash/
├── public/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/
│   │   ├── Canvas/
│   │   │   ├── CalabashCanvas.tsx        # React Flow wrapper
│   │   │   ├── CharacterNode.tsx          # custom node component
│   │   │   ├── RelationshipEdge.tsx       # custom edge component
│   │   │   └── ChapterSlider.tsx          # bottom-docked slider
│   │   ├── Sidebar/
│   │   │   ├── BookList.tsx
│   │   │   └── BookSettings.tsx
│   │   ├── Inspector/
│   │   │   ├── CharacterInspector.tsx     # right panel, edits selected node
│   │   │   └── RelationshipInspector.tsx  # right panel, edits selected edge
│   │   ├── CommandBar/
│   │   │   └── GlobalSearch.tsx           # / shortcut
│   │   └── ui/                             # shadcn primitives
│   ├── stores/
│   │   ├── bookStore.ts                    # Zustand: active book, chapter cursor
│   │   ├── graphStore.ts                   # nodes, edges, selection, undo/redo
│   │   └── uiStore.ts                      # theme, panel state
│   ├── db/
│   │   ├── schema.ts                       # Dexie table definitions
│   │   ├── books.ts                        # book CRUD
│   │   ├── characters.ts
│   │   ├── relationships.ts
│   │   ├── portraits.ts                    # binary blob storage + URL.createObjectURL helpers
│   │   └── importExport.ts                 # JSON import/export (inlines portraits as data URLs)
│   ├── hooks/
│   │   ├── useKeyboardShortcuts.ts
│   │   ├── usePortraitUrl.ts               # Blob -> object URL with revoke on unmount
│   │   └── useChapterFilter.ts             # the core filter logic
│   ├── lib/
│   │   ├── certainty.ts                    # cycle, visual mapping
│   │   ├── relationshipTypes.ts            # RELATIONSHIP_TYPE_META: directionality table
│   │   ├── aliases.ts                      # resolve display name for a given chapter
│   │   ├── layout.ts                       # force-directed layout trigger
│   │   └── theme.ts                        # CSS variable definitions
│   └── styles/
│       ├── globals.css
│       └── themes.css                      # light + dark CSS vars
├── index.html
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── vite.config.ts
└── README.md
```

### 3.5 Responsive layout

Two layouts, switched by viewport width:

**Desktop (≥ 1024 px)**
- Three-column: left sidebar (book list, 240 px) | canvas (flex) | right inspector (320 px, collapsible)
- Chapter slider docked at bottom of canvas
- Keyboard shortcuts active

**Tablet (≥ 768 px, < 1024 px)**
- Sidebar and inspector collapse into drawer overlays
- Canvas full-width
- Chapter slider docked at bottom
- Touch interactions: tap-select, **long-press for context menu (exclusive)**, two-finger pinch zoom, single-finger drag on empty canvas to pan
- Edge creation: tap a node to select it, then drag from one of its **connection handles** (the small circular targets that fade in on selection) to another node. Handles are sized for touch (≥16 px hit area). No long-press-drag gesture — that path is reserved for context menus.

**Phone (< 768 px)**
- Show a friendly "Calabash works best on a tablet or larger screen" message with a link back to a read-only fallback view of the book list. Do not try to make the canvas usable at this size.

### 3.6 Persistence behavior

Persistence commits on **logical boundaries**, not on a time-based debounce. The point is to give the user a contract they can understand without knowing a magic number ("press save → it's saved"; "let go of the drag → it's saved"; "leave the input field → it's saved") and to make data loss on tab close impossible for any committed action.

- Every mutation goes through a store action that:
  1. Optimistically updates Zustand state
  2. Pushes onto the undo stack (one entry per **logical user action**, not per state delta)
  3. Writes to Dexie immediately for **discrete operations** (create / delete / change type / change certainty / change `chapterIntroduced` / etc.)
  4. For **continuous operations**, writes only on the boundary:
     - Node position: written on React Flow's `onNodeDragStop` (one write per drag, not 60/sec during the drag)
     - Inspector text fields (name, notes, etc.): written on blur, or on explicit Save click
- **View state is excluded from the undo stack and the data tables**: chapter slider position, theme, panel collapsed/expanded, current selection, current zoom. The chapter slider position is persisted to `Book.currentChapter` as write-through (so the next session opens at the same chapter) but is not undoable — `Ctrl+Z` does not move the slider backwards.
- On app launch: hydrate Zustand from Dexie. Object URLs for portraits are created lazily as characters mount and revoked on unmount.
- Undo stack: capped at 100 entries, in-memory only (not persisted across sessions in MVP).
- Export JSON shape:
  ```json
  {
    "calabashVersion": "0.1.0",
    "book": { /* Book */ },
    "characters": [ /* Character[] */ ],
    "relationships": [ /* Relationship[] */ ],
    "portraits": [
      { "id": "...", "bookId": "...", "mimeType": "image/jpeg", "dataUrl": "data:image/jpeg;base64,..." }
    ]
  }
  ```
  On export, `portraits[].dataUrl` is generated by reading each `Portrait.blob` and base64-encoding it; on import, the reverse — the data URL is decoded back into a Blob and stored in the `portraits` table.

### 3.7 Theming

Define semantic CSS variables in `themes.css`:

```css
:root[data-theme="light"] {
  --bg-canvas: #fafaf7;        /* soft paper */
  --bg-panel: #ffffff;
  --fg-primary: #1a1a1a;
  --fg-muted: #6b6b6b;
  --border: #e5e5e0;
  --accent: #8b2e2e;            /* aged red, like a case-file string */
  --node-detective: #2c5f7c;
  --node-suspect: #8b2e2e;
  --node-victim: #5c5c5c;
  --node-witness: #7c6f2c;
  --node-bystander: #b8b8b3;
  --edge-confirmed: #1a1a1a;
  --edge-suspected: #6b6b6b;
  --edge-disproven: #b8b8b3;
}

:root[data-theme="dark"] {
  /* paired set with the same names */
}
```

Component styling uses these variables only — never hardcoded colors. Future themes (case-file vintage, terminal green, etc.) are a single file addition.

---

## 4. Build Phases

### Phase 1 — Web MVP (target: ~2 weeks of focused work)
Everything in §2.1. Deployed as a static site (Vercel, Netlify, or GitHub Pages — purely client-side).

### Phase 2 — Tauri desktop wrapper
- Add Tauri 2 shell, no code changes to React app
- Swap Dexie for SQLite via `tauri-plugin-sql` behind the same store interface
- Add OS-native file open/save for JSON import/export
- macOS, Windows, Linux builds via GitHub Actions

### Phase 3 — iPad-class polish (only after real use validates demand)
- PWA manifest, offline install
- Apple Pencil hover preview, pressure-aware edge thickness (if it makes sense)
- Possibly Tauri Mobile if/when it stabilizes

---

## 5. Open Source Setup

- **License**: MIT
- **Repo name**: `calabash`
- **README**: includes the manifesto from §0, screenshot, install instructions, keyboard reference
- **Contribution policy**: tight in early phase — owner decides direction; PRs welcome for bugs and polish

---

## 6. Definition of Done for MVP

> The owner reads one full detective novel (e.g., *And Then There Were None* or *The Murder of Roger Ackroyd*) using Calabash from chapter 1 to the end, without abandoning it for paper or another tool, and finds the experience worth repeating on a second book.

This is the only metric that matters for the MVP. Everything else is rationalization.

---

## 7. Handoff Notes for Claude Code

- Start with the data layer (Dexie schema + store actions), then minimal canvas with hardcoded data, then progressively wire up real CRUD, then the chapter slider, then certainty interactions, then keyboard shortcuts, then polish
- The chapter slider is the single most important feature. If anything must be cut, cut the inspector panels before cutting the slider
- Do not add any AI-related dependency, code path, or even comment suggesting future AI features
- Keep external dependencies minimal — every new dep should be justified in the PR description
- Commit often, conventional commit style (`feat:`, `fix:`, `refactor:`, etc.)