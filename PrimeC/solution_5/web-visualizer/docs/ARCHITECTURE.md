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
├── App.jsx               File picker / welcome screen → loads <Visualizer/>
├── Visualizer.jsx        Top-level UI: toolbar, canvas, panels, playback
├── SettingsPanel.jsx     Right-hand sidebar with layout/vector/animation tabs
├── StepPanel.jsx         Left-hand list of trace steps (search/filter)
├── DetailPanel.jsx       Per-step inspector (changed bits, primes, factors)
├── TimingPanel.jsx       Floating, draggable phase-timing readout
├── SieveRenderer.js      Canvas 2D rendering engine
├── Camera3D.js           CSS-3D perspective camera (3D mode)
├── traceParser.js        Multi-format trace loader (JSON v2/v3, text, dump)
├── Icons.jsx             Shared SVG icon components
├── lib/                  Pure helpers (no React)
│   ├── viewPrefs.js          localStorage I/O + default merging
│   ├── traceHeader.js        Header parsing → display sections
│   ├── platform.js           Mac/Windows/Electron detection
│   └── unitConverters.js     Slider ↔ duration mappings
├── hooks/                Reusable custom hooks
│   └── useFloatingPanel.js   Drag/resize behaviour for floating panels
├── settings/             SettingsPanel building blocks
│   ├── constants.js          Layout/vector/grouping presets and tooltips
│   ├── buttons.jsx           LayoutIcon, VectorIcon, AnnotationButton, …
│   └── LegendSections.jsx    Shared legend content (tab + floating)
└── styles/               Per-concern stylesheets
    └── index.css             @imports the numbered section files
```

## Data flow

1. **Load** — `App.jsx` accepts a file from drag-drop or the picker and hands the raw content to `traceParser.js`.
2. **Parse** — `traceParser.js` produces a normalized `{ header, events, primes, … }` shape regardless of input format.
3. **Visualize** — `Visualizer.jsx` keeps the parsed trace in state along with playback position and view preferences.
4. **Persist** — `lib/viewPrefs.js` reads/writes user preferences (theme, layout, panel sizes) to `localStorage` under the key `sieve-visualizer:view-preferences:v1`.
5. **Render** — On every animation frame the visualizer updates `SieveRenderer` (and `Camera3D` in 3D mode) which paints to a `<canvas>`.
6. **Inspect** — Side panels (`StepPanel`, `DetailPanel`, `SettingsPanel`, `TimingPanel`) read derived data via props and call back into the visualizer to mutate state.

## State ownership

| State | Owner | Notes |
| --- | --- | --- |
| Loaded trace | `Visualizer` | Set once after parse, immutable thereafter |
| Playback position / speed | `Visualizer` | Drives the renderer per frame |
| View preferences | `Visualizer` + `lib/viewPrefs` | Persisted to `localStorage` |
| Floating-panel position/size | `useFloatingPanel` hook | Per-panel local state |
| Canvas pixel data | `SieveRenderer` | Owned outside React for performance |

## Adding a new feature

- **A new utility** → drop it in `src/lib/`. Keep it framework-free.
- **A new shared hook** → place in `src/hooks/`.
- **A new settings section** → add a button to `src/settings/buttons.jsx` and a section in `SettingsPanel.jsx`; constants go in `src/settings/constants.js`.
- **A new style block** → create `src/styles/NN-name.css` and add an `@import` to `src/styles/index.css`.
- **A new top-level panel** → put it next to `TimingPanel.jsx` and reuse `useFloatingPanel`.

## Build & run

```bash
npm install
npm run dev      # Vite dev server on http://localhost:5173
npm run build    # Production bundle in dist/
npm run electron # Native wrapper (after build)
```

The production build is consumed by the multi-stage `Dockerfile` and served via nginx in the deployable image.
