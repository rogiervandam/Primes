# Sieve Visualizer — Architecture

This document describes how the web visualizer is organised, the responsibilities of each module, and how data flows from a trace file to pixels on the screen.

## Goals

- **Single source of truth for state** — `Visualizer.jsx` owns the runtime/playback state and passes derived data to children.
- **Reusable, testable utilities** — Pure helpers live under `src/lib/` so they can be exercised without React.
- **Composable UI** — Settings, panels, and overlays are split into focused files; cross-cutting visual elements (icons, legend, floating panel behaviour) are shared.

## Module map

```
src/
├── main.jsx              Entry: mounts <App/> and loads styles/index.css
├── App.jsx               File picker / welcome screen → lazy-loads <Visualizer/>
├── Visualizer.jsx        Top-level UI: toolbar, canvas, panels, playback (~4 200 lines)
├── SettingsPanel.jsx     Right-hand sidebar tab-row shell (~260 lines; delegates to settings/)
├── EventsPanel.jsx       Left-hand list of trace events (search/filter)
├── DetailPanel.jsx       Per-step inspector (changed bits, primes, factors)
├── TimingPanel.jsx       Floating, draggable phase-timing readout
├── SieveRenderer.js      Canvas 2D overlay/layout engine (~2 655 lines)
├── Camera3D.js           CSS-3D perspective camera (3D mode)
├── traceParser.js        Multi-format trace loader (JSON v2/v3, text, dump)
│                         (async chunk — dynamically imported on first file open)
├── log-api-utils.mjs     Node-side log API helpers (list/read/upload/pending uploads)
├── bin/
│   └── docker-import.mjs Generic Docker .sievetrace importer/uploader
├── Icons.jsx             Shared SVG icon components
├── lib/                  Pure helpers (no React)
│   ├── viewPrefs.js          localStorage I/O + default merging + getInitialViewState()
│   ├── traceHeader.js        Header parsing → display sections
│   ├── platform.js           Mac/Windows/Electron detection
│   ├── unitConverters.js     Slider ↔ duration mappings
│   └── animationTiming.js    Pure timing math (event durations, tier curves)
├── parser/               Trace-parser building blocks (no React)
│   ├── parseUtils.js         Aliases, kv-line/range/list parsing, sanitizers
│   ├── primeInference.js     Infer missing prime numbers from annotations
│   ├── maskMetadata.js       Build mask write-orders + per-bit metadata
│   ├── headerParser.js       Title/benchmark/header extraction
│   └── dumpParser.js         Hex/binary memory-dump → events conversion
├── renderer/             SieveRenderer building blocks (no React)
│   ├── constants.js              Themes, palettes, layouts, presets, residues
│   ├── bitMath.js                bitToNumber / numberToBit (storage models)
│   ├── drawingHelpers.js         hexToRgb, mixRgb, fitted-text drawing helpers
│   ├── MinimapRenderer.js        Minimap overlay drawing + hit-testing (Pattern D)
│   ├── VisualizationRenderer.js  Documentation-as-code contract for any renderer
│   ├── overlays/             Stateless overlay classes (Pattern D)
│   │   ├── SearchOverlay.js              Search-target bit highlight
│   │   ├── MaskWriteOverlay.js           Mask write-order labels + tints
│   │   ├── VectorTouchOrderOverlay.js    Vector touch-order summary labels
│   │   └── CachelineAnnotationsOverlay.js Cacheline heat-map tints + outlines
│   ├── gl/                   WebGL2 bit-fill backend (worker mode, default)
│   │   ├── bitGridGLCore.js          Pure WebGL2 substrate (OffscreenCanvas worker path)
│   │   ├── hostStatePacker.js        packPositions / packState pure helpers
│   │   ├── bitGridWorker.js          Module worker owning a BitGridGLCore
│   │   └── BitGridGLWorker.js        Main-thread facade (production path)
│   └── workers/              JS worker helpers
│       ├── bitPrePass.worker.js      Prime-flag pre-computation off main thread
│       └── bitPrePassClient.js       Main-thread fire-and-forget client
├── hooks/                Reusable custom hooks
│   ├── useFloatingPanel.js       Drag/resize behaviour for floating panels
│   ├── useTraceExport.js         PNG snapshot + WebM video recording
│   ├── useDraftInput.js          Editable text draft synced with a controlled value
│   ├── useKeyboardShortcuts.js   Global keydown listener for single-key shortcuts
│   ├── usePlaybackClock.js       seekGenRef / globalPausedRef / animBusyUntilRef triplet
│   ├── usePlaybackLoop.js        Selected/single/all-events playback schedulers
│   ├── useSearchState.js         Search box state + navigate-to-bit handler
│   ├── usePanelChoreography.js   Panel/widget transitions + resize-anchor rules
│   └── use3DCamera.js            Camera3D lifecycle + reactive state
├── settings/             SettingsPanel building blocks
│   ├── constants.js              Layout/vector/grouping presets and tooltips
│   ├── buttons.jsx               LayoutIcon, VectorIcon, AnnotationButton, …
│   ├── LegendSections.jsx        Shared legend content (tab + floating balloon)
│   ├── LegendTab.jsx             Legend tab content with float/dock affordances
│   ├── ColorsTab.jsx             Colors tab: theme, canvas bg, opacity, presets
│   ├── AnimationTab.jsx          Animation tab: style, mode, speed, timing targets
│   ├── LayoutTab.jsx             Layout tab: bit/byte grid, vectors, spacing, overlays
│   └── useSettingsBundle.js      Hook: (settings,onChange) → {s,set,setMany,incr,decr}
├── visualizer/           Pieces extracted from Visualizer.jsx
│   ├── Toolbar.jsx               Top toolbar (transport + actions)
│   ├── TraceInfoPopover.jsx      Storage model + parsed header sections
│   ├── ExportProgress.jsx        Slim progress bar during video export
│   ├── DebugToolsPanel.jsx       Toolbar-toggled FPS/render timing window
│   ├── CanvasStage.jsx           Canvas area + overlays + balloons + panels
│   ├── BitHistoryBalloon.jsx     Hover/pinned bit-history popover
│   ├── BitHistoryBalloons.jsx    Pinned + hover bit-history cluster + SVG connectors
│   ├── EventTitleBanner.jsx      Floating current-event banner (draggable)
│   ├── JoinedEventsWidget.jsx    Combined transport+event banner widget (join/split mode)
│   ├── AllEventsTransport.jsx    Compact all-events nav+timeline for use in the detail panel
│   ├── DetailInspectorOverlay.jsx Modal table of bits / numbers / primes
│   ├── StepAnimSliders.jsx       Mode/Timeline/Target/Speed sliders cluster
│   └── gestures/             Pure gesture-body helpers
│       ├── pan.js                2D pan handler
│       ├── rotate.js             3D mouse-rotate handler (returns {startX,startY})
│       └── wheel.js              Wheel / zoom handler
├── dev/                  Dev-only modules (not bundled in production)
│   └── parityHarness.js          GL vs Canvas2D visual-diff harness (parity.html)
└── styles/               Per-concern stylesheets
    └── index.css             @imports the numbered section files
```

