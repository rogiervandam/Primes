# AI Maintenance Guide

Read this first before changing the web visualizer. This document is for 
agents and maintainers who need to keep the project healthy without redoing old
work or breaking subtle runtime contracts.

For broader maps, also read:

- `docs/ARCHITECTURE.md` for module ownership and data flow.
- `docs/COMPONENTS.md` for component boundaries and prop surfaces.
- `docs/BACKLOG.md` for short-term product ideas from the user.

## Agent Startup Checklist

1. Work from `web-visualizer/` for npm commands.
2. Before touching code, inspect the nearby files and grep for existing helpers.
3. Treat `Visualizer.jsx` and `SieveRenderer.js` as high-risk files. Prefer small
   extractions, pure helpers, and existing patterns.
4. Run `npm run test` and `npm run build` after code changes. For docs-only
   edits, `git diff --check` is usually enough.
5. For visual, layout, canvas, or WebGL changes, also do a manual browser check.
   Use `npm run dev`, load a trace, and exercise playback, scrubbing, panel
   toggles, minimap, widget dragging, and the parity harness when GL is touched.
  Always open the browser DevTools console after these checks and confirm
  there are no runtime errors (ReferenceError/TypeError/plugin parse errors)
  before considering the change done.
6. Do not change persisted preference keys without migration. Add keys; do not
   repurpose existing keys.
7. Update existing docs when behavior changes. Avoid creating new docs unless
   explicitly requested.
8. For container trace ingestion, keep `bin/docker-import.mjs` generic to any
  Dockerized producer. Prefer explicit `--container-log-dir` first, then labels,
  env vars, working-directory `log`, and common paths.
9. This repository hosts many language solutions. Keep commits path-scoped to the
  task area and avoid carrying unrelated changes from sibling solutions.

## Where Code Belongs

| Adding or changing                                              | Put it in                                                       |
| --------------------------------------------------------------- | --------------------------------------------------------------- |
| Pure math, formatting, storage helpers                          | `src/lib/`                                                      |
| Reusable React state/effect logic                               | `src/hooks/`                                                    |
| Trace-format parsing                                            | `src/parser/`, then import through `src/traceParser.js`         |
| Renderer constants, drawing helpers, renderer-only pure helpers | `src/renderer/`                                                 |
| Canvas overlay classes                                          | `src/renderer/overlays/`                                        |
| WebGL bit-fill backend                                          | `src/renderer/gl/`                                              |
| Settings tab content or controls                                | `src/settings/`                                                 |
| Toolbar, canvas-stage widgets, floating visualizer UI           | `src/visualizer/`                                               |
| Styles                                                          | `src/styles/NN-name.css`, then import in `src/styles/index.css` |

## Golden Contracts

- Hooks in `Visualizer.jsx` may depend on callbacks declared later through lazy
  closure timing. When extracting, place hook calls after required callbacks and
  before JSX usage.
- Keep the renderer `setState(...)` positional signature backward-compatible.
  `useTraceExport.js` and playback code depend on it.
- `viewPrefs` writes to `localStorage` key
  `sieve-visualizer:view-preferences:v1`. Use defaults and `merge*` helpers in
  `src/lib/viewPrefs.js` for every persisted field. Existing keys: `isAutoAnimateOnSelect` (bool, default true) controls whether clicking an event auto-starts the animation loop; persisted via `getInitialViewState` / `writeViewPrefs`.
- `isAutoAnimateOnSelectRef` is passed to `usePlaybackLoop`; Effect 1 (selected-step auto-replay loop) checks it before starting and includes `isAutoAnimateOnSelect` in its dep array so it tears down immediately when the toggle is switched off.
- `bitStateRef` and `bitStateDirtyRef` must stay in sync. Any scrub-back or jump
  that invalidates cumulative bit state must mark dirty or restore from a
  snapshot.
- `seekGenRef`, `globalPausedRef`, and `animBusyUntilRef` are playback
  coordination refs. New animation paths must respect all three.
- `captureStream` only works on a visible canvas. Keep the visibility guard in
  `useTraceExport.js`.
- 3D mode mutates renderer pan/zoom through `Camera3D`; gesture handlers must
  keep the renderer and camera projection aligned.
- Panel toggle pan compensation depends on `pendingResizeAnchorRef` being
  captured before state changes and consumed exactly once by the immediate
  resize pass.
