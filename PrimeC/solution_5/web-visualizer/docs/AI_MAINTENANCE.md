# AI Maintenance Guide

Read this first before changing the web visualizer. This document is for AI
agents and maintainers who need to keep the project healthy without redoing old
work or breaking subtle runtime contracts.

For broader maps, also read:

- `docs/ARCHITECTURE.md` for module ownership and data flow.
- `docs/COMPONENTS.md` for component boundaries and prop surfaces.
- `docs/BACKLOG.md` for short-term product ideas from the user.
- `src/ARCHITECTURE.md` is a redirect stub only; keep architecture updates in
  `docs/ARCHITECTURE.md`.

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

## Current Hotspots

Approximate source size at this guide revision:

| File                               | Size        | Why it matters                                                                                       |
| ---------------------------------- | ----------: | ---------------------------------------------------------------------------------------------------- |
| `src/Visualizer.jsx`               | ~4200 lines | Runtime owner for trace state, playback, panels, gestures, export, and renderer wiring.              |
| `src/SieveRenderer.js`             | ~2560 lines | Canvas2D overlay renderer and layout authority. GL owns cell fills, but this class still owns labels, outlines, hit-testing, minimap, frame-timing samples, and many overlays. |
| `src/EventsPanel.jsx`              | ~918 lines  | Event list, grouping/search, floating all-events widget, drag/drop collapse behavior.                |
| `src/settings/LayoutTab.jsx`       | ~906 lines  | Largest settings tab. Avoid inline React components in its function body.                            |
| `src/settings/AnimationTab.jsx`    | ~554 lines  | Animation controls and timing target UI.                                                             |
| `src/DetailPanel.jsx`              | ~495 lines  | Compact detail cards, mask preview, event timeline placement.                                        |
| `src/renderer/gl/bitGridGLCore.js` | ~487 lines  | WebGL2 shader/backend source of truth for bit cell fills.                                            |

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

Done: export logic moved to `useTraceExport`; keyboard shortcuts moved to
`useKeyboardShortcuts`; playback clock moved to `usePlaybackClock`; playback
loops moved to `usePlaybackLoop`; search moved to `useSearchState`; 3D camera
lifecycle moved to `use3DCamera`; canvas JSX moved to `CanvasStage`; gesture
bodies moved to `src/visualizer/gestures/`; panel/widget transition callbacks
moved to `usePanelChoreography`.

Left to do:

- Continue reducing panel/window choreography by moving raw panel state into
  `usePanelChoreography` once the current callback extraction has settled.
- Extract minimap inset calculations if future layout work grows that section.
- Extract bit-history balloon state and geometry if future balloon work grows.
- Keep extractions behavior-preserving and verify with playback, scrubbing,
  panel toggles, and widget drag/drop.

### 2. Keep Reducing `SieveRenderer.js`

Done: `render()` is now a coordinator; bit math, drawing helpers, minimap, and
major overlays are extracted. GL owns bit cell fills; Canvas2D draws overlays,
labels, outlines, minimap, and side-face polygons. The old Canvas2D performance
overlay draw pass moved to `DebugToolsPanel`; `SieveRenderer` now only exposes
frame-timing snapshots for that UI. Touched GL comments that mentioned direct
mode or deleted `skipBitFill` were cleaned up.

Further extraction pass completed:
- `bitIndexToCanvas` and `canvasToBitIndex` moved to `src/renderer/layout/transforms.js`;
  `SieveRenderer` methods delegate with one-liners.
- Per-bit overlay indicator drawing (prime/range/multiples dot+label) unified into
  `src/renderer/bits/overlayIndicators.js` — `drawBitOverlayIndicator(glyph, options)`
  with anchor, dotScale/dotMax, label/labelAnchor/labelScale/labelMax/labelThreshold.
- Geometry/bounds helpers in `src/renderer/layout/geometry.js`:
  `multiBitBounds`, `bitVisualRow`, `multiBitBoundsSegments`, `getElementBounds`.
- Mask metadata helpers in `src/renderer/mask/maskMetadata.js`:
  `maskTintColor`, `maskWriteEntries`, `maskWordOrderSummary`, `maskEntriesBySlot`,
  `maskEntryBits`, `maskEntryGroupBounds`.
- Negative flag `suppressMaskWriteOverlay` renamed to `showMaskWriteOverlay`;
  backward-compat alias removed after all call sites in `Visualizer.jsx` were updated.
