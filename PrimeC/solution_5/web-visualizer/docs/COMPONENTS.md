# Components Reference

A quick reference for the React components and modules under `src/`. Prop signatures reflect the current source; consult the file for full detail.

## Top-level components

### `App.jsx`
Welcome screen and file picker. Loads either an uploaded file or a bundled sample, then renders `<Visualizer trace=... />`.

### `Visualizer.jsx`
Owns playback state, view preferences, and the canvas. Composes the toolbar, side panels, hover balloons, and overlays. Most of the application logic lives here; helpers have been extracted to `lib/`, `hooks/`, and `settings/`.

### `SettingsPanel.jsx`
Right-hand collapsible sidebar with tabs (~262 lines — now just a tab-row shell that delegates to focused sub-components):

| Tab | Component | Purpose |
| --- | --- | --- |
| Layout | `LayoutTab.jsx` | Bit/byte layout grid presets, vector grouping, spacing, overlays, cacheline, minimap, depth |
| Colors | `ColorsTab.jsx` | Theme toggle, canvas background colour pickers, grid opacity, colour preset, custom bit colours |
| Animation | `AnimationTab.jsx` | Ripple / fade / pulse / sequential reveal, bit-animation mode, playback speed, timing targets |
| Legend | `LegendTab.jsx` | Embedded `<LegendSections>` with float/dock affordances |

Active tab is driven by `activeTabRequest` (a counter-incremented object from `Visualizer`) so external code (e.g. the Animation gear-icon button) can switch tabs programmatically. Floating legend panel (draggable) is managed inline in `SettingsPanel` and shown/hidden via `legendFloating` state.

Key props (selection):

- `settings`, `onChange` — forwarded to `LayoutTab`
- `outlineSettings`, `onOutlineChange`
- `cachelineAnnotation`, `onCachelineAnnotationChange`
- `collapsed`, `onToggleCollapse`
- `isWindowsPlatform`
- `theme`, `onThemeChange`
- `canvasColors`, `onCanvasColorsChange`
- `bitAnimationMode`, `onBitAnimationModeChange`
- `activeTabRequest` — `{ tab: string }` object; incrementing ref triggers one-shot tab switch

### `StepPanel.jsx`
Left-hand list of trace steps with grouping, search, and a draggable resize handle. Calls back to the visualizer when the user selects a step.

When `panelCollapsed` is true the panel renders a floating "all events" widget (`.step-panel-floating-title`) instead of the full list. The widget contains the playback transport + timeline scrubber. Drop-zone gestures while dragging the widget:

- drop near the left window edge (≤ 80 px) → calls `onExpandPanelFromWidget` (expand the events panel and dismiss the widget)
- drop near the top of the window (≤ 60 px from top) → calls `onDockWidgetToTopBar` (hides the widget via `setAllEventsWidgetHidden(true)`; topbar transport controls re-appear automatically since `controlsHidden` is derived)

When `allEventsWidgetHidden` is true the widget is not rendered. The next `toggleStepsPanel` call resets `allEventsWidgetHidden` to `false` so the widget reliably reappears when the user collapses the panel again.

**Drag-to-collapse (expanded panel):** The `.step-panel-header-title-row` carries a `grab` cursor and a `mousedown` handler (`handleHeaderTitleDragStart`). Dragging rightward past 80 px (raw, pre-rubber-band) triggers a two-phase animated collapse: (1) the title springs back, (2) `.collapsing-out` is applied so the header and list sweep out via `@keyframes step-panel-sweep-out`, then `onToggleCollapse()` is called after 360 ms total. State: `headerDragX` (visual translate), `headerDragWillCollapse` (accent hint), `isCollapsingOut` (animation class).

### `DetailPanel.jsx`
Inspector for the currently selected step. Shows changed bits, factor, count of newly cleared bits, and contextual primes.

The panel is organised as a **horizontal grid of compact section cards** (using `detail-sections` / `detail-section-card` CSS classes), designed to expand horizontally without growing vertically. Key layout decisions:

- **Numbers marked & Bit ranges** — each shows at most 5 preview items with a `+N more ↗` hint that makes the inspect-button affordance obvious. Clicking opens the full searchable inspector.
- **Mask preview** — each bit cell is 8 px (down from 10 px) to keep the mask representation compact and readable without dominating the panel height.
- **Mask type** — derived from `step.maskWordBits` and `step.patternSlotCount` as `uint${wordBits}v${slotCount}` (e.g. `uint64v2`). Shown as a `block-tag` chip in the "Mask pattern & preview" section; `—` when no mask data is present.
- Neither the annotation section nor the mask section spans the full width (`detail-section-wide` removed); they flow alongside the other fact cards in the auto-fit grid.

