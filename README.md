# Calabash

> A relationship-mapping companion for readers of detective fiction.

**No AI. By design.** See [PLAN.md](./PLAN.md) §0 for the manifesto.

## Status

Phase 1 MVP / Phase 1.5 polish in progress — local Dexie persistence, book CRUD, book categories, chapter filtering, graph editing, sticky notes, Spoiler Shield, settings, import/export, and desktop shell are underway.
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
