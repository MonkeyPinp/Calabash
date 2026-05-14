# Calabash

<p align="center">
  <img src="app/public/calabash-logo-light.png" width="96" alt="Calabash logo" />
</p>

> A spoiler-safe relationship board for detective fiction readers.

[Live demo](https://guesswhat-studio.github.io/Calabash/) · [Report an issue](https://github.com/Guesswhat-Studio/Calabash/issues/new/choose) · Version `0.1.1`

Languages: **English** · [简体中文](README.zh-CN.md) · [Español](README.es.md) · [Português (Brasil)](README.pt-BR.md)

![Calabash demo screenshot](docs/assets/calabash-demo.png)

## What It Is

Calabash is a local-first case-file board for tracking characters, aliases, clues, relationships, and theories while you read. It is named after Sherlock Holmes' calabash pipe: the tool does not solve the case for you, but it sits beside you while you think.

The current public demo runs entirely in the browser. There is no account system, no hosted reader database, and no server-side save file.

## No AI, By Design

Detective novels are not puzzles to outsource. They are puzzles to inhabit.

Calabash is deliberately manual. No AI extraction, no summaries, no automatic suspect ranking. Every character you add is someone you chose to notice; every relationship you draw is a hypothesis you are willing to test; every edge you change from suspected to confirmed is a small victory of attention.

## Highlights

- **Chapter slider**: move through the book and only see what you knew at that chapter.
- **Spoiler Shield**: cover reveal-heavy chapters until you choose to uncover them.
- **Character board**: track portraits, aliases, roles, occupations, introductions, and notes.
- **Relationship certainty**: mark connections as confirmed, suspected, or disproven.
- **Open text fields**: roles and relationship types are suggestions, not hard limits.
- **Sticky notes**: keep clues, alibis, theories, and reminders near the board.
- **Local library**: save books in IndexedDB and back them up with Export/Import.
- **Built-in tutorials**: try *The Murder of Roger Ackroyd* or *Hida Trick House Murder Case*.
- **Multilingual UI**: English, Simplified Chinese, Spanish, and Brazilian Portuguese.

## Data And Privacy

Calabash is local-first:

- Your books are stored in your browser with IndexedDB.
- Theme, language, and onboarding preferences use localStorage.
- Other demo visitors cannot change your board, and you cannot change theirs.
- Clearing browser site data can delete your local library.
- Use **Export Library** as your backup path and **Import Library** to move data to another browser.

## Quick Start

1. Open the [live demo](https://guesswhat-studio.github.io/Calabash/).
2. Choose the Ackroyd tutorial, the Kindaichi tutorial, or a blank book.
3. Press `N` to add a character.
4. Select a character, press `E`, then click another character to add a relationship.
5. Move the chapter slider as you read.
6. Export your library when you want a backup.

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `N` | New character |
| `E` | Connect edge from selected character |
| `F` | Fit board to view |
| `/` | Search |
| `Delete` / `Backspace` | Delete selected item |
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Shift + Z` | Redo |

## Who It Is For

Calabash is for readers who enjoy doing the detective work themselves:

- Classic mystery readers: Agatha Christie, Ellery Queen, John Dickson Carr, S. S. Van Dine.
- Manga and TV mystery fans tracking aliases, masked identities, and late reveals.
- Readers of character-dense fiction: fantasy, historical novels, family sagas, political thrillers.
- Anyone who wants a quiet, private, no-account tool for thinking with a story.

Calabash is not a book tracker, ebook reader, writing tool, AI summarizer, or social platform.

## Development

The app lives in `app/` and runs as a Vite React project.

```bash
cd app
npm install
npm run dev       # http://localhost:5173
npm run typecheck # TypeScript check
npm test          # Vitest suite
npm run build     # production build
```

GitHub Pages build:

```bash
cd app
VITE_BASE_PATH=/Calabash/ npm run build
```

Optional local tutorial portraits:

```bash
cd app
npm run fetch:kindaichi-portraits
```

This downloads Kindaichi wiki thumbnails into `app/public/demo-portraits/`, which is gitignored and intended for local demo use only. The Ackroyd tutorial uses original generated case-file avatars.

## Roadmap

The product roadmap is intentionally not kept in the public repository. Public planning should live in [GitHub Projects](https://github.com/orgs/Guesswhat-Studio/projects); GitHub Issues are open for bugs, beta feedback, and feature proposals.

## Versioning

Calabash uses `0.x` beta versioning for now:

- `0.1.0`: first public web demo.
- `0.1.1`: public-facing repository cleanup, multilingual README split, issue templates, and beta docs polish.

## License

MIT