### `TimingPanel.jsx`
Floating, draggable, resizable panel showing per-phase timings. Uses `useFloatingPanel` for drag/resize behaviour.

## Visualizer subcomponents (`src/visualizer/`)

### `Toolbar.jsx`
Top header bar: trace title, info popover trigger, playback transport (skip/step/play/pause/slider/counter), and the right-hand action cluster (search, zoom, 3D, heatmap, primes, timings, depth, PNG/video export, theme). Pure presentation — every interactive callback is supplied by the parent.

The topbar transport (`toolbar-center`) is hidden when `controlsHidden` is `true`. `controlsHidden` is a **derived value** in `Visualizer.jsx` (`stepsPanelCollapsed && !allEventsWidgetHidden`): it becomes `true` automatically whenever the floating all-events widget is visible, and `false` whenever the events panel is expanded or the widget is docked to the top bar. There is no manual toggle button — the events panel collapse/expand is the only affordance.

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
- drop onto the all-events floater (`.step-panel-floating-title`) → triggers widget join (calls `onJoinWidgets`)

The banner is forced visible on every fresh session via `mergeEventTitleSettings` so users always see it on startup.

### `JoinedEventsWidget.jsx`
Combined floating widget shown when `widgetsJoined = true` and the events panel is collapsed. Merges the all-events transport controls (play/pause, step navigation, timeline slider, speed) with the single-event content from `EventTitleBanner` (annotation heading, bits changed, nearby events, per-step sliders) into one draggable panel.

**Join trigger:** dragging either the all-events floater or the `EventTitleBanner` onto the other widget (within 40 px hit-padding) calls `joinWidgets()` in `Visualizer.jsx` which sets `widgetsJoined = true`. A `.merge-target` CSS ring highlights the target during drag.

**Split:** the ⊡ split button (`.joined-widget-split-btn`) sets `is-splitting` CSS class, plays a 320 ms `@keyframes joined-widget-split` (scale+fade-out) animation, then calls `onSplitWidgets`. The expand-panel (▼) button also splits first, then opens the events panel.

**Appear animation:** `@keyframes joined-widget-appear` (scale 0.88→1 + opacity 0→1, 280 ms) on mount.

**Auto-split on panel open:** `Visualizer.jsx` calls `setWidgetsJoined(false)` inside `toggleStepsPanel` and `revealCurrentStepInPanel` whenever the events panel is being expanded.

**Draggable:** drag from the header row updates position; on mouseup the offset is persisted to `eventTitleSettings.dragOffsetX/Y` so the banner re-appears at the correct position after splitting.

**CSS:** `src/styles/18-joined-widget.css` (imported via `index.css`).

### `DetailInspectorOverlay.jsx`
Modal table that lists every changed bit (or every multiple / every prime) for the current step. Pure presentation: takes `{ open, mode, query, onQueryChange, onClose, rows, filteredRows }` and renders the search-filtered list. The visualizer owns the data; the overlay just paints it.

### `StepAnimSliders.jsx`
The Mode / Timeline / Target / Speed slider cluster shown in both the floating event-title banner and the bottom detail panel. All values and callbacks (current step data, scrub progress, mode toggles, `computeEventDuration`, `playSpeedPercent`, …) are passed in as props; the component renders the rows and bubbles user interactions back.

**Timeline slider wipe animation** — when `delayPhaseMs` (non-null) is received, the slider's colored fill wipes out left-to-right over the delay duration using an internal RAF loop (`wipePositionRef` / `wipePosition` state). When `animationReplayPaused` is `true` while `delayPhaseMs` is set, the wipe freezes (pause-in-flight). When `delayPhaseMs` returns to `null` (user scrubs or delay completes), the wipe reverses smoothly back to 0 over ~200 ms. The visual track is implemented as custom HTML divs (`.step-focus-timeline-track`, `.step-focus-timeline-fill`, `.step-focus-timeline-wipe`) behind a transparent-track `appearance: none` range input.