- Dead methods removed: `setGlCompositeSourceCanvas`, `setCompositeGLInto2D`,
  `setGlCompositeOffsetX/Y`, `_renderClear`, `_drawBitBodyNormal`, `_drawBitFocusRange`.

Left to do:

- Extract remaining renderer overlay-like passes only when isolated: target
  outline, ghost-mask highlight, motion trails, cacheline outline/heat overlay.
- Keep `SieveRenderer` as the source of layout truth unless a full renderer-mode
  contract is implemented.

### 3. Keep WebGL Worker Rendering Reliable

Done: production uses `BitGridGLWorker`; direct `BitGridGL.js` was removed; GL
draws background, bit cell fills, focus/prime/range/multiples tints and borders,
lowered-cell geometry, and rise-and-settle animation offsets. Worker context-loss
recovery and a worker parity harness exist. The FPS/debug UI is a React window
outside the 3D/canvas plane, toggled by a toolkit icon and defaulting to hidden.
Safari black-canvas flicker fixed: `BitGridGLWorker` detects Safari at `attach()`
time and runs `BitGridGLCore` synchronously on the main thread instead of via
OffscreenCanvas worker, eliminating the async GPU compositor race that caused the
flicker. Non-Safari browsers that also lack OffscreenCanvas fall into the same
direct path automatically.

**State texture format (important):** The per-bit state byte is stored in an
`RGBA8` texture (`gl.RGBA8`, sampler type `sampler2D`) — **not** an integer
texture. The state byte lives in the `.r` channel (normalized 0-1); the VS
decodes it with `uint(round(r * 255.0))`. Integer textures (`R8UI`/`usampler2D`)
cause `GL_INVALID_OPERATION` (error 1282) from `texSubImage2D` in OffscreenCanvas
WebGL2, even though the parameters are spec-valid. Using `RGBA8` avoids this
entirely. State is expanded from a 1-byte-per-slot `Uint8Array` to 4-bytes-per-slot
(`RGBA`) in `uploadStateBuffer()` before upload.

**Tint alpha values:** PRIME=0.38 (gold 251,191,36), RANGE=0.42 (cyan 34,211,238),
MULT=0.40 (purple 167,139,250), FOCUS=0.16 (blue 96,165,250). All eight state bits
are currently used (set/changed/ghost/repeated/prime/range/multiples/focus).

Left to do:

- Run `parity.html` after shader, packing, or state-texture changes.
- Keep the OffscreenCanvas capability check and `isGlUnavailable` warning. There is
  no Canvas2D cell-fill fallback anymore.
- Consider partial `texSubImage2D` updates only after profiling shows full state
  repacks are a real bottleneck at large bit counts.
- If adding new per-bit GL state, plan the texture protocol first. The current
  state byte is fully allocated (8/8 bits used). Extending will require a second
  state texture or a wider format such as RGBA8 with multiple channels.

### 4. Preserve Playback And Animation Correctness

Done: playback loops are centralized in `usePlaybackLoop`; callback refs prevent
listener/effect churn; timeline wipe works during inter-event delay; changing
animation settings during single-event loop no longer freezes playback; when the
user changes `animStyle` or `animMode`, the new animation starts from the same
scrub-progress position — both the direct-trigger path (no replay loop running)
and the loop-based paths (single-event and selected-steps loops) now pass
`startProgress`/`startIndex` resume hints so the animation picks up at the same
point instead of restarting from 0. A stable `stepScrubProgressValueRef` was
added in `Visualizer.jsx` alongside the existing setter ref to allow reading the
current numeric progress inside stable-dep effects.

Left to do:

- Any new animation must abort on `seekGenRef`, pause on `globalPausedRef`, and
  set `animBusyUntilRef` when it blocks all-events playback.
- Test all animation modes with play, pause, scrub, event step, all-events
  playback, and single-event repeat.

  Mask-stamp animation polished: travel phase extended to 58% of stamp slot
  duration (was 45%), settle shortened to 15% (was 30%), final vertical lift
  capped at 4 px (was up to 18 px via the full `lift` value). Both
  `orderedEntries` and legacy-groups paths in `SieveRenderer.renderMaskStamp()`
  were updated.

### 5. Improve Widget And Panel Workflows