- Do not define React components inside `LayoutTab` and render them as
  `<InlineComponent />`. That remounts controls every animation frame and breaks
  clicks. Use module-level components or direct function calls.
- Do not call `glRendererRef.current.dispose()` from a React cleanup effect.
  `OffscreenCanvas.transferControlToOffscreen()` is one-shot; StrictMode cleanup
  would kill the worker while the canvas cannot be transferred again.
- The log API is shared by the Vite plugin and Electron via `log-api-utils.mjs`.
  Keep route behavior aligned across both servers: list, read, raw upload,
  pending-upload poll, and ack.
- Uploaded traces are written into the local log directory and queued for a UI
  prompt. `App.jsx` owns the prompt and must ack every user decision so repeated
  polling does not reopen the same prompt.

## Important Maintenance Goals

Each goal lists what is already stable enough to remember, then the remaining
work agents should prefer when choosing a session scope.

### 1. Keep Reducing `Visualizer.jsx`


### 2. Keep Reducing `SieveRenderer.js`

### 3. Keep WebGL Worker Rendering Reliable

### 4. Preserve Playback And Animation Correctness

### 5. Expand Tests And Visual QA

Done: Vitest covers pure parser, math, timing, view-preference, unit-converter,
and drawing-helper modules. Tests are Node-based and avoid DOM dependencies.
New renderer unit tests added alongside the latest extraction pass:
- `src/renderer/__tests__/transforms.test.js` — `bitIndexToCanvas`/`canvasToBitIndex`
  round-trip, pan offset, boundary and out-of-range cases.
- `src/renderer/__tests__/geometry.test.js` — `bitVisualRow`, `multiBitBounds`,
  `multiBitBoundsSegments`, `getElementBounds` for all element types.
- `src/renderer/__tests__/maskMetadata.test.js` — all six `maskMetadata` exports;
  slot grouping, duplicate deduplication, out-of-range filtering.
- `src/renderer/__tests__/overlayIndicators.test.js` — `drawBitOverlayIndicator`
  null guard, dot radius clamping, all three anchor positions, label threshold/max,
  independent `labelAnchor`.
Mock pattern: pass a plain duck-typed `host` object; no `SieveRenderer` instance needed.

Left to do:

- Add a Playwright smoke test that loads a trace, plays for a few seconds,
  scrubs, toggles major panels, and fails on console errors.
- Add a small visual or pixel test path for the GL parity harness in CI if the
  environment supports browser APIs.
- Add tests around `viewPrefs` localStorage read/write and migration behavior
  if a jsdom/browser test layer is introduced.
- For every refactor out of `Visualizer.jsx` or `SieveRenderer.js`, add unit
  tests only when pure logic is extracted or the risk justifies it.

### 6. Maintain Performance At Large Trace Sizes

Done: initial bundle is lazy-loaded; prime pre-pass uses a worker; backward scrub
uses periodic `bitState` snapshots; rapid range slider updates use
`startTransition`. Grid opacity slider `startTransition` wrapper removed — the
slider must be responsive during animation, not deferred.

Left to do:

- Profile traces above 100k bits and above 1000 events before adding complexity.
- Measure whether snapshot memory needs a cap at very large bit counts.
- Profile whether full GL state repacks are visible in frame time before adding
  dirty-region texture uploads.
- Keep the debug-tools performance metrics accurate if render scheduling
  changes.

### 7. Keep Backlog Documentation Current And Short

Done: architecture and component docs describe current major modules; this guide
now summarizes completed work instead of keeping every session log inline.

Left to do:

- When a task completes, update the relevant goal's "Done" and remove or shrink
  the matching "Left to do" item.
- Keep `ARCHITECTURE.md`, `COMPONENTS.md`, and this file consistent. If they
  disagree, inspect source before trusting any doc.
  - Keep architecture content in one place (`docs/ARCHITECTURE.md`) to avoid
    drift across duplicate files.
  - Remove unimported or historical files when their value is gone. Done:
    `src/settings/TitleTab.jsx` was deleted.

The old guide contained a long session-by-session log. These are the durable
facts that still matter:

- Settings are split into `LayoutTab`, `ColorsTab`, `AnimationTab`, and
  `LegendTab`; `SettingsPanel` is mostly a shell plus floating legend state.
