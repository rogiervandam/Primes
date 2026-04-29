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

When `panelCollapsed` is true the panel renders a floating "all events" widget (`.step-panel-floating-title`) instead of the full list. The widget contains the playback transport + timeline scrubber. Drop-zone gestures while dragging the widget:

- drop near the left window edge (≤ 80 px) → calls `onExpandPanelFromWidget` (expand the events panel and dismiss the widget)
- drop near the top of the window (≤ 60 px from top) → calls `onDockWidgetToTopBar` (set `controlsHidden = false` and hide the widget; toolbar then shows a ▼ "Show widget" button)

When `allEventsWidgetHidden` is true the widget is not rendered (the down-arrow toolbar button brings it back).

### `DetailPanel.jsx`
Inspector for the currently selected step. Shows changed bits, factor, count of newly cleared bits, and contextual primes.

### `TimingPanel.jsx`
Floating, draggable, resizable panel showing per-phase timings. Uses `useFloatingPanel` for drag/resize behaviour.

## Visualizer subcomponents (`src/visualizer/`)

### `Toolbar.jsx`
Top header bar: trace title, info popover trigger, playback transport (skip/step/play/pause/slider/counter), and the right-hand action cluster (search, zoom, 3D, heatmap, primes, timings, depth, PNG/video export, theme). Pure presentation — every interactive callback is supplied by the parent.

When the events panel is collapsed and the user has dragged the all-events widget onto the top bar (`allEventsWidgetHidden`), an extra ▼ icon button (`.toolbar-show-events-widget`) appears in the left section to bring the widget back.

### `TraceInfoPopover.jsx`
Popover anchored beneath the trace title showing the storage-model selector and the parsed `traceInfoSections` (file/run/settings/notes). Used by `Toolbar`.

### `ExportProgress.jsx`
Slim progress bar shown beneath the toolbar while `MediaRecorder` is exporting a WebM. Just renders `width: ${progress}%`.

### `BitHistoryBalloon.jsx`
Floating popover showing a bit's identity (number, byte, word, qword, cache line) and modification history. Used in two modes:

- `pinned` → click-locked balloons with close button and 📌 marker
- hover    → ephemeral balloon following the mouse with a click-to-lock hint

### `EventTitleBanner.jsx`
Draggable "current event" banner over the canvas with the active step heading, the previous/next two events, and any per-step animation sliders. Drag is implemented inline so the same gesture can act as a click-to-open-events-panel affordance.

Drop-zone gestures while dragging:

- drop near the left window edge → expands the events panel and hides the banner (banner can be re-shown via the ▲ button on the bottom DetailPanel)
- drop onto the detail panel → expands the detail panel (if collapsed) and hides the banner
- drop near the bottom edge of the window → hides the banner (same as the ▼ close button)

The banner is forced visible on every fresh session via `mergeEventTitleSettings` so users always see it on startup.

### `DetailInspectorOverlay.jsx`
Modal table that lists every changed bit (or every multiple / every prime) for the current step. Pure presentation: takes `{ open, mode, query, onQueryChange, onClose, rows, filteredRows }` and renders the search-filtered list. The visualizer owns the data; the overlay just paints it.

### `StepAnimSliders.jsx`
The Mode / Timeline / Target / Speed slider cluster shown in both the floating event-title banner and the bottom detail panel. All values and callbacks (current step data, scrub progress, mode toggles, `computeEventDuration`, `playSpeedPercent`, …) are passed in as props; the component renders the rows and bubbles user interactions back.

### `BitHistoryBalloons.jsx`
Wraps the pinned-balloon list and the hover balloon. Asks the parent (`getVisibleBalloonStyles`) where each balloon should sit, then renders one `BitHistoryBalloon` per pinned bit and an extra one for the hovered bit (when the hovered bit isn't already pinned). Calls `onUnpin(bitIndex)` and `onHistoryClick(stepIndex)` for user actions.

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

### `animationTiming.js`
Pure timing math used by `Visualizer`'s playback engine (no React, no refs):

- `clampMs(value, min, max)` — clamp helper.
- `progressiveTierShares(c)` — split a bit count into the 10 / 100 / rest tiers used by progressive reveals.
- `bitsAtTimeRatio(timeRatio, bitCount, mode)` — how many bits should be visible at a given fraction of the event window.
- `timeRatioAtBitIndex(bitIdx, bitCount, mode)` — inverse of `bitsAtTimeRatio` (used to seed virtual elapsed time on resume).
- `computeEventNormalDuration(bitCount, targets)` — base 100 %-speed duration from the configurable tier table.
- `computeEventDuration(bitCount, targets, speedPercent)` — applies the speed slider to the normal duration.
- `getFadeOutDuration(bitCount, options)` — residual-highlight fade-out duration.

## Trace-parser building blocks (`src/parser/`)

These are pure modules consumed by `traceParser.js`. They have no React dependencies and can be unit-tested in isolation.

- **`parseUtils.js`** — alias tables (`START_ALIASES`, `STOP_ALIASES`, `EVENT_INDEX_ALIASES`, `FACTOR_STEP_ALIASES`), generic `firstDefined` / `toNumberOr` / `toNullableNumber`, `parseKvLine`, alias lookup helpers (`firstAliasValue`, `firstExactAliasValue`), `parseChangedBits`, `parseIntegerList`, `sanitizeOperationToken`, `dedupeStrings`, `collectTitleInfo`, `normalizeBitCountForStorage`, `isAnalysisEndLine`, plus the `TRACE_FALLBACK_VERSION` constant.
- **`primeInference.js`** — best-effort prime extraction from text annotations: `parsePrimeFromText`, `firstAliasNumberInText`, `firstFactorStepNumberInText`, `inferPrimeFromFactorStep`, `inferPrimeFromAnnotation`, `inferMissingPrimes`.
- **`maskMetadata.js`** — derives per-bit mask metadata from change lists: `buildMaskTargets`, `buildOrderedMaskTargets`, `buildMaskWriteOrder`, `inferMetaFromAnnotation`, `inferOperationFromAnnotation`, `deriveMaskMeta`, `derivePatternMeta`.
- **`headerParser.js`** — `extractTitleMetadata`, `extractBenchmarkMetadata`, `parseBenchmarkOutputLine`, `buildTracePresentation` for normalising the trace header into the display shape consumed by `Visualizer`.
- **`dumpParser.js`** — `parseDump` converts hex/binary memory dumps to the standard event sequence.

## Renderer building blocks (`src/renderer/`)

Modules consumed by `SieveRenderer.js`. No DOM-mutating side effects beyond the canvas calls passed in by the renderer.

- **`constants.js`** — `THEMES`, `COLOR_PRESETS`, `BIT_LAYOUTS`, `BYTE_LAYOUTS`, `VECTOR_GROUPS`, `CACHELINE_SIZES`, `CACHE_PRESETS`, `GRID3X3_MAP`, `STORAGE_MODELS`, `WHEEL30_RESIDUES`.
- **`bitMath.js`** — `bitToNumber(bitIdx, model)` / `numberToBit(num, model)` for the supported storage models (`'odd'`, `'all'`, `'wheel30'`).
- **`drawingHelpers.js`** — pure colour and text helpers reused by the renderer's draw passes: `hexToRgb`, `mixRgb`, `labelTextColor`, `fitLabelFontSize`, `truncateTextToWidth`, `drawFittedLabel`.

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