Done: all-events and single-event widgets can be joined/split; widget drag
handles are scoped; topbar transport hides automatically when the floating
all-events widget is visible; joined widget anchoring was fixed; dragging or
expanding the joined widget to the left/events side now opens both the events
panel and detail panel, with the single-event timeline shown in detail and the
all-events timeline kept in the events panel; detail-panel timeline actions
keep the percent and gear aligned on the right. Dragging the joined widget onto
the detail panel now shows all-events transport and timeline inside the detail
panel body: `isAllEventsInDetailPanel` state (persisted), `AllEventsTransport`
component in `src/visualizer/`, `pushJoinedWidgetToDetailPanel` in
`usePanelChoreography`, and a 'detail' drop zone in `JoinedEventsWidget`.

Left to do:

- Re-test drag/drop targets after every layout or z-index change.

### 6. Keep The Detail Panel Compact And Informative

Done: detail cards are equal-height; the mask preview now places mask metadata
to the right of the mask cells inside "Mask pattern & preview"; mask type is
derived from `maskWordBits` and `patternSlotCount`.

Left to do:

- Verify the mask section with traces that have wide masks, missing mask
  metadata, and long pattern labels.
- Keep detail sections compact and horizontally scannable. Avoid full-width
  cards unless a section truly needs it.
- If event timelines move into the detail panel, protect the compact card grid
  from being pushed below the fold.

### 7. Improve Bit-History Balloons

Done: pinned and hover balloons are extracted under `src/visualizer/`; hover
suppression is in place over floating widgets; visible balloons now draw a soft
curved SVG connector from the bit edge to the nearest measured balloon edge;
stale mouse-position hover state was removed after balloon placement became
bit-anchored; bit hit-testing reads the live canvas anchor to stay accurate near
videport edges. The joined-events widget is now included in the overlay-rect
query set used by `getVisibleBalloonStyles`, so balloons correctly hide when
they would overlap the widget.

Left to do:

- Check balloon clamping with events panel open/closed, settings open/closed,
  joined widget visible, and minimap visible.
- Manually tune connector width/opacity if real traces show it competing with
  dense overlays, especially in light theme and at high zoom.

### 8. Improve Settings And Color Discoverability

Done: settings tabs are split; preview-style option buttons are used broadly;
legend overlay/animation rows are clickable; color presets include more engaging
schemes; canvas background colors are persisted per theme. Log level filter
options renamed to "level N (LN)" format (e.g. "Up to level 5 (L5)") for
clarity; events panel indentation whitespace reduced (base 6px, 10px per level);
`.event-child` extra 24px padding removed so first-level items are nearly flush.
Timeline slider row `min-height` and wrapper height increased to 28px to better
match the topbar's visual weight. "View raw log" dialog is now draggable,
resizable, and line-numbered; lines matching events have clickable line-numbers
that navigate to that step in the events panel. Raw log dialog opens near the
top of the window (y=60px). Detail panel labels/chips expand on hover. Grid
opacity slider responds immediately during animation. Event annotations shown
inline in the events panel list. The "View raw log" button is now the first item
in the trace-info popover (above Storage model). Event panel < and > level
buttons now cycle within the active group (up-to/collapse/exact) rather than
only cycling through up-to levels. New-style inline JSON log format supported:
lines of the form `<text> { traceline: <n>, depth: <n>, level: <n>, ... }` are
parsed in `parseFreeformTextTrace` and `parseTextTrace`; the text prefix becomes
the annotation; JSON fields map to step properties; `lineToStep` in
`Visualizer.jsx` recognises this format for raw-log source linking.
`TraceInfoPopover` is now always mounted; the `visible` prop hides the popover
chrome while letting the raw-log dialog render independently so "go to source"
in the detail panel opens only the log without opening the trace-info popover.

Left to do:

- Make bit-state legend/color items clickable shortcuts. Clicking a bit state
  should open the relevant color control or let the user choose that state's
  color directly.
- Add more color schemes only when they serve a distinct use case, such as
  projector visibility, color-blind safety, print/export contrast, or dark-room
  demos.
- Keep color constants in `src/renderer/constants.js`; UI imports should not
  depend on `SieveRenderer.js`.

### 9. Expand Tests And Visual QA

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

### 10. Keep Persistence And Migrations Safe

Done: `getInitialViewState()` centralizes preference reads; legacy
`stepsPanelCollapsed` migrates to `isEventsPanelCollapsed`; merge helpers cover
partial saved settings; `areWidgetsJoined`, colors, canvas backgrounds, panel
visibility, layout, event title, and timing settings are persisted.

Left to do:

- Add a default, merge/migration path, initial-state mapping, and write payload
  entry for every new persisted preference.
- Never rename a key without reading both old and new forms for at least one
  version.
- Keep forced startup visibility rules intentional. Example: the event title is
  forced visible so a fresh session has an obvious current-event affordance.

### 11. Keep Parser And Trace Metadata Healthy

Done: parser modules are split into `src/parser/`; trace loading is lazy; tests
cover JSON v2/v3, text parsing, header parsing, parse utilities, and trace error
paths. Storage model is now auto-applied from `header.storageModel` on every
trace load via a `useEffect` in `Visualizer.jsx` keyed on `header` identity.
The user can still manually override it via the popover select; the override
persists until the next trace is loaded.

Left to do:

- Add fixtures for real benchmark traces whenever a bug is found.
- Expand focused tests for `maskMetadata.js`, `primeInference.js`, and
  `dumpParser.js`.
- Keep parser helpers pure. React and renderer state should never enter
  `src/parser/`.

### 12. Improve Accessibility And Keyboard UX

Done: a keyboard-shortcuts overlay exists and opens with `?`; global keyboard
listener registration is stable.

Left to do:

- Add focus trapping and initial focus to the shortcuts overlay and any future
  modal dialogs.
- Audit icon-only buttons for accessible names and tooltips.
- Verify shortcuts do not fire while typing in inputs, selects, or textareas.
- Keep visual affordances discoverable without adding explanatory text inside
  dense tool surfaces.

### 13. Maintain Performance At Large Trace Sizes

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

### 14. Keep Documentation Current And Short

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

### REFACTOR Backlog

Derived from `REFACTORING_PLAN.md` and `PHASE_3_HOOK_CONSOLIDATION.md`.
This refactor scope is now complete as of 2026-05-06:

- Done (2026-05-06): Phase 5.3 secondary boundary migration for
  `CanvasOverlayManager` and `JoinedEventsWidget` now uses grouped contracts
  and no longer depends on scattered flat props.
- Done (2026-05-06): Phase 2 objective completed end-to-end across the major
  Visualizer child boundaries. Grouped contracts now cover `Toolbar`,
  `VisualizerMainContent`, `EventsPanel`, `CanvasStage`, `DetailPanel`,
  `SettingsPanel`, `DebugToolsPanel`, `CanvasOverlayManager`, and
  `JoinedEventsWidget`.
- Done (2026-05-06): optional Phase 5.4 cleanup executed. Legacy flat-shape
  fallback compatibility has been removed from the migrated internal boundaries
  now that all call sites are grouped and verified.
- Done (2026-05-06): applied organized state aliases in `Visualizer.jsx`
  within the consolidated child-prop assembly path to reduce flat-name noise
  with no behavior changes.
- Done: reusable hook-refactor template added below to standardize
  config/state/refs/handlers grouping, fallback strategy, and verification steps
  for future high-parameter hooks.
- Done: cumulative refactor impact summary published below and aligned with
  `ARCHITECTURE.md` and `COMPONENTS.md`.

There are no remaining structural items from these two refactor plans.
Future work should be tracked under the topical sections below rather than as
continuations of Phase 2-5 migration.

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

## 16. Large Refactor: Redundancy Removal + CSS/JSX Generalization

**Status: COMPLETED** (all phases A–G executed and build verified).

Scope and constraints for this plan:

- Scope: web-visualizer only
- Delivery: big-bang branch, single integration milestone
- Priority: consistency and maintainability first
- Visual policy: small visual diffs acceptable during token/primitives rollout

### Final Bundle Size (post-refactor)

| File | Before | After | Δ |
|---|---|---|---|
| `index.css` | 101.26 kB | 103.20 kB | +1.9% |
| `index.js` | 151.08 kB | 151.08 kB | 0% |
| `Visualizer.js` | 428.99 kB | 428.90 kB | −0.1% |

All within the ≤5% regression budget.

### New files created