- Renderer overlays already extracted: `SearchOverlay`, `MaskWriteOverlay`,
  `VectorTouchOrderOverlay`, `CachelineAnnotationsOverlay`, and
  `MinimapRenderer`.
- Visualizer hooks already extracted: `useTraceExport`, `useDraftInput`,
  `useKeyboardShortcuts`, `usePlaybackClock`, `use3DCamera`,
  `usePlaybackLoop`, `useSearchState`, `usePanelChoreography`,
  `useRawSource`, `useCanvasRefs`, `useDebugTools`, `useThemeAndColors`,
  `useAnimationConfig`, `useStepAnimation`, `useOverlays`, `useIntroSequence`,
  `useWidgetState`, `usePanelState`, `useBalloonLayout`, `useBitState`,
  and `useViewportAnchoring`.
- Events terminology replaced the old StepPanel naming. `viewPrefs` migrates
  the legacy `stepsPanelCollapsed` key.
- GL worker mode is the production bit-fill path. Canvas2D cell-fill code and
  `SieveRenderer.skipBitFill` are gone.
- The direct `BitGridGL.js` facade is gone; the parity harness drives the worker
  path.
- The minimap is a fixed viewport-level overlay so it can stay visible above
  panels.
- `willReadFrequently: true` was removed from production Canvas2D contexts
  because it hurt Safari performance and production does not call `getImageData`
  on those canvases.
- `backface-visibility: hidden` and `will-change: transform` were both removed
  from `.settled-render-canvas` / `.main-render-canvas`. Root cause of Safari
  black-flash flicker: `will-change: transform` pre-allocates a GPU backing
  store per canvas; when canvas drawing APIs upload new pixels Safari briefly
  shows the old/empty store as black. CSS `rotateX/Y` tilt works without the
  hint — Safari auto-composites 3D-transformed elements. `backface-visibility:
  hidden` had the same layer-promotion side-effect and was also removed.
- `transformStyle: 'preserve-3d'` was removed from the inline
  `renderCanvasStyle` in `Visualizer.jsx`. Canvas elements have no 3D children
  so this created an extra 3D compositing context per canvas in Safari that
  amplified the flicker. The container's CSS `transform-style: preserve-3d`
  (from `.canvas-container.mode-3d`) is sufficient for tilt rendering.
- `transform-style: preserve-3d` was moved from the base `.canvas-container`
  rule to `.canvas-container.mode-3d` only (note: `mode3D = true` always in
  current code, so this is future-proofing only).
- **Safari black canvas flicker — root cause and definitive fix:** Safari
  (WebKit) treats an `OffscreenCanvas` controlled by a Web Worker as its own
  GPU compositing layer managed by the Metal compositor. During animation and
  drag, Safari's compositor reads the GL canvas asynchronously and can do so
  between the worker's `gl.clear(bgColor)` and the instanced-quad draw call,
  briefly exposing the opaque clear color as a black flash. `preserveDrawingBuffer:
  true` does not prevent this because the race is at the GPU compositor level,
  not within a single frame's buffer lifetime. CSS approaches (`will-change`,
  `backface-visibility`, `transform-style`, wrapper divs) did not eliminate
  the race either — they only changed how Safari grouped layers.

  **Definitive fix (`BitGridGLWorker.js`):** On Safari, `attach()` detects the
  browser via `isSafari()` (UA regex that excludes Chrome, Android, CrIOS, FxIOS)
  and skips `transferControlToOffscreen()` and the Web Worker entirely. Instead
  it creates a `BitGridGLCore` instance directly on the main thread and calls its
  public API synchronously. With GL and Canvas2D on the same compositing tick, the
  compositor reads all three canvases atomically and the black flash disappears.
  Key implementation details:
  - `isSafari()` helper at module top; `BitGridGLWorker` adds `_direct = false`
    and `_core = null` constructor fields.
  - `attach()`: if Safari (or `!isWorkerGLSupported()`), creates `new BitGridGLCore()`,
    calls `core.init(canvas)`, sets `_core`, `_direct = true`, `_ready = true`,
    and returns early — no OffscreenCanvas transfer, no worker spawned.
  - `resize()`, `render()`, `resizeForBitCount()`, `uploadPositions()`,
    `uploadState()`, `uploadAnim()`: all check `if (this._direct)` first and
    call the equivalent `_core.*` method directly, then `return`.
  - `capture()`: in direct mode, calls `this._core.gl.flush()` then
    `canvas.transferToImageBitmap()` if available; otherwise returns an error.
  - `dispose()`: in direct mode, calls `this._core.dispose()` and nulls all
    fields; the worker branch is skipped.
  - Non-Safari browsers without OffscreenCanvas also fall into the direct path
    (the `|| !isWorkerGLSupported()` condition), so they also benefit.