### `BitHistoryBalloons.jsx`
Wraps the pinned-balloon list and the hover balloon. Asks the parent (`getVisibleBalloonStyles`) where each balloon should sit, then renders one `BitHistoryBalloon` per pinned bit and an extra one for the hovered bit (when the hovered bit isn't already pinned). Calls `onUnpin(bitIndex)` and `onHistoryClick(stepIndex)` for user actions.

## Settings building blocks (`src/settings/`)

### `LegendSections.jsx`
Default export: `LegendSections({ detailed = true, onAction })`. Pure JSX with the four legend groups (Bit states, Overlays, Animations, Interactions). Used both inside the Legend tab and inside the floating legend panel.

When `onAction` is provided, overlay and animation rows become interactive (`role="button"`, `.legend-row--actionable`). Known action keys: `'primeOverlay'`, `'rangeOverlay'`, `'multiplesOverlay'`, `'heatMap'` (all navigate to Layout tab), `'animRipple'`, `'animFade'`, `'animPulse'`, `'animSequential'` (navigate to Animation tab). `SettingsPanel` supplies a `legendActions` callback that executes the toggle and switches the active tab.

### `LegendTab.jsx`
Content for the Legend tab. Holds the float/dock toggle and passes `legendDetailed` + `floatPos` state back to `SettingsPanel` via setter callbacks. Accepts `onAction` and forwards it to `<LegendSections>`. No own data dependencies.

### `ColorsTab.jsx`
Content for the Colors tab (~156 lines). Owns two local `rgb↔hex` converters (`rgbToHex`, `hexToRgb`); everything else comes in as props:

- `gridOpacity`, `onGridOpacityChange`
- `colorPreset`, `onColorPresetChange`
- `customColors`, `onCustomColorsChange` — per-class `{ setBit, clearedBit, unchangedBit }` overrides
- `theme`, `onThemeChange`
- `canvasColors`, `onCanvasColorsChange` — `{ light: [r,g,b]|null, dark: [r,g,b]|null }`

Displays Theme buttons (☀ / ☽), day/night canvas-background colour pickers with Reset, grid opacity slider, colour preset dropdown, and custom per-class colour pickers.

### `AnimationTab.jsx`
Content for the Animation tab (~545 lines). Fully self-contained: recreates `clamp` / `playbackSpeedValue` locally. Accepts only props that already existed on `SettingsPanel`. Includes the Bit-animation mode toggle (`animMode`: Mask / Bits / Both).

### `LayoutTab.jsx`
Content for the Layout tab (~893 lines). "Fat prop list" extraction (~25 props). Owns its own UI state for the grouping menu, custom-preset menu, and spacing popovers, plus inner `LayoutOverview` and `SpacingControl` components. Internally uses `useSettingsBundle()` for the `(settings, onChange)` sub-set of props.

### `useSettingsBundle.js`
Tiny memoised hook that turns a `(settings, onChange)` pair into `{ s, set, setMany, incr, decr }`. Used by `LayoutTab` internally; not a public API. `set(key, value)` is a single-key delta; `setMany(partial)` merges multiple keys in one call; `incr`/`decr` are convenience wrappers.

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

### `useKeyboardShortcuts(handlers)`
Encapsulates the `keydown` global listener for single-key shortcuts (play/pause, step, seek, zoom, theme toggle, etc.). `handlers` is an object of named callbacks supplied by `Visualizer`. The effect registers/cleans up the listener and debounces repeated keys where appropriate.

### `usePlaybackClock()`
Returns the three mutable ref objects `{ seekGenRef, globalPausedRef, animBusyUntilRef }` that coordinate animation loops. Callers mutate `.current` directly — the hook is a structural wrapper that documents ownership. See §5 of `AI_MAINTENANCE.md` for the minefield notes on each ref.

### `use3DCamera({ onPanZoom })`
Owns Camera3D lifecycle: `camera3DRef`, `camera3DTransform`, `camera3DContainerStyle`, `ensureTiltCamera`, `createCamera({ onPanZoom })`, `disposeCamera()`. Returns those values for consumption in `Visualizer`. The pointer/wheel/touch gesture dispatcher remains in `Visualizer.jsx`; the gesture bodies are in `src/visualizer/gestures/`.

### `useTraceExport({ canvasRef, rendererRef, trace, … })`
Encapsulates PNG snapshot (`exportPng`) and WebM video recording (`exportVideo`). Documents the public renderer surface it touches (the 7-argument `setState`, `render`, `canvas`, `currentOperation`). Returns `{ exportPng, exportVideo, exportProgress, isExporting }`.

### `useDraftInput(value, onCommit)`
Manages the "draft text + commit on blur/Enter" pattern for controlled inputs. Returns `[draft, setDraft, inputProps]`. Used in `SettingsPanel` for range start/end and multiples-prime fields.

## Utilities (`src/lib/`)

### `viewPrefs.js`
- `VIEW_PREFS_KEY = 'sieve-visualizer:view-preferences:v1'`
- `DEFAULT_EVENT_TIME_TARGETS`, `DEFAULT_LAYOUT_SETTINGS`, `DEFAULT_EVENT_TITLE_SETTINGS`, `DEFAULT_DEPTH_SETTINGS`, `DEFAULT_CANVAS_COLORS`, `DEFAULT_COLOR_PREFS`
- `readViewPrefs()` / `writeViewPrefs(prefs)`
- `mergeEventTimeTargets(saved)`, `mergeLayoutSettings(saved)`, `mergeEventTitleSettings(saved)`, `mergeDepthSettings(saved)`
- `getInitialViewState()` — reads storage once and resolves every persisted UI field (with clamping and legacy-`repeatAnim` migration) into a flat bundle. Called via `useMemo` in `Visualizer.jsx` to seed all `useState` calls.

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
- **`VisualizationRenderer.js`** — documentation-as-code contract (abstract base) for any renderer mode. Defines the `setState(…)` / `render()` / `canvas` surface. See §4 of `AI_MAINTENANCE.md`.

### Overlays (`src/renderer/overlays/`)

Each overlay is a pure class with a `render(ctx, cw, ch)` method that reads the state it needs through host-accessor references. No own state. `SieveRenderer` holds one instance of each and calls them from the main draw coordinator.

| File | What it draws |
| --- | --- |
| `SearchOverlay.js` | Highlighted search-target bit outline |
| `MaskWriteOverlay.js` | Mask write-order labels and cell tints |
| `VectorTouchOrderOverlay.js` | Vector touch-order summary labels |
| `CachelineAnnotationsOverlay.js` | Cacheline heat-map tints + outline strokes |

### WebGL backend (`src/renderer/gl/`)

The unconditional production bit-fill backend. `Visualizer.jsx` always constructs `BitGridGLWorker`; if attach fails, `SieveRenderer.skipBitFill` stays `false` and Canvas2D handles everything.

| File | Role |
| --- | --- |
| `bitGridGLCore.js` | Pure WebGL2 substrate — shaders, `posTex` (RG32F), `stateTex` (R8UI), instanced draw; accepts `HTMLCanvasElement` or `OffscreenCanvas` |
| `hostStatePacker.js` | Pure functions `packPositions(host, buf, slots)` / `packState(host, buf, slots)`; used by both direct and worker facades |
| `bitGridWorker.js` | Module worker — owns a `BitGridGLCore` against a transferred `OffscreenCanvas` |
| `BitGridGLWorker.js` | Main-thread facade matching `BitGridGL`'s API; posts pre-packed `Float32Array`/`Uint8Array` buffers as transferables (one-way, no ack) |
| `BitGridGL.js` | Direct-mode facade over `bitGridGLCore` + `hostStatePacker`; **dev-only** (used by `parity.html` harness, not in the production runtime) |

**State texture protocol:** one `R8UI` byte per bit, packed flags `set | changed | ghost | repeated | prime | range | multiples | focus`. Full repack every frame; partial `texSubImage2D` updates are a future optimisation (see backlog).

**Context loss:** handled in direct mode only. Worker path does not yet implement `webglcontextlost` / `webglcontextrestored` recovery — see backlog.

### Workers (`src/renderer/workers/`)

| File | Role |
| --- | --- |
| `bitPrePass.worker.js` | Spawned once; computes `buildPrimeOverlay(sieveSize, bitCount, storageModel)` and posts back a `Uint8Array` of per-bit prime flags |
| `bitPrePassClient.js` | Main-thread client; fire-and-forget with stale-reply guard; renderer keeps synchronous fallback if worker is unavailable |

### Gesture helpers (`src/visualizer/gestures/`)

Pure functions extracted from the pointer/wheel/touch `useEffect` in `Visualizer.jsx`. Each takes `{ renderer, event, …host }` and returns nothing (or `{ startX, startY }` for the delta-gesture rotate path). The dispatcher state machine, pointer-event registration, hover handling, click handling, and minimap hit-test remain inline in the useEffect.

| File | Gesture |
| --- | --- |
| `pan.js` | 2D pan (single pointer drag) |
| `rotate.js` | 3D mouse-rotate (secondary button / alt-drag) — returns `{ startX, startY }` |
| `wheel.js` | Wheel / pinch-zoom |

**Note:** No `pinch.js` exists — add one only when a pinch handler is introduced.

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