| File | Purpose |
|---|---|
| [src/lib/math.js](src/lib/math.js) | Shared math: `clamp`, `clampInt`, `lerp`, `clampMs`, `nudge`, `percentOf` |
| [src/lib/browser.js](src/lib/browser.js) | SSR-safe DOM/window wrappers (`isWindowAvailable`, `isDOMAvailable`, etc.) |
| [src/lib/constants.js](src/lib/constants.js) | Shared UI constants (`DRAG_THRESHOLD_PX`, z-index levels) |
| [src/hooks/useDragResize.js](src/hooks/useDragResize.js) | Generic mousedown→drag hook (used in DetailPanel) |
| [src/hooks/useWindowResize.js](src/hooks/useWindowResize.js) | Window resize listener hook (used in Visualizer) |
| [src/hooks/useRAFAnimation.js](src/hooks/useRAFAnimation.js) | Reusable RAF tween loop |
| [src/components/Modal.jsx](src/components/Modal.jsx) | Accessible modal shell (backdrop + Escape key + close button) |
| [src/components/ButtonGroup.jsx](src/components/ButtonGroup.jsx) | Mutually-exclusive toggle button row |
| [src/styles/23-components.css](src/styles/23-components.css) | Shared modal/transport CSS classes |

### CSS token additions (01-theme.css)

Added tokens to both `:root` (dark) and `[data-theme="light"]`:
- `--prime-accent`, `--prime-accent-bright`, `--prime-accent-border(-hover)`, `--prime-accent-bg(-hover)`
- `--debug-pass`, `--debug-warn`, `--debug-error`
- `--warning-fg`, `--heat-hot`

Files migrated from hardcoded colors to tokens:
- [src/styles/08b-detail-compact.css](src/styles/08b-detail-compact.css)
- [src/styles/09-export-progress.css](src/styles/09-export-progress.css)
- [src/styles/13-bit-history.css](src/styles/13-bit-history.css)
- [src/styles/15-layout-overview.css](src/styles/15-layout-overview.css)
- [src/styles/20-debug-tools.css](src/styles/20-debug-tools.css)

### Outcomes

- Removed duplicate `clamp` / `clampInt` helpers from `animationTiming.js`, `unitConverters.js`, `viewPrefs.js`
- Replaced inline `typeof window !== 'undefined'` guards with `browser.js` utilities in `EventTitleBanner`, `JoinedEventsWidget`, `EventsPanel`
- Consolidated DetailPanel's two drag handlers to `useDragResize`
- Consolidated GL-debug resize listener in Visualizer to `useWindowResize`
- All amber/debug/prime hardcoded color values now reference CSS custom properties

### Design decisions

- Complex drag handlers in EventsPanel, SettingsPanel, TraceInfoPopover, JoinedEventsWidget intentionally NOT migrated to useDragResize — they mix drop-zone detection, rubber-band physics, and state transitions that make the (dx, dy) → callback abstraction actively harmful
- `PlaybackTransport` component not extracted — all transport implementations have sufficiently different UI variants; extracting them would require deep prop drilling without readability benefit
- legacy migration shims in viewPrefs.js (repeatAnim, stepsPanelCollapsed) kept — they're still needed for users with old localStorage entries

### Phases reference

#### Phase A: Guardrails and Baseline ✅
- Freeze behavior baseline with a pre-refactor branch snapshot
- Captured bundle sizes (see table above)

#### Phase B: Utility Consolidation ✅
- Created `lib/math.js`, `lib/browser.js`, `lib/constants.js`
- Migrated all duplicate clamp helpers and SSR guards

#### Phase C: CSS Token Expansion ✅
- Extended 01-theme.css with prime-accent, debug-state, warning, heat tokens
- Created 23-components.css
- Replaced hardcoded values in 5 CSS files

#### Phase D: Interaction Hook Unification ✅
- Created `useDragResize`, `useWindowResize`, `useRAFAnimation`
- Migrated DetailPanel height/width drag, Visualizer GL-debug resize

#### Phase E: JSX Primitive Extraction ✅
- Created `Modal.jsx`, `ButtonGroup.jsx` (infrastructure — progressively adoptable)

#### Phase F: Redundant/Legacy Path Removal ✅
- No safe dead code identified (legacy migration shims are live; format variants are live)

#### Phase G: Verification and Stabilization ✅
- `npm run build` passes, 113 modules, bundle within tolerance
- All changes reviewed and consistent



- Freeze behavior baseline with a pre-refactor branch snapshot
- Capture before/after metrics:
  - bundle size from build output
  - Visualizer and panel render cadence from Debug Tools
  - key interaction timings (drag responsiveness, scrub responsiveness)
- Prepare a manual smoke checklist for:
  - load trace
  - play/pause/seek/scrub
  - panel toggle/resize
  - widget join/split
  - export and error banners

Exit criteria:

- baseline numbers stored in PR description or a temporary check file
- smoke checklist agreed before touching architecture