- **Safari canvas wrapper div (structural, retained):** The three canvas elements
  are wrapped in a `<div className="canvas-transform-wrapper">` inside
  `.canvas-container`. The 3D CSS transform (`translate(-50%,-50%) rotateX/Y`)
  is applied only to this wrapper div; the canvas elements inside are flat. This
  avoids Safari creating one GPU compositing layer per transformed canvas element.
  Key details:
  - `wrapperCanvasRef` (a new `useRef`) is defined in `Visualizer.jsx` and
    passed to `CanvasStage` as a prop.
  - `renderCanvasStyle` is applied to the wrapper div, not to the canvas elements.
  - `apply()` inside the position-tracking `useEffect` updates
    `wrapperCanvasRef.current.style.left/top` instead of the three individual
    canvas elements.
  - `refreshCanvasLayout()` sets the wrapper's `style.width/height` to
    `canvasW × canvasH` after `r.resize()` so that `translate(-50%,-50%)`
    computes the correct pixel shift.
  - The GL canvas uses `inset: 0` in CSS — it fills the wrapper, fixing a
    pre-existing sizing discrepancy.
  - `getCanvasPlaneMetrics()` reads `canvasEl.style.left` (NaN after the change)
    and falls back to `canvasAnchorPx?.left` — the correct value. No breakage.
  - `getProjectedCanvasMapper(canvasEl)` uses `canvasEl.getBoxQuads()`, which
    returns projected coordinates including ancestor transforms, so 3D hit-testing
    remains correct.
- `EventTitleBanner` drag now uses direct DOM mutation (`bannerRef.current.style
  .transform`) during the gesture instead of calling `setSettings` on every
  `mousemove`. This avoids the React re-render cascade (setSettings → parent
  useMemo → style prop) that caused the CSS `transition: transform 180ms` to
  restart continuously in Safari, making the widget shake. State is persisted
  once on `mouseup`. CSS class `.is-dragging` suppresses all transitions while
  a drag is in progress.
- Color presets, canvas background customization, clickable legend rows,
  keyboard help, debug-tools performance window, copy-event buttons, collapsed
  group count badges, and joined widgets are implemented.
- The current test suite is meaningful. Do not describe build as the only safety
  net anymore.

### 15. `Visualizer.jsx` Component Split (Completed)

Goal was to reduce `src/Visualizer.jsx` size and risk by moving state domains
into focused hooks and extracting trivial JSX fragments into small components.

**Completed (all phases merged):**

New hooks in `src/hooks/` (all called from Visualizer.jsx):
- `useRawSource` — raw source loading, `lineToStep`/`stepToLine` memos
- `useCanvasRefs` — all canvas/renderer/GL refs + CSS-lock refs
- `useDebugTools` — GL debug state, refs, `updateGlDebugInfo` callback
- `useThemeAndColors` — theme, gridOpacity, canvasColors, colorPreset, customColors
- `useAnimationConfig` — animMode/Style, delays, event time targets, speed values, cycle helpers
- `useStepAnimation` — bitAnimationMode, scrub progress, loop refs, `handleBitAnimationModeChange`
- `usePlaybackClock` — seekGenRef / globalPausedRef / animBusyUntilRef (already existed)
- `useOverlays` — heatMap, primeOverlay, rangeOverlay, multiplesOverlay, cacheline
- `useIntroSequence` — introPhase, loadingOverlayPhase, topbar playback-ready effect
- `useWidgetState` — widget visibility, timing panel, detail inspector state
- `usePanelState` — panel visibility/dimensions, settingsActiveTab, panel-restore effects
- `useBalloonLayout` — pinnedBitIndices, hoveredBitInfo, `scheduleBalloonRelayout`
- `useBitState` — bitStateRef, bitStateCheckpointsRef, bitStateDirtyRef, selectedSteps
- `useViewportAnchoring` — canvasAnchorPx, pendingResizeAnchorRef, layout-refresh refs

