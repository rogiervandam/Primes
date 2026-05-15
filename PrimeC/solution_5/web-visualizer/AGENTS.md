# Agent Working Agreement

Always read architecture and maintenance docs before implementing changes, and
update docs when behavior or ownership changes.

Required reading for code changes:

1. `docs/ARCHITECTURE.md`
2. `docs/COMPONENTS.md`
3. `docs/MAINTENANCE.md`

Working rules:

1. Prefer small, behavior-preserving edits in high-risk files (`Visualizer.jsx`, `SieveRenderer.js`).
2. Reuse existing hooks/helpers before creating new ones.
3. Keep preference-key changes backward compatible through merge/migration paths.
4. After code changes, run tests and build (`npm test`, `npm run build`).
5. After docs-affecting changes, update the relevant docs in `docs/` in the same patch.
