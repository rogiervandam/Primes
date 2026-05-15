# Agent Working Agreement

This workspace has two sub-projects. Always scope commits and changes to the relevant sub-project only.

## Sub-projects

| Area | Root | Language |
|------|------|----------|
| C sieve library | `src/`, `bin/`, `Makefile` | C |
| Web visualizer | `web-visualizer/` | React / JS |

## C Sieve

**Build variants:**
```bash
./sieve <variant> compile          # e.g. sieve_extend, sieve_classic64, sieve_wheel
make                               # builds all variants + runs them
```

**Generate a trace file** (written to `log/`):
```bash
./sieve trace <variant> <sieve_size>   # e.g. ./sieve trace wheelstorage 10000
```

Source layout: `src/<variant>.c` includes all deps and exposes `shakeSieve(counter_t sieve_size)`. Benchmarking helpers live in `src/benchmark/`. See [README.md](README.md) for algorithm detail and optimization notes.

## Web Visualizer

**Working directory:** always `web-visualizer/` for npm commands.

```bash
npm install
npm run dev       # dev server at http://localhost:5173
npm run test      # vitest (run after code changes)
npm run build     # production build (run after code changes)
```

**Visualizer-specific working rules:** see [web-visualizer/docs/AGENTS.md](web-visualizer/docs/AGENTS.md).  
Architecture and module map: [web-visualizer/docs/ARCHITECTURE.md](web-visualizer/docs/ARCHITECTURE.md).  
Component boundaries and prop surfaces: [web-visualizer/docs/COMPONENTS.md](web-visualizer/docs/COMPONENTS.md).  
Maintenance guide and golden contracts: [web-visualizer/docs/MAINTENANCE.md](web-visualizer/docs/MAINTENANCE.md).  
Naming conventions: [web-visualizer/docs/NAMING_CONVENTIONS.md](web-visualizer/docs/NAMING_CONVENTIONS.md).