New components in `src/visualizer/`:
- `CanvasLoadingOverlay` — streaming-load progress bar
- `StatusBanners` — GL-unavailable banner + export-error banner

Result: `Visualizer.jsx` reduced from ~5760 to ~5420 lines. Core playback,
renderer lifecycle, animation engine, and canvas gesture handling remain in
`Visualizer.jsx` as they require access to many refs and callbacks at once.

Maintenance rules going forward:

- Feature-local state that doesn't need renderer/playback refs → new hook in `src/hooks/`.
- Simple conditional JSX (status banners, overlays) → new component in `src/visualizer/`.
- Keep renderer and playback authority in `Visualizer.jsx`.
- Keep persisted preference writes centralized through existing `viewPrefs` paths.
- Each change must pass `npm run build` and `npm test`.

## Topic Backlog

Use this as overflow for work that does not fit cleanly under one goal yet.

#### Hook Refactor Template

Use this template whenever refactoring a high-parameter hook:

1. Define grouped input shape:
   - `*Config`: static options and feature flags
   - `*State`: reactive values used in dependency logic
   - `*Refs`: mutable refs and bridges
   - `*Handlers`: callbacks/setters passed into lower-level effects
2. Keep backward compatibility during migration:
   - Accept grouped shape first.
   - Fallback to legacy flat props only for incremental rollout.
3. Migrate call sites incrementally:
   - Parent call site first.
   - Internal sub-hooks second.
   - Child boundaries third.
4. Verify after each slice:
   - `npm test`
   - `npm run build`
   - Manual smoke: play/pause/scrub, panel toggles, joined widget flows.
5. Remove fallback only when all call sites are grouped and stable.

Skeleton:

```js
function useExamplePipeline(input) {
  const config = input.exampleConfig || {
    mode: input.mode,
    style: input.style,
  };
  const state = input.exampleState || {
    currentStep: input.currentStep,
    playing: input.playing,
  };
  const refs = input.exampleRefs || {
    rendererRef: input.rendererRef,
    seekGenRef: input.seekGenRef,
  };
  const handlers = input.exampleHandlers || {
    setPlaying: input.setPlaying,
    setCurrentStep: input.setCurrentStep,
  };

  // Hook logic uses config/state/refs/handlers only.
}
```

#### Cumulative Refactor Impact (Phases 1-5)

- Phase 1 complete: organized semantic state domains added in `Visualizer.jsx`
  without behavior changes.
- Phase 2 complete: grouped child contracts are now the default across the
  major Visualizer component tree, including top-level and secondary boundaries.
- Phase 3 complete: high-parameter hook call sites consolidated (`useAnimationPipeline`,
  `useRendererPipeline`, `usePlaybackLoop`, `usePanelChoreography`).
- Phase 4 complete: internal sub-hook contracts and temporal dependency cleanup.
- Phase 5 complete for the planned component-propagation scope, including
  secondary boundaries (`CanvasOverlayManager`, `JoinedEventsWidget`) and the
  fallback-removal cleanup pass.

### Product Polish

- Add two delightful improvements after the current panel/widget work. Favor
  small, inspectable interactions over large new modes.
- Add more backlog ideas as the product shape becomes clearer.
- Consider a command/search palette only if shortcuts and toolbar density become
  hard to discover.

### Rendering

- Decide whether target outlines, ghost highlights, motion trails, cacheline
  heat/outline, and overlay dots/labels should remain Canvas2D forever or move
  to GL in measured steps.
- Expand the debug tools window with GL-worker status, bit count, upload sizes,
  or context-loss state if those diagnostics become useful.
- Automate parity harness checks if browser CI becomes available.

### UX Layout

- Keep all floating widgets within viewport and panel insets on macOS, Windows,
  Electron, and browser.
- Re-check minimap, bit balloons, joined widget, settings sidebar, and detail
  panel z-index whenever adding overlays.
- Revisit responsive layout after event timelines move into the detail panel.

### Tests

- Add Playwright smoke coverage for load, playback, scrub, panel toggle, widget
  join/split, and export error paths.
- Add migration tests for localStorage-backed preferences when a DOM test
  environment exists.
- Add parser fixtures from real traces rather than synthetic examples whenever
  possible.

Make more backlog items, be creative!
Find two delightful improvements


---
