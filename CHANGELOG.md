# Changelog

## 0.3.1 - 2026-05-16

- Fixed compact toolbar behavior so narrow boards keep the book title and inspector toggle visible.
- Collapsed toolbar button labels into icon-only controls when horizontal space is tight.
- Bumped web, desktop, import/export, and template metadata to `0.3.1`.

## 0.3.0 - 2026-05-15

- Added chapter-aware illustrations for floor plans, screenshots, and other visual references, including upload, clipboard paste, drag/resize, preview, and background/board layering.
- Kept illustration import/export compatible with earlier attachment and evidence image payloads while publishing the new `illustrations` JSON field.
- Redesigned Settings into the case-folder interface, with Look as the first screen for language/theme changes and Guides as the second screen.
- Removed the About panel's Built On row and bumped web, desktop, import/export, and template metadata to `0.3.0`.

## 0.2.2 - 2026-05-15

- Added Japanese as a first-class UI language, including system-locale detection and Settings/onboarding language choices.
- Localized the tutorial demo copy in Japanese, with special coverage for the Kindaichi Hida case names, aliases, family relationships, culprit reveal, groups, and sticky notes.
- Added a Japanese README and Japanese SEO/search metadata for the public web demo.
- Changed macOS release assets from raw binaries to DMG images for both Apple Silicon and Intel Macs.
- Bumped web, desktop, import/export, and template metadata to `0.2.2`.

## 0.2.1 - 2026-05-15

- Made the Settings update button active: desktop builds can check GitHub Releases, report whether the build is current, and open the matching platform asset or release page when a newer version exists.
- Added a new-book choice between starting from scratch and importing a single-book JSON file.
- Added an LLM-friendly single-book import template at `docs/examples/book-import-template.calabash.json`.
- Added a tolerant single-book import adapter that accepts both Calabash book exports and simplified templates with characters, relationships, notes, and groups.

## 0.2.0 - 2026-05-14

0.2 prepares Calabash for desktop distribution while keeping the board workflow focused on lightweight case-file annotation rather than heavier membership management.

- Added the Tauri 2 desktop shell at `src-tauri/` with Windows, Linux, and macOS binary release configuration.
- Added root desktop npm scripts for Tauri development and packaging.
- Changed desktop release automation to attach plain platform binaries instead of installers.
- Added language selection to the first-run onboarding tutorial.
- Added wrapping for long names in the fixed-width portrait character cards.
- Added chapter-aware sticky note visibility and compact episode/chapter tags.
- Added bottom-layer group regions for marking factions, locations, or clusters on the board, including chapter visibility, color, size, duplicate, delete, and demo data support.
- Added draggable group labels and adjustable font sizes for both group labels and sticky notes.
- Updated both tutorial demos to use the curated exported board layouts and label font sizes.
- Restored relationship direction choices, including source-to-target, target-to-source, and undirected relationships.
- Improved dense relationship rendering so multiple edges between the same characters fan out instead of covering each other.
- Fixed character click targeting after highlight/edge states and let the add-character role menu escape the modal clipping area.
- Fixed font-size inputs so pressing Enter applies the edit, and fixed group resizing from left/top handles so groups do not drift.

## 0.1.3 - 2026-05-14

- Added clearer beta storage warnings in onboarding, empty-state, and Settings copy so testers know browser site data is the local library.
- Added a fixture-style whole-library import/export regression test covering users, categories, books, characters, relationships, notes, spoiler markers, and portraits.
- Added a board style switcher for compact text cards and large portrait cards, with auto-layout spacing aware of the active node footprint.
- Added tag-triggered GitHub Release automation, with the Tauri desktop release matrix ready for the `0.2` shell.
- Kept the beta-readiness work under the single `0.1.3` version line.

## 0.1.2 - 2026-05-14

- Removed the non-interactive Character Inspector tab strip so all character details appear as one continuous form.
- Localized Character Inspector labels, placeholders, actions, and summary text across English, Simplified Chinese, Spanish, and Brazilian Portuguese.
- Localized matching Relationship Inspector labels and action titles.

## 0.1.1 - 2026-05-14

- Split the public README into separate English, Simplified Chinese, Spanish, and Brazilian Portuguese files.
- Added logo and demo screenshot assets to make the repository landing page more useful for new readers.
- Removed the internal project plan from tracked files so future public planning can move to GitHub Projects.
- Added structured GitHub issue templates for bugs, beta feedback, and feature proposals.
- Started explicit `0.x` beta versioning in package metadata and app settings.

## 0.1.0 - 2026-05-14

- First public web demo with local-first storage, multilingual UI, tutorial cases, import/export, and GitHub Pages deployment.
