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
