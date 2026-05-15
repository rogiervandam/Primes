# Agent Working Agreement

Always read architecture and maintenance docs before implementing changes, and
update docs when behavior or ownership changes.

Required reading for code changes:

1. `docs/ARCHITECTURE.md`
2. `docs/COMPONENTS.md`
3. `docs/MAINTENANCE.md`
4. 'docs/NAMING_CONVENTIONS.md'

Working rules:

1. Prefer small, behavior-preserving edits in high-risk files (`Visualizer.jsx`, `SieveRenderer.js`).
2. Reuse existing hooks/helpers before creating new ones.
3. Keep preference-key changes backward compatible through merge/migration paths.
4. After code changes, run tests and build (`npm test`, `npm run build`).
5. After docs-affecting changes, update the relevant docs in `docs/` in the same patch.
6. When a backlog item is completed, mark it as TESTABLE. Under the backlog item, add the following: 
- feature description for release notes
- feature description for requirements.md
- test instructions
- considerations for edge cases and future maintenance
- further ideas for enhancements
- empty notes section where the maintainer can add notes about test or refinement.
7. When i mark a backlog item as DONE, add the requirement to `docs/REQUIREMENTS.md` in the correct chapter.