## Data flow

1. **Load** — `App.jsx` accepts a file from drag-drop or the picker and hands the raw content to `traceParser.js`.
2. **Parse** — `traceParser.js` produces a normalized `{ header, events, primes, … }` shape regardless of input format.
3. **Visualize** — `Visualizer.jsx` keeps the parsed trace in state along with playback position and view preferences.
4. **Persist** — `lib/viewPrefs.js` reads/writes user preferences (theme, layout, panel sizes) to `localStorage` under the key `sieve-visualizer:view-preferences:v1`.
5. **Render** — On every animation frame the visualizer calls `BitGridGLWorker.render()` first (GL worker paints all bit fills to a transferred `OffscreenCanvas`), then calls `SieveRenderer.render()` which paints overlays, labels, and side-face polygons on top via Canvas 2D. SieveRenderer no longer fills cells itself. The debug tools window reads renderer timing snapshots and renders as React UI outside the canvas/3D plane.
6. **Inspect** — Side panels (`EventsPanel`, `DetailPanel`, `SettingsPanel`, `TimingPanel`) read derived data via props and call back into the visualizer to mutate state.

## Log ingestion

The dev/preview server and Electron local server expose the same log API through
`log-api-utils.mjs`:

- `GET /api/logs` lists local `.sievetrace` files from the configured log directory.
- `GET /api/logs/:name` serves a trace or companion timing file.
- `POST /api/logs/upload?name=<file.sievetrace>` saves a raw uploaded trace body.
- `GET /api/logs/pending-upload` returns the oldest upload waiting for a UI decision.
- `POST /api/logs/pending-upload/:id/ack` clears that pending prompt.

