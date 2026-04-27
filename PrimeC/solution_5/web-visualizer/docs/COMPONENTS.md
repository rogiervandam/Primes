# Components Reference

A quick reference for the React components and modules under `src/`. Prop signatures reflect the current source; consult the file for full detail.

## Top-level components

### `App.jsx`
Welcome screen and file picker. Loads either an uploaded file or a bundled sample, then renders `<Visualizer trace=... />`.

### `Visualizer.jsx`
Owns playback state, view preferences, and the canvas. Composes the toolbar, side panels, hover balloons, and overlays. Most of the application logic lives here; helpers have been extracted to `lib/`, `hooks/`, and `settings/`.

### `SettingsPanel.jsx`
Right-hand collapsible sidebar with tabs:

| Tab | Purpose |
| --- | --- |
| Layout | Bit/byte layout grid presets |
| Vector | Vector grouping (uint16/32/64 × lanes) |
| Spacing | Gap and grouping spacing |
| Annotations | Cacheline heatmap + outline modes |
| Animations | Ripple / fade / pulse / sequential reveal |
| Legend | Embedded `<LegendSections detailed />` |

Key props (selection):

- `viewPrefs`, `setViewPrefs`
- `outlineSettings`, `setOutlineSettings`
- `cachelineAnnot`, `setCachelineAnnot`
- `collapsed`, `onToggleCollapsed`
- `isWindowsPlatform`

### `StepPanel.jsx`
Left-hand list of trace steps with grouping, search, and a draggable resize handle. Calls back to the visualizer when the user selects a step.

### `DetailPanel.jsx`
Inspector for the currently selected step. Shows changed bits, factor, count of newly cleared bits, and contextual primes.

### `TimingPanel.jsx`
Floating, draggable, resizable panel showing per-phase timings. Uses `useFloatingPanel` for drag/resize behaviour.

## Settings building blocks (`src/settings/`)

### `LegendSections.jsx`
Default export: `LegendSections({ detailed = true })`. Pure JSX with the four legend groups (Bit states, Overlays, Animations, Interactions). Used both inside the Legend tab and inside the floating "?" balloon.

### `buttons.jsx`
Named exports — all are pure presentational components:

- `LayoutIcon({ cols, rows, grid3x3, active, onClick, size, tooltip })`
- `VectorIcon({ count, active, onClick, size, tooltip })`
- `SpacingIcon({ title })`
- `GearIcon()`
- `AnnotationButton({ title, hint, active, onClick, preview })`
- `PreviewOptionButton({ label, hint, active, onClick, preview, compact, extraClass })`

### `constants.js`
Static lookup tables used by SettingsPanel:

- `BIT_LAYOUT_TIPS`, `BYTE_LAYOUT_TIPS` — tooltip strings
- `describeLayout(layoutKey, catalog, noun)` → human description
- `VECTOR_TIPS`
- `GROUPING_PRESETS`, `GROUPING_FAMILIES`, `CUSTOM_GROUP_PRESETS`
- `groupingPreviewClassName(presetKey)` → CSS class for chip preview
- `VECTOR_BASE_OPTIONS`, `VECTOR_LANE_OPTIONS`

## Custom hooks (`src/hooks/`)

### `useFloatingPanel({ defaultWidth, defaultHeight, minWidth, minHeight })`
Returns:

```js
{
  panelRef,            // attach to the panel root
  panelStyle,          // inline style with width/height/left/top
  size, pos,           // current measurements
  onHeaderMouseDown,   // attach to the drag handle
  onResizeMouseDown,   // attach to the resize affordance
}
```

Behaviour:

- Auto-centres in the parent on first mount.
- Drag is suppressed when the click originates from a `<button>`, `<input>`, `<select>`, or `<textarea>`.
- Both move and resize are clamped to the parent rectangle.

## Utilities (`src/lib/`)

### `viewPrefs.js`
- `VIEW_PREFS_KEY = 'sieve-visualizer:view-preferences:v1'`
- `DEFAULT_EVENT_TIME_TARGETS`, `DEFAULT_LAYOUT_SETTINGS`, `DEFAULT_EVENT_TITLE_SETTINGS`, `DEFAULT_DEPTH_SETTINGS`
- `readViewPrefs()` / `writeViewPrefs(prefs)`
- `mergeEventTimeTargets(saved)`, `mergeLayoutSettings(saved)`, `mergeEventTitleSettings(saved)`, `mergeDepthSettings(saved)`

Each `merge*` helper reconciles persisted partials against the current defaults, so older snapshots remain valid after schema additions.

### `traceHeader.js`
- `buildTraceInfoSections(header, fileName)` → `Array<{ title, rows: Array<{ label, value }> }>`

Normalises heterogeneous header/info-line data into File / Run / Settings / Notes sections, deduplicates keys, and pretty-labels common fields.

### `platform.js`
- `detectIsMac()`, `detectIsWindows()`, `detectIsElectron()` — user-agent based detection used to gate platform-specific UI affordances (e.g. the macOS traffic-light gutter in the Electron toolbar).

### `unitConverters.js`
- `playbackSpeedToPercent(speedValue)` / `percentToPlaybackSpeed(pctValue)` — log-scale slider mapping for playback speed.
- `stepSpeedToInterval(speedValue)` / `intervalToStepSpeed(intervalValue)` — frame interval mapping for step-by-step mode.

## Rendering & parsing

### `SieveRenderer.js`
Class encapsulating canvas 2D rendering: layout calculation, bit cell drawing, overlays (primes/range/multiples/heatmap), and animation effects. Owned by `Visualizer` outside the React tree to avoid re-render cost during playback.

### `Camera3D.js`
CSS-3D perspective camera used when 3D mode is enabled. Translates pointer events into rotation/translation transforms applied to the canvas container.

### `traceParser.js`
Multi-format trace ingestion. Supports JSON (v2/v3+), `STEP …` text traces, raw memory dumps, and minimal log-line traces emitted by `sieve_classic8`. Always returns the same normalized shape: `{ header, events, primes, … }`.

## Styles (`src/styles/`)

CSS is split per concern. `index.css` is the barrel imported by `main.jsx` and `@imports` numbered files:

| File | Purpose |
| --- | --- |
| 01-theme.css | CSS variables, theme tokens |
| 02-base.css | Reset & base typography |
| 03-welcome.css | File picker / welcome screen |
| 04-toolbar.css | Top toolbar, search, trace info popover |
| 05-layout.css | App-level main layout |
| 06-step-panel.css | Left-hand step list |
| 07-canvas.css | Canvas area, hover balloons, animations |
| 08-detail-panel.css | Right-hand detail panel |
| 08b-detail-compact.css | DetailPanel compact section variants |
| 09-export-progress.css | Video export overlay |
| 10-settings.css | Settings sidebar |
| 11-scrollbar.css | Custom scrollbars |
| 12-responsive-base.css | Breakpoints (base) |
| 13-bit-history.css | Bit history popover |
| 14-step-panel-collapsible.css | Collapsible step panel state |
| 15-layout-overview.css | Unified layout overview UI |
| 16-settings-extras.css | Settings hints / layout descriptions |
| 17-misc.css | Heat-map button, bar chart, table, badges |
