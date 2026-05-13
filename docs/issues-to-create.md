# Calabash MVP — Issues to create on GitHub
# Paste each block into `gh issue create` or the GitHub web UI.
# Create in order (blockers first).

---

## Issue 1 — CharacterNode visual redesign

**Title:** `feat: CharacterNode visual redesign — role colour bar, badge, card shadow`
**Labels:** `enhancement`

### What to build
Redesign `CharacterNode` so it looks like a real card. Role-coloured top bar (4 px), small uppercase role badge, character name as primary text, subtle card shadow. Connection handles invisible at rest, fade in on hover/select (≥ 16 px hit area).

No data-layer changes. CSS variables only — no hardcoded colours.

### Acceptance criteria
- [ ] Nodes render with a role-coloured top bar
- [ ] Role badge text (e.g. DETECTIVE) appears in muted uppercase
- [ ] Character name renders with clear typographic weight
- [ ] Card shadow distinguishes node from canvas background
- [ ] Handles invisible at rest, visible on hover/select
- [ ] All six roles correct in light + dark themes
- [ ] Existing CharacterNode tests still pass

**Blocked by:** None

---

## Issue 2 — App shell layout

**Title:** `feat: App shell — three-column layout (sidebar | canvas | inspector)`
**Labels:** `enhancement`

### What to build
Replace the bare full-screen canvas with a three-column shell:
- **Left sidebar** 240 px — book list placeholder + settings icon
- **Centre canvas** — flex, contains CalabashCanvas + chapter slider slot at bottom
- **Right inspector** 320 px — collapsible, placeholder "select a node" message

Desktop ≥ 1024 px: all three columns visible. Tablet 768–1023 px: sidebar and inspector collapse to drawer overlays. Phone < 768 px: "works best on tablet or larger" message.

### Acceptance criteria
- [ ] Three-column layout renders on desktop
- [ ] Inspector collapses/expands with a toggle button
- [ ] Sidebar and inspector collapse to drawers on tablet
- [ ] Phone shows friendly message
- [ ] No hardcoded colours — CSS variables only

**Blocked by:** None

---

## Issue 3a — Book CRUD UI

**Title:** `feat: Book sidebar — create, rename, delete, and switch books`
**Labels:** `enhancement`