`App.jsx` polls the pending-upload endpoint. When an external tool uploads a
trace, the app asks whether to open it now or keep the current trace; accepting
reuses the existing `loadFromApi(name)` path.

`bin/docker-import.mjs` is a visualizer-owned generic importer for Dockerized
producers. It inspects arbitrary containers, discovers likely log directories
from explicit CLI paths, labels, env vars, working directory, and common paths,
copies matching `.sievetrace` files with `docker exec/find` or `docker cp`, and
uploads them to the log API.

## State ownership

| State | Owner | Notes |
| --- | --- | --- |
| Loaded trace | `Visualizer` | Set once after parse, immutable thereafter |
| Playback position / speed | `Visualizer` | Drives the renderer per frame |
| View preferences | `Visualizer` + `lib/viewPrefs` | Persisted to `localStorage`; seeded via `getInitialViewState()` |
| Floating-panel position/size | `useFloatingPanel` hook | Per-panel local state |
| Canvas pixel data | `SieveRenderer` | Owned outside React for performance; draws overlays / labels / side-faces only — all cell fills handled by GL |
| Bit-fill GPU data | `BitGridGLWorker` (worker thread) | Packed `Float32Array`/`Uint8Array` position + state + anim textures; rebuilt from `SieveRenderer` layout accessors every frame. State texture is `RGBA8` (state byte in `.r` channel, normalized). |
| Render timing samples | `SieveRenderer` + `DebugToolsPanel` | Renderer records active render cadence; React displays FPS/avg/last frame metrics outside the 3D plane |
| Playback clock refs | `usePlaybackClock` hook | `seekGenRef`, `globalPausedRef`, `animBusyUntilRef` — mutated directly by consumers |
| Panel/widget transitions | `usePanelChoreography` hook | Toggle/reveal/join/split/open/hide callbacks; raw state is still owned by `Visualizer` |
| 3D camera transform | `use3DCamera` hook | CSS-3D matrix applied to `CanvasStage` container |

## Adding a new feature

**See [`AI_MAINTENANCE.md`](AI_MAINTENANCE.md) for the full agent playbook,
known minefields, and a list of refactors already completed.**

- **A new utility** → drop it in `src/lib/`. Keep it framework-free.
- **A new shared hook** → place in `src/hooks/`.
- **A new trace format / parsing detail** → add a focused module under `src/parser/` and import it from `traceParser.js`.
- **A new renderer helper** (constants, pure drawing math) → add it under `src/renderer/` and import it from `SieveRenderer.js`.
- **A new settings section** → add a button to `src/settings/buttons.jsx` and a section in `SettingsPanel.jsx`; constants go in `src/settings/constants.js`.
- **A new style block** → create `src/styles/NN-name.css` and add an `@import` to `src/styles/index.css`.
- **A new top-level panel** → put it next to `TimingPanel.jsx` and reuse `useFloatingPanel`.
- **A new visualizer-only widget** (toolbar button, overlay, popover) → add it under `src/visualizer/` and pass any state in via props.
- **A new visualization mode** (timeline, graph, combined heatmap) → implement the contract in [`src/renderer/VisualizationRenderer.js`](../src/renderer/VisualizationRenderer.js) under `src/renderers/MyMode.js` and select it at construction in `Visualizer.jsx`.

## Build & run

```bash
npm install
npm run dev      # Vite dev server on http://localhost:5173
npm run build    # Production bundle in dist/
npm run test     # Vitest unit tests (260 tests across 8 files; no DOM required)
npm run electron # Native wrapper (after build)
npm run docker:import -- --container NAME --container-log-dir /app/log
```

**Bundle chunks** (production build):

| Chunk | Size (gzip) | Loaded when |
| ----- | ----------- | ----------- |
| `index-*.js` (welcome screen) | ~48 kB | on page load |
| `Visualizer-*.js` (UI + SieveRenderer) | ~87 kB | on first file open |
| `traceParser-*.js` | ~7 kB | on first file open |
| `bitGridWorker-*.js` | ~14 kB | on first file open (GL worker) |
| `bitPrePass.worker-*.js` | ~1 kB | on first file open (prime pre-pass) |

`App.jsx` uses `React.lazy(() => import('./Visualizer'))` and `preloadVisualizer()` to start the Visualizer chunk download as soon as the user opens a file, minimising the Suspense fallback window.

The production build is consumed by the multi-stage `Dockerfile` and served via nginx in the deployable image.