### What to build
Populate the left sidebar with a real book list. Users can:
- See all books with title + last-updated time
- Click a book to make it active (canvas reloads to that book's graph)
- Create a new book via a "+ New book" button (opens a small inline form: title, author optional, total chapters)
- Rename a book (click title to edit inline)
- Delete a book (with confirmation)

Active book is stored in `bookStore.activeBookId`.

### Acceptance criteria
- [ ] Book list renders books from Dexie sorted by `updatedAt` desc
- [ ] Active book is visually highlighted
- [ ] "+ New book" creates a book and makes it active
- [ ] Inline rename saves on blur / Enter
- [ ] Delete prompts for confirmation, removes book + all its characters/relationships/portraits
- [ ] Switching books reloads the canvas

**Blocked by:** Issue 2

---

## Issue 3b — Dexie hydration + store write-through

**Title:** `feat: Wire graphStore to Dexie — hydrate on startup, write-through on mutations`
**Labels:** `enhancement`

### What to build
Connect the Zustand stores to Dexie so data survives page reloads.

- On app launch: `bookStore` hydrates from Dexie; when `activeBookId` changes, `graphStore` loads that book's characters and relationships.
- Every mutation (add/update/delete character or relationship, node drag-end) writes to Dexie immediately.
- `Book.currentChapter` is updated write-through when the chapter slider moves (not undoable).
- Object URLs for portraits are created lazily when characters mount (`URL.createObjectURL`) and revoked on unmount.

### Acceptance criteria
- [ ] Refreshing the page restores the last active book and its graph
- [ ] Dragging a node and refreshing keeps the new position
- [ ] Chapter slider position restores on reload
- [ ] Portrait object URLs are created on mount and revoked on unmount

**Blocked by:** Issue 3a

---

## Issue 4 — Chapter slider

**Title:** `feat: Chapter slider — real-time chapter filtering docked at canvas bottom`
**Labels:** `enhancement`, `core`

### What to build
The chapter slider is the most important feature. A horizontal `<input type="range">` docked at the bottom of the canvas:
- Range: 1 → `book.totalChapters` (default 30)
- Current position shown as a numeric label ("Chapter 12")
- Scrubbing is real-time: nodes and edges outside the chapter window disappear immediately
- Default position: `book.currentChapter` (restored from Dexie on load)
- Slider movement writes `Book.currentChapter` to Dexie on `mouseup`/`touchend` (not 60×/sec)

Filtering logic already exists in `CalabashCanvas` — the slider just drives `currentChapter`.

### Acceptance criteria
- [ ] Slider renders at canvas bottom, full width
- [ ] Scrubbing in real time shows/hides nodes and edges
- [ ] Node display names update as chapter changes (alias resolution)
- [ ] Chapter position persists across reloads
- [ ] Works on touch (tablet)

**Blocked by:** Issue 3b

---

## Issue 5 — Character add + delete

**Title:** `feat: Character add and delete — double-click canvas to add, Delete key to remove`
**Labels:** `enhancement`

### What to build
- **Add**: double-click on empty canvas area → open a small "New character" modal (name, role dropdown, chapter introduced). On confirm, creates character in Dexie + adds node to canvas at the clicked position.
- **Delete**: select a node (click) → press `Delete`/`Backspace` → removes character (and all its relationships) from Dexie and canvas, with undo.
- Node drag-end saves `character.position` to Dexie.
- Multi-select via `Shift + drag` rectangle; `Delete` removes all selected.

### Acceptance criteria
- [ ] Double-click on empty canvas opens New Character modal
- [ ] New character appears on canvas at clicked position
- [ ] Click a node to select it; selected node has a visible selection ring
- [ ] Delete key removes selected character(s) and their relationships
- [ ] Drag-end persists position to Dexie
- [ ] Multi-select + delete works

**Blocked by:** Issue 3b

---

## Issue 6 — CharacterInspector panel

**Title:** `feat: CharacterInspector — right panel to edit character fields`
**Labels:** `enhancement`

### What to build
When a character node is selected, the right inspector panel shows and populates with that character's data. Editable fields:
- Name (text input)
- Aliases (list: each has name + chapterRevealed; add/remove)
- Role (select)
- Chapter introduced (number input)
- Profession, social position (text inputs)
- Notes (textarea, markdown)
- Portrait (image upload, shows thumbnail)

All fields save to Dexie on blur/change. Closing the panel or selecting nothing collapses the inspector.

### Acceptance criteria
- [ ] Clicking a node opens the inspector with that character's data
- [ ] All fields are editable and save to Dexie on blur
- [ ] Alias list supports add and remove
- [ ] Portrait upload stores image and shows thumbnail
- [ ] Deselecting closes the inspector (or shows placeholder)

**Blocked by:** Issue 5

---

## Issue 7 — Relationship add + delete + certainty badge cycle

**Title:** `feat: Relationship add and delete — connection handles, Delete to remove, badge click cycles certainty`
**Labels:** `enhancement`

### What to build
- **Connection handles**: visible on node hover/select; drag from a handle to another node creates a relationship. On drop, open a "New relationship" modal (type dropdown, chapter revealed, certainty — defaults: `other`, chapter 1, `suspected`).
- **Delete**: select an edge → `Delete`/`Backspace` removes it.
- **Certainty cycle**: clicking the certainty badge (✓ / ? / ✗) on an edge cycles `confirmed → suspected → disproven` and saves to Dexie immediately. This is separate from selecting the edge.

### Acceptance criteria
- [ ] Handles appear on node hover/select, disappear otherwise
- [ ] Dragging handle to another node opens New Relationship modal
- [ ] Relationship appears on canvas with correct style after creation
- [ ] Delete key removes selected edge
- [ ] Badge click cycles certainty and persists to Dexie
- [ ] Directed edge types (hostile, suspicion) render with arrow; symmetric types do not

**Blocked by:** Issue 5

---

## Issue 8 — RelationshipInspector panel

**Title:** `feat: RelationshipInspector — right panel to edit relationship fields`
**Labels:** `enhancement`

### What to build
Clicking an edge body (not the badge) opens the right inspector panel for that relationship. Editable fields: type, label, chapter revealed, certainty, notes. All save on blur. Closing/deselecting collapses inspector.

### Acceptance criteria
- [ ] Clicking edge body selects edge and opens inspector
- [ ] Clicking edge badge cycles certainty without opening inspector
- [ ] All fields editable, save on blur
- [ ] Inspector closes on deselect

**Blocked by:** Issue 7

---

## Issue 9 — Undo/redo + keyboard shortcuts

**Title:** `feat: Undo/redo and keyboard shortcuts`
**Labels:** `enhancement`

### What to build
**Undo/redo**: 100-entry in-memory stack in `graphStore`. Every create/delete/edit of a character or relationship pushes a reversible entry. Node position drag does NOT go on the undo stack. `Cmd/Ctrl+Z` undoes, `Cmd/Ctrl+Shift+Z` redoes.

**Keyboard shortcuts** (active when canvas is focused):
- `N` — new character at canvas centre (opens New Character modal)
- `Delete`/`Backspace` — delete selected element(s)
- `F` — fit canvas to content
- `Cmd/Ctrl+Z` / `Cmd/Ctrl+Shift+Z` — undo / redo
- `Space + drag` — pan
- `/` — focus global search (stub: just focus a search input in the sidebar)

### Acceptance criteria
- [ ] Cmd+Z undoes last create/edit/delete
- [ ] Cmd+Shift+Z redoes
- [ ] Undo stack capped at 100 entries
- [ ] N opens New Character modal
- [ ] F fits canvas
- [ ] Delete removes selected elements
- [ ] / focuses search input

**Blocked by:** Issues 5, 7

---

## Issue 10 — Theme toggle + JSON import/export UI

**Title:** `feat: Theme toggle, JSON export, and JSON import`
**Labels:** `enhancement`

### What to build
- **Theme toggle**: a sun/moon icon button in the sidebar footer toggles `data-theme` attribute between `light` and `dark`. Persists to `localStorage`.
- **Export**: "Export JSON" button in sidebar → downloads `<bookTitle>.calabash.json` using the existing `exportBookAsJson` DAO.
- **Import**: "Import JSON" button → opens file picker, reads file, calls `importBookFromJson`, adds new book to list and makes it active.

### Acceptance criteria
- [ ] Theme toggle switches light/dark immediately
- [ ] Theme persists across reloads
- [ ] Export downloads a valid JSON file
- [ ] Import creates a new book from a valid JSON file
- [ ] Import shows an error message for invalid files

**Blocked by:** Issue 2

---

## Issue 11 — Auto-layout (force-directed, one-shot)

**Title:** `feat: Auto-layout button — one-shot force-directed node positioning`
**Labels:** `enhancement`

### What to build
A "Layout" button in the canvas toolbar (or sidebar) triggers a one-shot force-directed layout pass that repositions all currently-visible nodes to reduce overlap. After the layout runs, each node's new position is saved to Dexie. The layout is not continuous — it only runs when the button is clicked.

Use `d3-force` or a simple spring simulation; keep it as a utility in `src/lib/layout.ts`.

### Acceptance criteria
- [ ] Layout button visible in canvas controls
- [ ] Clicking it repositions nodes to a non-overlapping layout
- [ ] New positions are saved to Dexie
- [ ] Works correctly when chapter filter is active (only visible nodes are repositioned)

**Blocked by:** Issue 5
