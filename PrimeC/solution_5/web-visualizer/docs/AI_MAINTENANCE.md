# AI Maintenance Guide

> Read this first. It exists to keep AI agents (and humans) from re-doing
> work, breaking subtle invariants, or producing massive regressions in the
> visualizer codebase.

The web visualizer is a long-lived React/Vite app with **three** large files
that historically attract most of the changes:

| File | Lines | Role |
|---|---|---|
| `src/Visualizer.jsx` | ~4 200 | Stateful orchestrator: trace, playback, viewport, hover, exports |
| `src/SieveRenderer.js` | ~2 800 | 2D canvas renderer (sieve grid, overlays, animations) |
| `src/settings/LayoutTab.jsx` | ~900 | Layout tab (extracted from former SettingsPanel monolith) |

`SettingsPanel.jsx` itself is now ~260 lines — just the tab-row shell.
The former hotspot is replaced by `LayoutTab.jsx` and `AnimationTab.jsx`
(~545 lines) as the next-largest settings files.

---

## 1. Golden rules

1. **Always run `npm run build` after every edit.** The codebase has no test
   suite — the build (Vite + React) is your only automated safety net.
   Stages of work that pass the build are commit-worthy; stages that don't
   are broken.
2. **Don't reorder hooks across the lazy-closure boundary.** `useEffect`
   bodies routinely reference functions declared further down in
   `Visualizer.jsx` (e.g. `exportVideo`, `triggerAnimation`). This works
   because the effect callback is captured lazily and only invoked after the
   render pass completes. Keep that property when extracting code.
3. **Never break the renderer's `setState` shape.** Both
   `useTraceExport.js` and `Visualizer.jsx::triggerAnimation` call it with
   the same 7-argument signature. If you must extend it, take an options
   object and keep positional arguments backwards-compatible.
4. **Persistence keys are forever.** Anything written to `viewPrefs`
   (localStorage `sieve-visualizer:view-preferences:v1`) is on real users'
   machines. Add new keys; don't rename or repurpose existing ones. Use the
   `merge*` helpers in `src/lib/viewPrefs.js` to reconcile partials.
5. **Don't add features without removing equivalent dead code first.** When
   in doubt, grep the entire `src/` tree (and the `dist/` artefact too —
   minified code can confirm whether something is reachable in production).
6. **Don't write documentation files unless asked or strictly necessary.**
   Update existing docs (`ARCHITECTURE.md`, `COMPONENTS.md`, this file)
   instead of creating new ones.

---

## 2. Where to put new code

| You are adding… | Put it in… |
|---|---|
| A pure helper (math, string, format) | `src/lib/` |
| A reusable React hook | `src/hooks/` |
| A pure trace-format parser | `src/parser/` and import from `traceParser.js` |
| A renderer drawing helper / palette | `src/renderer/` |
| A new visualization mode | `src/renderers/MyMode.js` (see §4) |
| A new settings sub-control | `src/settings/` (presentational) |
| A toolbar/overlay piece | `src/visualizer/` |
| A style block | `src/styles/NN-name.css` + add to `index.css` |

When the appropriate folder doesn't exist yet, create it and add a
single-line README so the next agent doesn't recreate it elsewhere.

---

## 3. Refactoring playbook

These are tested, low-risk extraction patterns that have already been used
successfully. Reuse them.

### Pattern A — extract a `useCallback`-heavy block into a hook
Already done for: `useTraceExport` (PNG + video).

1. Find a block of `useState` + `useRef` + `useCallback` that only depends
   on a handful of inputs.
2. Move it to `src/hooks/useFoo.js` with explicit `{ inputs }` and a return
   object.
3. Replace inline state declarations with the hook call.
4. **Place the hook call AFTER any function it depends on (e.g. `goToStep`)
   but BEFORE the first JSX usage.** Lazy closure handles the rest.
5. `npm run build`.

### Pattern B — extract repeated controlled-input boilerplate
Already done with: `useDraftInput` (range start/end, multiples prime).

The "draft text + commit on blur/Enter" pattern occurs frequently. Use
`src/hooks/useDraftInput.js`. Don't reinvent it.

### Pattern C — split a long render body into siblings
Pending for: `SettingsPanel.jsx` (currently three large tab branches),
`Visualizer.jsx` JSX body (canvas + overlays + balloons).

1. Identify a self-contained chunk of JSX that uses a small subset of the
   parent's state.
2. Move it to `src/visualizer/MyChunk.jsx` (or `src/settings/MyTab.jsx`).
3. Pass only the props it actually consumes — count them first; if the
   number exceeds ~12, the chunk isn't really "self-contained" yet.
4. **Don't introduce React Context just to dodge prop counts.** Plain props
   are the convention here and keep the data flow legible.

### Pattern D — extract a method off `SieveRenderer` into a helper module
Already done for: `bitMath`, `drawingHelpers`, `constants`.

Renderer methods that don't read more than a few `this.*` fields are
candidates for extraction into `src/renderer/`. Pass the needed values as
arguments. Pure functions are easier to test and reuse across modes.

---

## 4. Adding a new visualization mode

The renderer is currently sieve-grid-specific, but `Visualizer.jsx` only
calls a small public API on it. To add a second mode (e.g. a horizontal
timeline, or a dependency-graph view):

1. Read the contract in [`src/renderer/VisualizationRenderer.js`](../src/renderer/VisualizationRenderer.js).
2. Implement a class `MyModeRenderer` in `src/renderers/MyMode.js`.
3. At the top of `Visualizer.jsx`, replace the constructor:

   ```js
   const RENDERER_BY_MODE = {
     grid: SieveRenderer,
     timeline: SieveTimelineRenderer, // your new renderer
   };
   const RendererClass = RENDERER_BY_MODE[trace.visualizationMode || 'grid']
                       || SieveRenderer;
   rendererRef.current = new RendererClass();
   ```

4. Reuse the helpers under `src/renderer/`. They are intentionally
   framework-free.
5. Settings that don't apply to your mode (e.g. cacheline annotations on a
   timeline) should stay rendered but be ignored — keep the panel generic
   for now. A future tab-split refactor (Pattern C) can hide irrelevant
   sections per-mode.
6. `useTraceExport` works unchanged as long as your renderer fulfils the
   `setState(...)` + `render()` + `canvas` + `currentOperation` part of the
   contract.

---

## 5. Known minefields

- **`bitStateRef` ↔ `bitStateDirtyRef`.** The incremental `goToStep` path
  trusts that `bitState` is the cumulative XOR of all preceding events. Any
  scrub-back or jump must set the dirty flag; otherwise the displayed bits
  desync from the trace.
- **`seekGenRef`.** Animations check this counter before each RAF tick and
  abort if the user scrubbed mid-animation. Never bypass it inside
  `triggerAnimation`, `runMaskStampAnimation`, or `seekStepAnimation`.
- **`globalPausedRef`.** Three independent RAF loops (mask, sequential
  reveal, between-event delay) all poll this flag. New animation paths must
  do the same or they won't pause cleanly.
- **`animBusyUntilRef`.** Set by `triggerAnimation`, polled by the all-events
  scheduler to know when to advance to the next step. If you forget to set
  it, playback either skips animations or stalls.
- **`captureStream` requires the canvas to be visible.** Video export breaks
  when the canvas element is `display: none` (e.g. behind a modal).
- **3D mode mutates renderer pan/zoom indirectly.** `Camera3D` calls back
  into the renderer's pan/zoom setters; gesture handlers must not bypass
  this or the camera projection drifts.
- **`viewPrefs` stores user state.** Adding a setting? Add a default in
  `lib/viewPrefs.js` and a `merge*` step so old saved states still load.
- **Panel-toggle pan compensation is fragile.** Toggling the steps /
  settings / detail panels resizes the canvas area. To pin the
  bit-under-the-cursor at the same window position the toggle handler
  must capture the viewport anchor *before* the state update (the
  resize `useEffect` re-runs after the state flips, by which time
  `getBoundingClientRect()` already reflects the new layout — capturing
  fresh there yields zero net compensation and the grid drifts).
  Stash the anchor in `pendingResizeAnchorRef` and let the resize
  effect consume it **exactly once** on its immediate `onResize(true)`
  call. The follow-up double-rAF and 190 ms post-transition refreshes
  must run with `onResize(false)` so they don't re-shift `panX` by
  the same delta. Do not call `schedulePostLayoutRefresh()` from the
  toggle handlers — that fights the resize effect and the bookkeeping
  becomes impossible to reason about.

---

## 6. What's been done already

Track refactors here so the next agent doesn't redo them. Append; don't
overwrite.

- ✅ Added `<` / `>` detail-level buttons to the Events panel
  (`StepPanel.jsx`). The buttons flank the existing log-level `<select>` in
  a `.step-level-filter-row` flex container. `<` steps down through
  `upto:N` levels (less detail); `>` steps up to the next level or `''`
  (more detail / all). `handleLevelDecrease` and `handleLevelIncrease`
  callbacks are added via `useCallback`; CSS lives in `06-step-panel.css`
  under `.step-level-btn`. The select's class gains `step-level-select` so
  it fills the available flex space.
- ✅ Removed dead `vectorLabelForGroup`, `adjustBitInterval`, three
  `*Description` writes nobody reads, and the runtime-broken `setHoverInfo`
  call.
- ✅ Extracted PNG + WebM export to `src/hooks/useTraceExport.js`. The hook
  documents the public renderer surface it touches.
- ✅ Extracted draft-input boilerplate to `src/hooks/useDraftInput.js` and
  replaced the three SettingsPanel inputs.
- ✅ Added `src/renderer/VisualizationRenderer.js` as a documentation-as-code
  spec for mode-agnostic renderers.
- ✅ Extracted `useKeyboardShortcuts` from `Visualizer.jsx` to
  `src/hooks/useKeyboardShortcuts.js`. The keyboard `useEffect` is now a
  single hook call near the bottom of the component.
- ✅ Extracted the canvas-and-overlays JSX block (event-title banner, the
  three layered canvases, balloons, detail panel, detail-inspector overlay,
  timing panel) from `Visualizer.jsx` into `src/visualizer/CanvasStage.jsx`.
  Pure presentation; refs and handlers are passed in as props.
- ✅ Started SettingsPanel split: extracted `LegendTab` to
  `src/settings/LegendTab.jsx`. **LayoutTab and AnimationTab extractions
  remain TODO** — see §7. They were deferred because the layout tab alone
  is ~460 lines of JSX with dozens of closure-captured locals; without test
  coverage, splitting safely needs a `useSettingsBundle()` step first.
- ✅ Extracted the search-target highlight overlay into
  `src/renderer/overlays/SearchOverlay.js`. `SieveRenderer.setSearchHighlight()`
  / `clearSearchHighlight()` are now thin delegators; the renderer's main
  draw loop calls `this.searchOverlay.render(ctx, cw, ch)` directly. This
  is the reference shape for future overlays (Pattern D).
- ✅ Extracted Camera3D **lifecycle and reactive state** to
  `src/hooks/use3DCamera.js`. The hook owns `camera3DRef`,
  `camera3DTransform`, `camera3DContainerStyle`, `ensureTiltCamera`, plus
  `createCamera({ onPanZoom })` and `disposeCamera()` helpers. The
  pointer/wheel/touch gesture useEffect (~390 lines) was **not** moved
  because the 2D pan/zoom and 3D rotation paths share one pointer state
  machine; see §7 for the deferred pointer-handler split.
- ✅ Extracted `MaskWriteOverlay` to `src/renderer/overlays/MaskWriteOverlay.js`.
  Same shape as `SearchOverlay`: stateless overlay class that pulls all
  inputs from the host renderer at render time. Mask metadata
  (`maskWordBits`, `_maskWriteEntries`, `_maskTintColor`) stays on the
  renderer because it is shared with the vector-touch-order labels and
  the transition-animation code path.
- ✅ Extracted `AnimationTab` to `src/settings/AnimationTab.jsx`. The
  tab is fully self-contained: takes only props that already existed on
  `SettingsPanel`, recreates the trivial helpers (`clamp`,
  `playbackSpeedValue`) locally to avoid prop drilling them.
- ✅ Extracted `VectorTouchOrderOverlay` to
  `src/renderer/overlays/VectorTouchOrderOverlay.js`. Same Pattern D as
  `SearchOverlay` and `MaskWriteOverlay`. Reads `_maskWordOrderSummary`,
  `_maskTintColor`, `_maskEntryGroupBounds`, `_labelTextColor`,
  `_truncateTextToWidth`, `_fitLabelFontSize` through host accessors;
  needs no state of its own.
- ✅ Promoted the `seekGen` / `globalPaused` / `animBusyUntil` triplet
  into `src/hooks/usePlaybackClock.js`. The hook returns the three ref
  objects (not their `.current` values) so consumer mutation patterns
  in `Visualizer.jsx` are unchanged — this is a structural rename so
  the playback contract is documented in one place.
- ✅ Extracted `LayoutTab` to `src/settings/LayoutTab.jsx`. Pragmatic
  "fat prop list" extraction (~25 props) instead of the originally
  planned `useSettingsBundle()` route. The tab now owns its own UI
  state for the grouping menu, custom-preset menu and spacing
  popovers, plus the helpers (`set`, `incr`, `decr`,
  `setVectorProfile`, `commitCustomGrouping`,
  `selectGroupingPreset`, `renderGroupingFamily`) and the inner
  `LayoutOverview` / `SpacingControl` components. `SettingsPanel.jsx`
  shrank from ~1265 to ~234 lines and is now just the tab-row shell
  plus the floating-legend panel.
- ✅ Centralised viewPrefs read/migrate logic. Added
  `getInitialViewState()` to `src/lib/viewPrefs.js`; it reads the
  storage payload once and resolves every persisted UI value (with
  clamping and legacy-`repeatAnim` migration) into a flat bundle.
  `Visualizer.jsx` now calls it via a single `useMemo` and feeds each
  field straight into a `useState` seed — the inline
  `Number(readViewPrefs()?.foo)` / `Math.max(…)` boilerplate is gone.
  File path stayed at `src/lib/viewPrefs.js` (the doc's `src/storage/`
  rename is a separate optional move; touching one file vs. an import
  fan-out kept the diff small).
- ✅ Removed the "Title" settings tab (`src/settings/TitleTab.jsx` kept but
  unimported). Removed the tab button and its panel block from
  `SettingsPanel.jsx`.
- ✅ Moved the Mode toggle (Mask / Bits / Both) from the single-event widget
  (`StepAnimSliders.jsx`) into the Animation settings tab
  (`AnimationTab.jsx`). Added `bitAnimationMode` + `onBitAnimationModeChange`
  props to both `AnimationTab` and `SettingsPanel`. Added
  `handleBitAnimationModeChange` callback and `openAnimationSettings`
  shortcut in `Visualizer.jsx` to let the gear icon open the panel directly.
- ✅ Stabilised single-event widget annotation area: `currentStepBanner` now
  returns `annotationLines: string[]` + `bitsChanged: number` instead of
  `line2`/`line3` strings. `EventTitleBanner` shows exactly
  `MAX_ANNOTATION_LINES=3` annotation lines (padding with nbsp for stable
  height), shows bits-changed placeholder when none, and a "show more/less"
  toggle for events with long annotations.
- ✅ Replaced the ⤢ locate icon with a SVG `LinkIcon` (chain-link) in
  `EventTitleBanner`. `LinkIcon` added to `Icons.jsx`.
- ✅ Added gear icon button (`step-focus-gear-btn`) in the timeline slider
  row of `StepAnimSliders`. Clicking it calls `onOpenAnimationSettings`,
  which expands the settings panel and switches to the Animation tab via the
  `settingsTabRequest` state / `activeTabRequest` prop mechanism.
  `SettingsPanel` watches this prop (counter-incremented object) to fire a
  one-shot `setActiveTab` effect.
- ✅ Split the pointer/wheel/touch gesture useEffect. Extracted the
  *bodies* of pan, rotate and wheel into pure helpers in
  `src/visualizer/gestures/{pan,rotate,wheel}.js`. The dispatcher,
  state machine (`gestureMode`, `activePointerId`, `startX/startY`,
  `panSX/panSY`, `didDrag`, `mouseRotateActive`), pointer-event
  registration, hover handling, click handling and minimap hit-test
  remain in the original useEffect — per the doc's rule “do not move
  state ownership”. Each helper takes `{ renderer, event, …host }`
  and returns either nothing or `{ startX, startY }` (rotate, which is
  a delta-from-last-event gesture). No pinch helper exists yet because
  there is no pinch handler in the source today.
- ✅ Pruned dead `SettingsPanel` props. Removed `bitAnimInterval`,
  `onBitAnimIntervalChange`, `storageModel`, `onStorageModelChange`,
  `customTitle`, `onCustomTitleChange`, `depthModeEnabled` from the
  `SettingsPanel` signature and their pass-throughs at the call site
  in `Visualizer.jsx`. The `bitAnimInterval` and `storageModel` state
  in `Visualizer.jsx` itself stays — it is still consumed internally
  (animation timing, `Toolbar` / `TraceInfoPopover`). The `customTitle`
  state was removed entirely (its only setter was the dead
  `onCustomTitleChange` prop) and `effectiveTitle` collapsed to
  `traceTitle`.
- ✅ Extracted `CachelineAnnotationsOverlay` to
  `src/renderer/overlays/CachelineAnnotationsOverlay.js`. Same Pattern
  D shape as the other overlays. Reads heat-map / cacheline metrics
  (`heatMapEnabled`, `clHitCount`, `clLastHitStep`, `heatMapCurrentStep`,
  `cachelineSize`, `bitsPerCacheLine`, `cachelineAnnotation`) and the
  shared layout/label helpers through host accessors. With this the
  overlay backlog is empty.
- ✅ Introduced `useSettingsBundle()` in `src/settings/useSettingsBundle.js`.
  Tiny memoised hook that turns the `(settings, onChange)` pair into a
  bundle of `{ s, set, setMany, incr, decr }`. `LayoutTab` now
  destructures the bundle locally instead of redefining `set`, `incr`,
  `decr` inline, and `setVectorProfile` / `setCustomVectorGrouping`
  use `setMany` for their multi-key updates. The dead defensive
  `vectorGroup` branch in the inline `set` (no caller passed that
  key) was dropped. `LayoutTab` prop signature is unchanged — the
  hook is purely an internal ergonomic. AnimationTab does not need
  the bundle (it has no `settings`/`onChange` pair, only orthogonal
  setter pairs).
- ✅ Rewrote `SieveRenderer.render()`. The original 512-line monolith
  is now a 26-line coordinator delegating to 17 small private methods
  on the same class. The split mirrors the natural data hierarchy:
  `_buildFrameContext()` precomputes every per-frame constant once
  into a shared `f` object; `_renderClear(f)` paints the background;
  the row/vector/u64/byte chain is
  `_renderVisualRow` → `_renderVector` → `_renderVectorU64` →
  `_renderVectorByte` → `_renderBitCell`; per-bit work fans out into
  `_classifyBit` (color + flags), `_computeBitDrawState` (depth /
  rise-and-settle animation geometry), `_drawBitBody` (lowered /
  raised / normal branches), `_drawGhostMaskHighlight`,
  `_drawBitFocusRange`, `_drawBitTargetOutline`,
  `_drawBitPrimeOverlay`, `_drawBitRangeOverlay`,
  `_drawBitMultiplesOverlay`, `_drawBitLabels`. Behaviour is
  byte-for-byte identical (no logic changes; only structural moves
  and the elimination of two never-read locals — `bitLabelFontSize`
  and `isSettledBit`). The largest helper is `_drawBitBody` at ~78
  lines (the three depth-mode branches); most are 10–40 lines.
  Verification was build-only — no visual regression test exists, so
  any future change here should still be eyeballed with
  `sieve visual web --trace 9 10000`. Bundle grew slightly
  (+0.8 kB gzipped) from the added JSDoc and method headers; module
  count stayed at 82.
- ✅ Fixed panel-collapse pan drift. Toggling Steps / Detail /
  Settings panels was shifting the bit grid by 2× the panel-width
  delta because the resize `useEffect` fires three times per toggle
  (immediate + double-rAF + 190 ms timeout) and was applying the
  same stashed anchor on every call. Final shape:
  `pendingResizeAnchorRef` is set just before the panel state
  changes (`toggleStepsPanel`, `revealCurrentStepInPanel`,
  `toggleDetailPanel`, `toggleSettingsPanel`); the resize
  `useEffect` reads it once and `onResize(consume=true)` only on
  the immediate call — the rAF and 190 ms follow-ups pass
  `consume=false`. See §5 for the minefield note.
- ✅ Brought `BitGridGL` (?renderer=gl) to base parity with
  Canvas2D for layout, color and state (items 1–3 of §8 "Open
  work"). Architecture: instanced unit-quad VBO drawn with
  `drawArraysInstanced(TRIANGLES, 0, 6, bitCount)`. Two textures —
  `posTex` (RG32F, per-bit cell centre in CSS px, pan-independent;
  populated by walking `host.bitIndexToCanvas(i)` in
  `uploadPositions`, which only repacks when a layout fingerprint
  changes); `stateTex` (R8UI, packed flag byte per bit:
  set / changed / ghost / repeated; repacked every render by
  `uploadState(host)`). Pan applied as a vertex-shader uniform.
  Fragment shader picks the colour branch from the packed flags
  and composites against the bg colour. Visualizer's `r.render`
  wrapper builds the fingerprint from
  `zoom|pixelSize|bitLayout|byteLayout|vectorGroup|cachelineSize|
  customGroupingBits|horizontalGroups|bit/byte/u64Spacing*|storageModel|
  bitCount|cssW|cssH` and passes `cellSize = pixelSize*zoom`,
  colours from `_bitColors()` / `_opColor()`, repeated colour
  `[245,158,11]`. Still NOT in GL (Canvas2D handles): lowered-3D,
  rise-and-settle animation, focus-range fill, prime / range /
  multiples overlays, target outline, motion trails, cacheline
  outline + heat overlay, labels, minimap, hit-count gradient,
  heat-map age tinting, `mode3D` camera transform.
- ✅ Extended `BitGridGL` with the four cell-fill overlays
  (focus / prime / range / multiples) and `webglcontextrestored`
  recovery. Overlays piggy-back on the existing `R8UI` `stateTex`:
  flag bits 4–7 carry prime / range / multiples / focus
  membership; `uploadState(host)` walks `_primeBitFlags`,
  `[rangeOverlayStart, rangeOverlayEnd]`, `multiplesOverlayPrime`
  via `bitToNumber()`, and `[focusStart, focusStop]`. Tints are
  hard-coded in the fragment shader to match the Canvas2D source
  colours exactly. Context-loss handler nulls GPU resources;
  restore re-runs `_initProgram()` / `_initQuad()` / texture
  re-allocation and clears the layout fingerprint so positions
  repack on the next frame. `mode3D` works automatically because
  the GL canvas already lives inside `camera3DContainerStyle` in
  `CanvasStage.jsx`, so the same CSS 3D transform applies.
- ✅ Removed dead `_heatColor(bitIdx)` from `SieveRenderer.js`. It
  was never called anywhere in the codebase — the only consumer
  of `heatMapEnabled` is `_renderCachelineHeatOverlay`, which
  paints cacheline-group rectangles via
  `_cachelineHeatOverlayColor`, not per-bit cells. Discovered
  while triaging §8 item 2's "heat-map age tinting" TODO; that
  bullet was a documentation bug carried forward from the
  original scaffold. Removed the TODO from §8 item 2 and the
  related `lastAccessStep` entry from §8 item 3.
- ✅ Triaged §8 items 2–4.
  - Item 2: removed the stale "custom per-bit colour overrides"
    TODO (no such feature exists — `customColors` is per-class,
    already covered via `_bitColors()` uniforms). Lowered-3D
    shading + rise-and-settle stays open but is now explicitly
    flagged as **deferred until GL is the primary renderer**
    — the geometry/shader cost (shadow + base + top + side
    faces per bit) doesn't pay off while the GL canvas is a
    sandbox under Canvas2D, and the Canvas2D path handles
    `loweredSetBits` correctly today.
  - Item 3: marked ✅ *done at current scope*. Removed the
    `targetHitCounts`-magnitude-texture TODO (its only consumer
    is the hit-count gradient, which stays Canvas2D-on-top).
    Partial `texSubImage2D` updates kept as a conditional
    next-step only if items 1–2 grow features that need a
    richer per-bit payload — full repack at 10k bits is
    sub-frame in JS today.
  - Item 4: marked ✅ *enforced*. `BitGridGL.attach()` now
    sets `canvas.style.pointerEvents = 'none'` defensively
    (in addition to the CSS rule in `07-canvas.css`) and
    documents the hit-testing contract: any future GL-side
    hit-test must call `host.canvasToBitIndex(x, y)`, never
    re-derive layout from GL state.
- ✅ Built minimal visual-diff harness for `BitGridGL` (§8 item
  5). Files: `parity.html` at the project root + dev-only
  module `src/dev/parityHarness.js`. Open at
  `http://localhost:5173/parity.html` while `npm run dev` is
  running. Pins the GL renderer's contract: given identical
  positions + state + colours, GL output must match a small
  Canvas2D reference (uniform-grid `fillRect`-per-bit + same
  overlay composite) within rounding tolerance. Not bundled
  into production (Vite only emits `index.html`; module count
  stayed at 85 after adding it). Deliberately scoped to what
  GL covers, not the full `SieveRenderer` — testing parity
  for features GL has never claimed to implement would be
  noise. The multiples overlay is excluded from the reference
  for a `bitToNumber()`-vs.-`i` reason explained inline; the
  shader composite path is still exercised via focus / prime /
  range.
- ✅ Shipped OffscreenCanvas worker dispatch for the GL
  renderer (§8 item 6). Opt-in via `?renderer=gl-worker`. New
  files:
    - `src/renderer/gl/bitGridGLCore.js` — pure-WebGL2
      substrate (no DOM/`window`); takes either
      `HTMLCanvasElement` or `OffscreenCanvas`. Owns shaders,
      textures, draw call.
    - `src/renderer/gl/hostStatePacker.js` — pure functions
      `packPositions(host, buf, slots)` /
      `packState(host, buf, slots)`. Used by both the direct
      and worker facades; runs only on the main thread (host
      object is React-side).
    - `src/renderer/gl/bitGridWorker.js` — module worker that
      owns a `BitGridGLCore` against the transferred
      `OffscreenCanvas`.
    - `src/renderer/gl/BitGridGLWorker.js` — main-thread
      facade with the same external API as `BitGridGL`. Posts
      pre-packed `Float32Array`/`Uint8Array` buffers as
      transferables; one-way (no ack round-trip).
  Also refactored `BitGridGL.js` to be a thin facade over
  `bitGridGLCore.js` + `hostStatePacker.js` (no behaviour
  change — direct mode still works, parity harness still
  passes). `featureFlag.js` extended with `getRendererMode()`
  / `isGLWorkerEnabled()`. `Visualizer.jsx` picks the worker
  facade when both `isGLWorkerEnabled()` AND
  `isWorkerGLSupported()` are true; falls back to direct or
  Canvas2D otherwise. Vite emits a separate `bitGridWorker-*.js`
  chunk (~9 KB); main bundle grew by ~3 KB. Module count: 85
  → 88. See §8 item 6 for the full architecture, async-init
  caveat, and the deliberately-skipped context-loss recovery
  in the worker path.
- ✅ **WebGL is now the default bit-fill backend.** Promoted
  out of "experimental sandbox" status (§8 step 2). Default
  `getRendererMode()` flipped from `'canvas2d'` to `'gl'` in
  `src/renderer/gl/featureFlag.js`; opt out via
  `?renderer=canvas2d`. New `SieveRenderer.skipBitFill` field
  (set per-frame in `Visualizer.jsx` to `glActive && !loweredSetBits`)
  gates only the per-bit cell-fill rectangles + background fill.
  Threaded through `_buildFrameContext()`, `_renderClear()`,
  `_drawBitBody()` (simple branch), `_drawBitFocusRange()`, and
  the per-bit cell-tint fillRect inside `_drawBitPrimeOverlay`,
  `_drawBitRangeOverlay`, `_drawBitMultiplesOverlay`. The
  dots/borders/labels in those overlays still draw on top
  (GL doesn't paint them). Lowered-3D mode forces
  `skipBitFill` back to `false` so the Canvas2D depth-shaded
  path takes over (GL has no parity); the GL wrapper also
  early-returns from upload+draw in that case so it doesn't
  burn cycles invisibly. Toggling depth mode at runtime works
  because the wrapper re-evaluates every frame. Fallback:
  if WebGL2 is unavailable in the browser,
  `BitGridGL.attach()` returns `false`, `glRendererRef`
  stays null, `skipBitFill` stays `false`, and the Canvas2D
  fillRect path is fully responsible. §8 item 2 marked ✅.

- ✅ **Locked renderer to `gl-worker` only.** Removed `featureFlag.js`
  entirely, the `RendererPicker` component from `Toolbar.jsx` (and its
  CSS block in `04-toolbar.css`), and the `rendererMode` state / ref /
  setter from `Visualizer.jsx`. The `BitGridGL` direct-mode import was
  also removed from `Visualizer.jsx`. `Visualizer.jsx` now always
  constructs `BitGridGLWorker`. If `attach()` returns `false` (browser
  lacks `OffscreenCanvas.transferControlToOffscreen`), `glRendererRef`
  stays `null`, `SieveRenderer.skipBitFill` stays `false`, and the
  Canvas2D cell-fill path handles rendering silently — the app remains
  fully functional as a fallback. `BitGridGL.js` is still present (used
  by the `parity.html` dev harness) but is no longer in the production
  runtime path.
- ✅ **Added per-theme canvas background color customisation.** Users can
  now pick a custom canvas background color for day (light) and night
  (dark) mode independently via the Settings → Colors tab. Defaults are
  white `[255,255,255]` for light and dark-grey `[40,40,40]` for dark.
  Persisted in `viewPrefs` under `canvasColors: { light, dark }`.
  Architecture: `SieveRenderer` gained a `canvasBackground` property
  (`null` = use theme default) and an `effectiveBackground` getter that
  resolves it; `_renderClear()` now reads `this.effectiveBackground`
  instead of `C.BACKGROUND` directly; the GL render call in
  `Visualizer.jsx` likewise uses `rr.effectiveBackground`. The per-theme
  defaults live in `DEFAULT_CANVAS_COLORS` in `viewPrefs.js`.

- ✅ **Wired context-loss recovery in `gl-worker` mode.** `bitGridWorker.js`
  now saves `savedCanvas` + `currentBitCount`, wires `webglcontextlost` /
  `webglcontextrestored` on the `OffscreenCanvas`, and re-inits `BitGridGLCore`
  (including `setBitCount`) on restore before posting `{ type: 'contextrestored' }`.
  `BitGridGLWorker.js` handles `contextlost` (sets `_lost`, clears fingerprint)
  and `contextrestored` (clears `_lost`, clears fingerprint — the normal
  frame loop re-uploads data without extra Visualizer-side intervention).
  Added `capture(callback)` method + `{ type: 'capture' }` / `{ type: 'captured' }`
  round-trip protocol (used by the parity harness; not called in production).
  `resize()` gained an optional `dprOverride` param (backwards-compatible).
- ✅ **Extended parity harness to cover `BitGridGLWorker`.** `parity.html`
  gained a Renderer dropdown (direct / worker). Worker mode uses a detached
  `HTMLCanvasElement` for `attach()`, calls `glWorker.capture()` for a
  round-trip `OffscreenCanvas.transferToImageBitmap()` snapshot, draws the
  `ImageBitmap` onto the display canvas (2D context) for inspection + pixel
  comparison, then calls `bitmap.close()`. Fake-host construction extracted
  into a shared `buildFakeHost()` helper. `run()` is now `async`.
  `BitGridGL.js` can now be removed (item 3 below) without losing harness
  coverage once this is verified in CI or by a reviewer.
  timeline is playing.** Root cause: the `useEffect([animMode, animStyle])`
  in `Visualizer.jsx` was designed to restart the current-event animation
  whenever the user changes animation style or mode. It did so by calling
  `stopSeqAnim()` followed by `triggerAnimation()`. But `stopSeqAnim()`
  cancels the in-flight RAF without resolving the `Promise` that the
  single-event replay loop (`pausedStepAnimLoopRef`) is `await`-ing inside
  its `triggerFn(...)` call. That permanently freezes the loop: the
  `Promise` is pending forever, `singleEventLoopActive` stays `true` (the
  play button still shows "Pause"), but no further loop iterations ever
  run. Fix: added `if (singleEventLoopActiveRef.current) return;` at the
  top of the `[animMode, animStyle]` effect (after the existing
  `initialHighlightHoldRef` guard). When the loop is active, the effect
  skips both `stopSeqAnim()` and the manual `triggerAnimation()` call.
  `triggerAnimation` is a `useCallback` that is recreated whenever
  `animMode`/`animStyle` change (they are in its dep array); the updated
  closure is written to `triggerAnimationRef.current` immediately. The
  running loop reads from that ref at the start of each iteration, so the
  new style/mode takes effect on the very next loop cycle with no
  disruption to the current one. All Layout-tab controls were subsequently
  verified to work while the loop is running: bit/byte arrangement SVG
  icons (fire React `onClick` via bubbling click events), grouping buttons
  (16bit/32bit/64bit), spacing popovers, and spacing +/− buttons all
  update state correctly without stopping the loop. No CSS `pointer-events`
  blocking or `disabled` attributes are applied to these controls during
  animation. Note that the SVG `LayoutIcon` elements must be targeted with
  `svg[title="..."]` selectors (not `img[alt="..."]`), since they are `<svg>`
  elements with a `title` child rather than `<img>` elements.

- ✅ **Ported lowered-3D shading and rise-and-settle animation to GL**
  (WebGL-worker deepening backlog items 5 and 6). A third texture
  (`animTex`, RGBA32F, same dimensions as `posTex`/`stateTex`) was added
  to `bitGridGLCore.js`. Each texel stores `(xDelta, yDelta, sizeScale, 0)`
  per bit. The vertex shader (texture unit 2) reads the texel and applies:
  `centre = basePos + u_pan + animData.xy`; `corner = centre + a_corner *
  u_cellSize * max(0.01, animData.z)`. The fragment shader adds `uniform
  float u_loweredActive`; when 1.0 a white inner-highlight stripe is
  composited at the cell edge to match the Canvas2D `strokeRect`.
  `packAnim(host, buf, slots)` in `hostStatePacker.js` fills the buffer;
  when `loweredSetBits` is off every entry is `(0, 0, 1, 0)` (identity,
  no visual change). When on, per-bit geometry is computed matching
  `_computeBitDrawState`: set bits get `sinkDrop` / `sinkShiftX` /
  `defaultSinkScale`; recently changed bits pass through the rise
  (0→0.32), peak (0.32→0.56), settle (0.56→1.0) 700 ms phases;
  cleared (raised) bits get `(0, 0, 1, 0)` (GL top face at original
  position; Canvas2D draws side-face polygons on top as before).
  `BitGridGLWorker.uploadAnim(host)` packs and transfers the buffer via
  the new `{ type: 'anim' }` worker protocol message.
  `Visualizer.jsx` calls `g.uploadAnim(rr)` each frame and passes
  `loweredActive: rr.loweredSetBits ? 1.0 : 0.0` to `g.render()`.
  `SieveRenderer._drawBitBody` lowered-cell branch wraps shadow+fill+
  stroke in `if (!f.skipBitFill)` (GL handles these). Raised-cell branch
  keeps Canvas2D side-face polygons always; top-face fill+stroke now
  guarded with `if (!f.skipBitFill)`. `_buildFrameContext` `skipBitFill`
  formula no longer has the `!this.loweredSetBits` guard (GL handles all
  lowered fills now). `_renderClear` settledCtx background fill guarded
  with `!skipBitFill` so GL clearColor shows through the settled canvas.
  NOTE: `loweredSetBits` is always `false` in the current codebase (the
  feature is dormant; `depthModeEnabled` was removed from UI). All changes
  have zero visible effect today but provide full GL capability for when
  the feature is re-enabled. `npm run build` passes clean.

---

## 7. What's worth doing next (suggested, not required)

These are concrete next-step refactors that each fit comfortably in a
single working session. Tackle them in order — earlier ones unblock later
ones:

1. **Extract `useKeyboardShortcuts` from Visualizer.jsx** — ✅ DONE.
2. **Split SettingsPanel by tab.** ✅ DONE for all three tabs
   (`LegendTab`, `AnimationTab`, `LayoutTab`). The `LayoutTab`
   extraction skipped the suggested `useSettingsBundle()` step — it
   takes ~25 props directly. If the prop list becomes hard to evolve,
   introducing the bundle as a follow-up is a non-breaking refactor.
3. **Extract the canvas-and-overlays JSX block** — ✅ DONE
   (`src/visualizer/CanvasStage.jsx`).
4. **Move `_renderSearchHighlight` and `setSearchHighlight` into a tiny
   `SearchOverlay` class** — ✅ DONE
   (`src/renderer/overlays/SearchOverlay.js`). Use it as the template
   when extracting other overlays. Good next overlay candidates, ranked
   by isolation:
   - **MaskWriteOverlay** (`SieveRenderer._renderMaskWriteOverlay`) —
     self-contained, reads `maskWriteOrder*` arrays only. Medium size.
   - **VectorTouchOrderOverlay** (`_renderVectorTouchOrder`) — reads
     `vectorTouchOrder` and a few sizing fields. Small.
   - **CachelineAnnotationsOverlay** (`_renderCachelineAnnotations`) —
     larger, reads heat-map + cacheline metrics. Save for last.
5. **Extract `Camera3D` gesture wiring** — ✅ DONE.
   Lifecycle in `src/hooks/use3DCamera.js`; gesture bodies extracted in
   item 10 below to `src/visualizer/gestures/{pan,rotate,wheel}.js`.
   The dispatcher state machine still lives inline in `Visualizer.jsx`
   on purpose (see the rule in item 10).

### New backlog (added after the round that finished tasks 4+5)

6. **Finish the SettingsPanel tab split** — ✅ DONE
   (`src/settings/LayoutTab.jsx`). Dead-prop cleanup also ✅ DONE:
   `bitAnimInterval`, `onBitAnimIntervalChange`, `storageModel`,
   `onStorageModelChange`, `customTitle`, `onCustomTitleChange`,
   `depthModeEnabled` removed from the `SettingsPanel` signature and
   from the call site in `Visualizer.jsx`. The `customTitle` state in
   `Visualizer.jsx` was removed too (its only setter was the dead
   prop). `bitAnimInterval` and `storageModel` state stays — used
   internally and by `Toolbar` / `TraceInfoPopover`.
7. **Use `SearchOverlay` as a template for other overlays** —
   ✅ ALL DONE. `MaskWriteOverlay`, `VectorTouchOrderOverlay` and
   `CachelineAnnotationsOverlay` are extracted. Overlay backlog is
   empty. The remaining `_render*` methods on `SieveRenderer` are
   either part of the main bit/cell draw pipeline (not overlays) or
   helpers consumed by multiple draw passes (`_renderCachelineHeatOverlay`,
   `_renderCachelineOutline`); leave those in place.
8. **Promote the `seekGen` / `globalPaused` / `animBusyUntil` triplet
   into a `usePlaybackClock()` hook** — ✅ DONE
   (`src/hooks/usePlaybackClock.js`). The hook is intentionally a thin
   wrapper that returns the three ref objects, so consumer code keeps
   mutating `.current` exactly as before. A follow-up that adds a
   semantic API (e.g. `pause()`, `bumpSeek()`, `claimBusy(ms)`) would be
   the next step but was out of scope.
9. **Move `viewPrefs` migration** out of `Visualizer.jsx` — ✅ DONE.
   Added `getInitialViewState()` to `src/lib/viewPrefs.js`; it reads
   storage once and resolves every persisted field (with clamping and
   legacy-`repeatAnim` migration) into a flat bundle. `Visualizer.jsx`
   captures it once via `useMemo` and feeds the values into trivial
   `useState` seeds. Adding a new persisted field now means: add a
   default + clamp helper here, add it to the bundle, add it to the
   write payload in the persistence effect. Optional follow-up: rename
   the file to `src/storage/viewPrefs.js` to match the suggested
   layout in the original backlog item; only one importer would need
   updating.
10. **Split the pointer/wheel/touch gesture `useEffect`** — ✅ DONE.
    Bodies of pan, rotate and wheel extracted to
    `src/visualizer/gestures/{pan,rotate,wheel}.js`. State machine
    (`gestureMode`, `activePointerId`, anchor coords, `didDrag`,
    `mouseRotateActive`), pointer-event wiring, hover handling, click
    handling and minimap hit-test remain inline in the useEffect by
    design. `applyRotate()` returns `{ startX, startY }` because rotate
    is a delta-from-last-event gesture; pan and wheel return nothing.
    No pinch helper was created because there is no pinch handler in
    the source today — add `gestures/pinch.js` only if/when one is
    introduced. Remaining cleanup ideas (low priority): also extract
    the secondary-button mouse-rotate fallback (`onMouseDown` /
    `onMouseMove` / `onMouseUp`) which still inlines the same rotate
    body via `applyRotate`; the duplication is intentional and small.
11. **Optional: introduce `useSettingsBundle()`** — ✅ DONE
    (`src/settings/useSettingsBundle.js`). The hook returns
    `{ s, set, setMany, incr, decr }` from a `(settings, onChange)`
    pair. `LayoutTab` consumes it locally; the prop signature stayed
    the same (the bundle is an internal ergonomic only). Reality
    check: the `(~25 → ~5)` reduction in the original suggestion was
    optimistic — most of `LayoutTab`'s props are orthogonal
    (gridOpacity, colorPreset, customColors, cachelineSize, range /
    multiples overlays, eventTitleSettings, outlineSettings, mode3D, …)
    and are *not* part of the `settings` object, so the bundle only
    consolidates two props into one. The real win is removing the
    inline `set` / `incr` / `decr` boilerplate from each tab.
    AnimationTab does not consume the bundle because it has no
    `settings` / `onChange` pair.

No open structural refactor items remain from previous rounds.

- ✅ **Removed `BitGridGL.js` (direct mode) and ported overlay borders to GL**
  (WebGL backlog items 3 and 4 below).
  - `BitGridGL.js` deleted; the parity harness `parity.html` Renderer
    dropdown removed; `parityHarness.js` updated to worker-only path.
  - `bitGridGLCore.js` vertex shader now outputs `v_uv = a_corner + 0.5`
    ([0,1]×[0,1] cell UV). Fragment shader declares `uniform float u_cellSize`
    and `in vec2 v_uv`; computes `edge = min(min(uv.x,1-uv.x), min(uv.y,1-uv.y))`
    and composites prime / range / multiples border colours at the same
    `clamp(px*k, min, max) / px` fractions as Canvas2D, only when `u_cellSize >= 4`.
    No new texture or state-byte bits required (reuses existing bits 4/5/6).
  - `SieveRenderer._drawBitPrimeOverlay`, `_drawBitRangeOverlay`,
    `_drawBitMultiplesOverlay`: `strokeRect` blocks now guarded with
    `&& !f.skipBitFill` so they're skipped when GL is active.
  - `parityHarness.js` Canvas2D reference `renderRef()` extended with a
    border-strip pass that mirrors the GL shader logic (four `fillRect`
    edge strips per overlay member per bit), so parity comparison
    remains valid.

### WebGL-worker deepening + Canvas2D removal backlog

Now that the renderer is locked to `gl-worker`, the path is clear to
deepen the GL implementation and eventually retire the Canvas2D
cell-fill code entirely. Work these in dependency order:

1. **Wire context-loss recovery in worker mode.** ✅ DONE. `bitGridWorker.js`
   saves `savedCanvas` and `currentBitCount` across context loss. On
   `webglcontextlost` (fires on the `OffscreenCanvas`): `e.preventDefault()`
   lets the browser restore, `core.markLost()` nulls GPU resources, and
   `{ type: 'contextlost' }` is posted to the main thread.
   On `webglcontextrestored`: a new `BitGridGLCore` is init'd against the
   same `OffscreenCanvas`; `core.setBitCount(currentBitCount)` re-allocates
   textures; `{ type: 'contextrestored' }` is posted.
   `BitGridGLWorker.js` handles both messages: `contextlost` sets
   `_lost = true` + clears `_layoutFingerprint` (so no messages pass during
   the blackout); `contextrestored` sets `_lost = false` + clears the
   fingerprint so the normal per-frame upload loop (`uploadPositions` +
   `uploadState` + `render`) repopulates GPU state on the very next frame
   without any extra intervention from `Visualizer.jsx`.
   `BitGridGLWorker.resize()` gained an optional third `dprOverride` param
   (backwards-compatible; production callers omit it).

2. **Update the parity harness to exercise `BitGridGLWorker`.** ✅ DONE.
   `parity.html` formerly had a Renderer dropdown (direct / worker).
   Dropdown removed in item 3 below; harness is now worker-only.
   See item 3 for full history.

3. **Remove `BitGridGL.js` (direct mode).** ✅ DONE.
   `BitGridGL.js` deleted. Renderer dropdown removed from `parity.html`.
   `parityHarness.js` updated: `BitGridGL` import and `runGL()` function
   removed; `run()` is now unconditionally the worker path. The Canvas2D
   reference in `renderRef()` was extended to draw border strips matching
   the new GL shader border pass (item 4), so parity comparison stays
   valid. `refWithoutMultiples()` retained (still needed to match the
   `multiplesOverlay=false` GL host). `hostStatePacker.js` had no
   `BitGridGL`-specific code to remove.

4. **Port overlay borders to GL.** ✅ DONE (border stroke pass).
   The `strokeRect` borders for prime / range / multiples overlays are
   now rendered inside the GL fragment shader using UV coordinates:
   - `bitGridGLCore.js` VS: outputs `v_uv = a_corner + 0.5` ([0,1] cell
     UV) alongside the existing `v_state`.
   - `bitGridGLCore.js` FS: reads `v_uv` + `u_cellSize` (already a
     uniform in VS, now also declared in FS). Computes
     `edge = min(min(uv.x, 1-uv.x), min(uv.y, 1-uv.y))` and composites
     prime / range / multiples border colours at the same
     `clamp(px*k, min, max) / px` fractions and alphas as the Canvas2D
     paths, but only when `u_cellSize >= 4.0` (matches `if (px >= 4)`
     guards). No new texture or state-byte bits required.
   - `SieveRenderer.js`: the `strokeRect` blocks inside
     `_drawBitPrimeOverlay`, `_drawBitRangeOverlay`, and
     `_drawBitMultiplesOverlay` are now guarded with `&& !f.skipBitFill`
     so Canvas2D skips them when the GL worker is active.
   - **Still Canvas2D:** dot indicators (arc/circle), text labels
     (`p` / `r` / `×`), target-bit outline (`_drawBitTargetOutline` —
     needs an extra state bit or separate texture; deferred), ghost-mask
     highlight, motion trails, search highlight, cacheline outline.
   Remaining overlay candidates (in dependency order):
   - **Target outline + focus-range stroke** — needs an extra flag (all
     8 state bits are used); approach: expand stateTex to R16UI or add
     a second 1-bit-per-bit `outlineTex`.
   - **Prime / range / multiples dots** — small Canvas2D `arc()` per
     overlay member; low cost, can port if labels are needed anyway.
   - **Cacheline outline + heat-tint overlay** — block-level rects;
     a second full-screen pass keyed to cacheline index.
   - **Ghost-mask highlights, motion trails, search highlight** —
     low priority; sparse, fast in Canvas2D.

5. **Port lowered-3D shading to GL.** ✅ DONE (animTex + u_loweredActive).
   A third texture (`animTex`, RGBA32F) was added to `bitGridGLCore.js`.
   Each texel stores `(xDelta, yDelta, sizeScale, 0)` per bit. The vertex
   shader reads `animTex` at texture unit 2 and applies: cell centre =
   `basePos + u_pan + animData.xy`; corner = `centre + a_corner *
   u_cellSize * animData.z`. The fragment shader adds `uniform float
   u_loweredActive`; when 1.0 an inner white highlight stripe is composited
   at the cell edge (matching the Canvas2D `strokeRect` highlight).
   `packAnim(host, buf, slots)` in `hostStatePacker.js` packs the per-bit
   geometry into a `Float32Array`; when `loweredSetBits` is off every entry
   is `(0, 0, 1, 0)` (no-op). `BitGridGLWorker.uploadAnim(host)` packs and
   transfers the buffer; `bitGridWorker.js` receives `{ type: 'anim' }` and
   calls `core.uploadAnimBuffer(buf)`. `Visualizer.jsx` calls
   `g.uploadAnim(rr)` each frame and passes `loweredActive` to `g.render()`.
   `SieveRenderer._drawBitBody` lowered-cell branch now wraps shadow + fill
   + stroke in `if (!f.skipBitFill) { ... }` so Canvas2D skips them when GL
   is active. `_buildFrameContext`: removed the `!this.loweredSetBits` guard
   from `skipBitFill` (GL now handles lowered fills).
   NOTE: `loweredSetBits` is currently always `false` in the codebase
   (feature dormant; `depthModeEnabled` removed from UI). All changes have
   zero visible effect today but provide full GL capability when the feature
   is re-enabled.

6. **Port rise-and-settle animation to GL.** ✅ DONE (via animTex, same
   as item 5). The same `animTex` carries the per-frame animation deltas.
   `packAnim()` replicates the rise-and-settle math from
   `_computeBitDrawState`: for bits that recently changed
   (`host.changedBitRiseAt`), it interpolates through three phases over
   700 ms (0→0.32 rising, 0.32→0.56 peak settle, 0.56→1.0 sinking) and
   sets `xDelta`, `yDelta`, and `sizeScale` accordingly. Non-animating
   set bits receive final-sink values; cleared (raised) bits receive
   `(0, 0, 1, 0)`. `SieveRenderer._drawBitBody` raised-cell branch keeps
   the Canvas2D side-face polygons always (they extend outside the cell
   boundary so GL instanced quads cannot render them), but now wraps the
   top-face `fillRect` and edge `strokeRect` in `if (!f.skipBitFill) {}`
   so GL handles those faces. `_renderClear` settledCtx background fill
   is similarly guarded with `!skipBitFill` so the GL clearColor shows
   through the settled canvas.

7. **Remove `SieveRenderer.skipBitFill` and the Canvas2D cell-fill code.**
   Blocked on items 4–6 (all remaining Canvas2D pixel work must be
   ported before this is safe). The code paths to remove are:
   `_renderClear()` background fill, `_drawBitBody()` non-lowered
   branches, `_drawBitFocusRange()` fill rect, and the
   `fillRect`-per-bit calls in `_drawBitPrimeOverlay`,
   `_drawBitRangeOverlay`, `_drawBitMultiplesOverlay`. After removal,
   the `skipBitFill` field on `SieveRenderer` and the gating in
   `_buildFrameContext()` can be deleted.
   Note: the `strokeRect` calls in those three methods are now gated
   with `!f.skipBitFill` (moved to GL shader in §7 item 4).

8. **Decide the no-OffscreenCanvas fallback.** Currently, if the browser
   lacks `OffscreenCanvas`, `BitGridGLWorker.attach()` returns `false`
   and Canvas2D silently handles everything. Once Canvas2D cell-fill is
   removed (item 7), this silent fallback disappears. Options:
   (a) ~~keep `BitGridGL.js` as a last-resort direct-mode fallback~~ —
   `BitGridGL.js` was deleted in §7 item 3; not recommended.
   (b) show a banner noting the browser is too old and degrade gracefully;
   (c) raise the minimum browser baseline to OffscreenCanvas (all
   evergreen browsers since ~2019 support it). Decide before item 7.

9. **Partial `texSubImage2D` updates.** Currently the full state texture
   is repacked every frame. At bit counts > 100 k this starts to
   matter. A dirty-region tracker (bitmask of which 64-bit words
   changed since last upload) could reduce per-frame `texSubImage2D`
   to only changed rows. Only pursue this after items 1–3 are done
   and a measured regression is found.

### Code quality & maintainability backlog

10. **Add a `useSettingsBundle()` consumer in `AnimationTab`.** Currently
    `AnimationTab` takes ~15 orthogonal setter pairs directly. It does
    not share a `(settings, onChange)` pair with `LayoutTab`, so the
    bundle's core value (replacing `set`/`incr`/`decr` boilerplate) is
    limited — but grouping the playback-timing props (`playSpeed`,
    `repeatAnim`, `delayBetweenRepeats`, `eventTimeTargets`, …) into a
    single `timingSettings` / `onTimingSettingsChange` pair would reduce
    the prop surface of `SettingsPanel` and `Visualizer` significantly.
    Extract only when the caller count grows (currently two callers).

11. **Extract `Visualizer.jsx` playback loop into a hook.** The
    all-events scheduler (`playAllRef`, `playAllLoop`, the `useEffect`
    that starts/stops it) plus the single-event replay loop
    (`pausedStepAnimLoopRef`, `singleEventLoopActiveRef`) share a
    well-defined interface: they consume `seekGenRef`, `globalPausedRef`,
    `animBusyUntilRef`, `goToStep`, and `triggerAnimation`. Extracting
    them into a `usePlaybackLoop(clock, goToStep, triggerAnimation)`
    hook would make the scheduler testable and shrink `Visualizer.jsx`
    by ~200 lines. Currently blocked on the fact that the loop closures
    capture many local `useCallback`s — the extraction requires those
    callbacks to be stabilised via refs first (same pattern as
    `triggerAnimationRef`).

12. **Stabilise `Visualizer.jsx` callback refs.** Several `useCallback`s
    are listed as deps of heavy `useEffect`s, causing those effects to
    re-run more often than necessary (e.g. every play-speed change
    re-registers the keyboard handler). Convert each to a `useRef` +
    `useEffect` pattern: store the latest closure in a ref, and wrap
    the stable ref-reader in the event listener. The `triggerAnimationRef`
    already demonstrates this pattern — extend it to `goToStepRef` and
    the export callbacks.

13. **Split `SieveRenderer._drawBitBody` further.** At ~78 lines the
    three depth-mode branches (`normal` / `lowered` / `raised`) are the
    largest remaining private method after the render-refactor. Each
    branch could become `_drawBitBodyNormal`, `_drawBitBodyLowered`,
    `_drawBitBodyRaised` — selected by a dispatch at the top of
    `_drawBitBody`. No behaviour change; purely a readability win.
    Prerequisite for porting lowered-3D to GL (WebGL backlog item 5).

14. **Introduce lightweight integration tests.** The only safety net is
    `npm run build`. Suggested minimal additions:
    - A Vitest unit test for `traceParser.js` covering each input
      format (JSON v2, JSON v3, `STEP` text, dump) against a fixture.
    - A Vitest unit test for `animationTiming.js` verifying tier
      boundaries (no DOM needed).
    - A Playwright smoke test that loads the sample trace, plays for
      3 seconds, and asserts no console errors and a non-blank canvas.
    Start with the parser tests — they are pure and have zero setup cost.

15. **Audit `Visualizer.jsx` `useState` seed values.** Since
    `getInitialViewState()` was introduced, a handful of `useState`
    calls still inline their own `readViewPrefs()` calls (added before
    the centralisation). Grep for `readViewPrefs()` inside `Visualizer`
    and migrate any survivors to the `initState` bundle. Keeps the
    "storage is read exactly once" invariant clean.

16. **Extract the minimap render + hit-test into a `MinimapRenderer`
    class.** The minimap is currently drawn inline in `SieveRenderer`
    across three methods (`_renderMinimap`, `_renderMinimapViewport`,
    and the hit-test inside `canvasToBitIndex`). A small `MinimapRenderer`
    class following Pattern D would isolate it from the main draw pipeline
    and make the hit-test logic independently legible. Low priority while
    the minimap is feature-stable.

17. **Review `ColorsTab` import of `COLOR_PRESETS` from `SieveRenderer`.**
    `ColorsTab.jsx` currently imports `COLOR_PRESETS` directly from
    `../SieveRenderer` — this couples a settings UI component to the
    renderer module. Moving `COLOR_PRESETS` into `src/renderer/constants.js`
    (where the other renderer constants live) and re-exporting from
    `SieveRenderer` for backwards compatibility would clean the dependency
    direction. Verify no circular import is introduced.

18. **Add `propTypes` or TypeScript types to the top-level component
    boundaries.** `Visualizer.jsx`, `SettingsPanel.jsx`, and `StepPanel.jsx`
    have large prop surfaces with no runtime or compile-time checking.
    Even minimal `PropTypes` validation catches accidental prop renames
    immediately. Full TypeScript migration is out of scope but adding
    `// @ts-check` + JSDoc `@param` types to the key hooks is a low-cost
    middle ground.

### Performance backlog

19. **Profile `goToStep` at large trace sizes.** `goToStep` currently
    replays every event from the start on scrub-back (the incremental
    forward path is fast; backward is O(n)). For traces with > 1 000
    events this becomes noticeable. Mitigations in order of complexity:
    (a) cache periodic snapshots of `bitState` at every 100th event;
    (b) use a persistent data structure (e.g. a copy-on-write bit array);
    (c) limit backward-scrub to the incremental path + prohibit it
    (UX trade-off). Measure before committing to any approach.

20. **Throttle settings-panel re-renders during rapid slider input.**
    The spacing sliders and event-timing sliders in `LayoutTab` and
    `AnimationTab` fire on every `input` event. Each fires a state update
    in `Visualizer.jsx`, which re-renders the entire toolbar. Wrapping
    the slider `onChange` in a `useTransition` or debouncing at
    50 ms would keep the canvas frame rate stable during slider drags.

21. **Lazy-load `traceParser.js` and the renderer on first trace open.**
    Currently both modules are in the main bundle. `traceParser.js`
    (~690 lines) and `SieveRenderer.js` (~2 800 lines) are not needed
    until the user actually opens a file. A dynamic `import()` inside
    `App.jsx`'s file-open handler would move them to a split chunk,
    reducing initial load time for the welcome screen.

### Stability / reliability backlog

22. **Guard the `captureStream` path against hidden canvas.** §5 notes
    that video export breaks when the canvas is `display: none`. Add a
    pre-export assertion in `useTraceExport.js` that the canvas element
    is visible (`offsetParent !== null`) and surface a user-visible error
    if it is not, rather than producing a silent empty recording.

23. **Worker error surfacing.** `bitPrePassClient.js` drops worker errors
    silently (falls back to synchronous compute). `BitGridGLWorker.js`
    has no error handler on the worker `MessageChannel`. Add `onerror`
    handlers that post to a central `console.error` + (optionally) a
    React error-boundary notification so failures surface during
    development.

24. **Consolidate `pendingResizeAnchorRef` logic.** The panel-collapse
    pan-compensation path (§5 minefield) is fragile and spread across
    five toggle handlers. A single `setPanelState(newState, anchorBit)`
    helper that stashes the anchor and flips the panel state atomically
    would be less error-prone. Extract only after the current shape has
    proven stable across multiple panel-combination toggles.

5. **Port lowered-3D shading to GL.** ✅ DONE — see item 5 in the
   WebGL-worker deepening backlog above.

6. **Port rise-and-settle animation to GL.** ✅ DONE — see item 6 in the
   WebGL-worker deepening backlog above.

7. **Remove `SieveRenderer.skipBitFill` and the Canvas2D cell-fill code.**
   Blocked on items 4–6 (all remaining Canvas2D pixel work must be
   ported before this is safe). The code paths to remove are:
   `_renderClear()` background fill, `_drawBitBody()` non-lowered
   branches, `_drawBitFocusRange()` fill rect, and the
   `fillRect`-per-bit calls in `_drawBitPrimeOverlay`,
   `_drawBitRangeOverlay`, `_drawBitMultiplesOverlay`. After removal,
   the `skipBitFill` field on `SieveRenderer` and the gating in
   `_buildFrameContext()` can be deleted.

8. **Decide the no-OffscreenCanvas fallback.** Currently, if the browser
   lacks `OffscreenCanvas`, `BitGridGLWorker.attach()` returns `false`
   and Canvas2D silently handles everything. Once Canvas2D cell-fill is
   removed (item 7), this silent fallback disappears. Options:
   (a) ~~keep `BitGridGL.js` as a last-resort direct-mode fallback~~ —
   `BitGridGL.js` was deleted in §7 item 3; not recommended.
   (b) show a banner noting the browser is too old and degrade gracefully;
   (c) raise the minimum browser baseline to OffscreenCanvas (all
   evergreen browsers since ~2019 support it). Decide before item 7.

9. **Partial `texSubImage2D` updates.** Currently the full state texture
   is repacked every frame. At bit counts > 100 k this starts to
   matter. A dirty-region tracker (bitmask of which 64-bit words
   changed since last upload) could reduce per-frame `texSubImage2D`
   to only changed rows. Only pursue this after items 1–3 are done
   and a measured regression is found.

---

## 8. Renderer performance roadmap (worker + WebGL)

The two big "ask first" items above were discussed and partially started.
Read this whole section before extending either.

### Why the current pipeline is slow at scale

`SieveRenderer.render()` issues one `ctx.fillRect()` per visible bit per
frame (see lines 718, 841, 1750, 1816, 1850, 1883). At large `bitCount`
that's the bottleneck — not CPU contention with React. Two orthogonal
levers:

| Lever | What it fixes | What it doesn't fix |
|---|---|---|
| **Worker pre-pass** | Main-thread jank from cold computations (prime-flag table, heat-map maintenance, mask diffing) running synchronously inside `setState()` | Per-`fillRect` cost. The draw loop still runs on the main thread. |
| **WebGL bit grid** | Per-bit draw-call cost. One instanced/fullscreen-quad draw replaces N `fillRect`s. | CPU work *outside* the bit pass (overlays, labels, cacheline outlines). |

Both are useful; they stack. Start with the worker (low risk) and treat
the GL path as opt-in until parity is reached.

### Step 1 — Worker pre-pass (DONE, see §6 entry below when added)

Scope: only the **cold, pure** computations move. Drawing stays on the
main thread.

- Worker file: `src/renderer/workers/bitPrePass.worker.js`. Spawned via
  `new Worker(new URL('./workers/bitPrePass.worker.js', import.meta.url),
  { type: 'module' })` so Vite can bundle it.
- Today only `buildPrimeOverlay()` is moved. It is the only pre-pass
  that is both (a) noticeably expensive at large `sieveSize` and (b)
  trivially pure (inputs: `sieveSize`, `bitCount`, `storageModel`;
  output: `Uint8Array` of per-bit prime flags).
- The renderer keeps a synchronous fallback. If the worker isn't
  supported (e.g. SSR, certain Electron contexts) or hasn't replied yet,
  `buildPrimeOverlay()` computes inline exactly as before.
- The contract is fire-and-forget: the renderer kicks off a worker job
  whenever `(sieveSize, bitCount, storageModel)` changes; when the
  worker replies it stores the flags and triggers a re-render via the
  optional `onReady` callback wired in `Visualizer.jsx`. Stale replies
  (key mismatch) are dropped.
- **Do not** move `setState()` itself, mask diffing, heat-map updates,
  or the per-frame `_buildFrameContext()` chain into the worker. Those
  paths read/write live renderer state and would force a serialization
  protocol that costs more than it saves at this app's data sizes.

### Step 2 — WebGL bit grid (DEFAULT path; gl-worker only)

A WebGL2 worker renderer at `src/renderer/gl/BitGridGLWorker.js` is now
the unconditional production backend for the per-bit cell-fill pass.
`featureFlag.js`, the `RendererPicker` UI button, and the `rendererMode`
runtime state have all been removed (see §6). `BitGridGL.js` (direct mode)
still exists for the `parity.html` dev harness but is not part of the
production load path.

- `Visualizer.jsx` always constructs `new BitGridGLWorker()`. If
  `attach()` returns `false` (browser lacks
  `OffscreenCanvas.transferControlToOffscreen`), `glRendererRef` stays
  `null`, `SieveRenderer.skipBitFill` stays `false`, and Canvas2D
  silently handles everything — the app stays functional.
- The renderer draws **per-bit instanced quads** — one
  `drawArraysInstanced` call per frame. Layout positions come
  from `SieveRenderer.bitIndexToCanvas`, packed into an `RG32F`
  `posTex`; per-bit flags (set / changed / ghost / repeated /
  prime / range / multiples / focus) come from an `R8UI`
  `stateTex`. Pan is a vertex uniform; the position texture is
  rebuilt only when a layout fingerprint changes (zoom,
  pixelSize, layouts, grouping, spacing, storage model, bit
  count, css size). The vertex shader DPR-snaps each quad
  corner so cell edges align with backing-store texels at any
  DPR.
- The Canvas2D layer above paints everything GL doesn't:
  ghost-mask highlights, target outlines, prime/range/
  multiples dots + borders + 'p'/'r' labels, cacheline outline
  + heat overlay, motion trails, vector touch order, mask write
  overlay, search highlight, bit/byte/vector labels, minimap.
  `SieveRenderer.skipBitFill` (set per-frame in `Visualizer.jsx`)
  gates only the cell-fill rectangles + background fill so the
  GL canvas underneath shows through.
- Lowered-3D mode (`loweredSetBits`) has no GL parity by
  design — see §7 backlog item 5. When on, the Canvas2D bit-fill
  takes over and GL skips its uploads/draw.
- Visual diff harness lives at `parity.html` (Vite dev only;
  open at `http://localhost:5173/parity.html`). Drives `BitGridGL`
  (direct mode) against a Canvas2D reference — see item 5 below.
  Updating it to exercise `BitGridGLWorker` is §7 backlog item 2.
- Context loss is handled in direct mode only. The worker path
  does not yet implement context-loss recovery — see §7 backlog
  item 1.

### Open work before WebGL can replace Canvas2D

Tracked here so the next agent doesn't think the GL path is "almost
done":

1. **Layout parity.** ✅ *Done.* All `BIT_LAYOUTS`,
   `BYTE_LAYOUTS`, vector grouping, cacheline grouping, custom
   grouping and frozen wrapping flow through automatically because
   `BitGridGL.uploadPositions(host, fingerprint)` walks
   `host.bitIndexToCanvas(i)` for every bit. `mode3D` is handled
   by the parent `camera3DContainerStyle` CSS transform in
   `CanvasStage.jsx`. DPR is handled by the vertex shader
   snapping each quad corner to the device-pixel grid
   (`floor(corner * u_dpr + 0.5) / u_dpr`), mirroring the
   `Math.round` calls in the Canvas2D fillRect path.
2. **Color parity.** ✅ *Done at scope.* Shader handles
   set / cleared / changed / ghost-mask / repeated using uniforms
   from `_bitColors()` and `_opColor()`, **plus** the four
   cell-fill overlays focus / prime / range / multiples (tints
   hard-coded in the FS to match Canvas2D). Custom theme
   colours (`customSetBit` / `customClearedBit` / preset swap)
   are picked up automatically because `_bitColors()` is
   resolved every frame at the JS boundary. Target outline
   stroke + hit-count gradient, prime/range/multiples
   dots+borders+labels, and ghost-mask highlights stay
   Canvas2D-on-top by design (line strokes and per-bit text
   that GL doesn't paint). **Lowered-3D shading + rise-and-
   settle has no GL parity by design** — it would multiply
   per-bit geometry (shadow + base + top + side faces) and
   triple the shader's branching for a 3D-only effect. When
   `loweredSetBits` is on, `SieveRenderer.skipBitFill` is
   forced to `false` and the Canvas2D bit-fill takes over
   (GL skips its uploads + draw call entirely; its canvas
   stays hidden behind the now-opaque main canvas). Toggling
   depth mode at runtime works because the wrapper in
   `Visualizer.jsx` re-evaluates `skipBitFill` every frame.
3. **State texture protocol.** ✅ *Done at current scope.*
   One `R8UI` `stateTex`, one byte per bit, packed bits
   `set | changed | ghost | repeated | prime | range | multiples |
   focus`, repacked every render in JS (`uploadState(host)`).
   Full-repack cost measured negligible at typical bit counts
   (10k bits in well under a frame). Partial `texSubImage2D`
   updates and a separate `targetHitCounts` magnitude texture
   are the natural next steps **only if** lowered-3D / hit-count
   gradient shading land in items 1–2 — i.e. when there are
   features that actually consume a richer per-bit payload.
4. **Hit-testing.** ✅ *Enforced.* `bitIndexToCanvas()` /
   `canvasToBitIndex()` are the JS-side authoritative layout
   helpers. The GL canvas is layered *under* the Canvas2D input
   layer with `pointer-events: none` (set both in `07-canvas.css`
   and defensively in `BitGridGL.attach()`). Any future GL-side
   hit-test must call `host.canvasToBitIndex(x, y)` rather than
   re-deriving layout from GL state — see the JSDoc on
   `BitGridGL.attach()`.
5. **Visual diff harness.** ✅ *Done (minimal).* `parity.html`
   at the project root, served by Vite in dev (not bundled into
   the production build — confirmed by module count staying at
   85). Loads `src/dev/parityHarness.js`, builds a synthetic
   1024-bit grid with deterministic state + flag patterns,
   renders it twice (Canvas2D `fillRect`-per-bit reference vs.
   `BitGridGL.render()` driven by a fake host that exposes only
   `bitIndexToCanvas`, `bitState`, `changedBits`, `maskGhostBits`,
   `repeatedChangedBits`, `_primeBitFlags`, range / focus
   bounds), and reads back both canvases via `getImageData` for
   a per-pixel max-channel-delta diff. Reports maxΔ, meanΔ,
   strict-mismatch %, and `>8/255` mismatch %. The harness only
   pins what GL claims to do (base bit pass + four cell-fill
   overlays), not the full `SieveRenderer` (lowered-3D, labels,
   minimap, outlines, etc., all stay Canvas2D-on-top by
   design). The multiples overlay is excluded from the
   reference because the production host walks
   `bitToNumber(i, storageModel)` while the harness uses `i`
   directly; range/focus/prime exercise the same shader
   composite path so the omission doesn't reduce coverage.
6. **Step 3 — OffscreenCanvas worker dispatch.** ✅ *Done.*
   Opt-in via `?renderer=gl-worker`. The GL canvas is handed to
   a module worker (`src/renderer/gl/bitGridWorker.js`) via
   `transferControlToOffscreen()`; the WebGL2 context lives in
   the worker, the main thread only walks the host (via
   `hostStatePacker`) and posts pre-packed Float32/Uint8
   buffers as transferables. Position buffers are gated by the
   layout fingerprint (same as direct mode); state buffers are
   posted every frame. Buffers are NOT round-tripped — the main
   thread allocates fresh per upload. This adds ≤ ~256 KB/frame
   of GC at 100 k bits, which is well below problem
   thresholds, and keeps the message protocol strictly
   one-way.

   Architecture: `bitGridGLCore.js` is the pure-WebGL2
   substrate (no `window`/`document` references; runs in either
   thread). `BitGridGL` and `BitGridGLWorker` are sibling
   facades over it with identical external API
   (`attach`/`resizeForBitCount`/`uploadPositions`/`uploadState`/`resize`/`render`/`invalidateLayout`/`dispose`).
   `Visualizer.jsx` picks one at attach time based on
   `isGLWorkerEnabled()` AND `isWorkerGLSupported()`; if the
   browser lacks `OffscreenCanvas.transferControlToOffscreen`,
   the worker facade returns `false` from `attach()` and the
   Canvas2D layer keeps drawing on top either way (no
   regression).

   Worker bundle: Vite emits a separate
   `bitGridWorker-*.js` chunk (~9 KB at the time of writing).
   Main bundle grew by ~3 KB for the facade + flag plumbing.

   Caveats:
     - Worker init is async. The facade buffers
       `setBitCount`/`resize`/`positions`/`state`/`render`
       messages until the worker posts `ready`, then flushes.
       First-frame latency is therefore one extra
       message-loop turn.
     - Context-loss recovery is NOT yet wired in worker mode.
       The direct path handles `webglcontextlost`/`restored`;
       the worker would need to re-init the `BitGridGLCore` and
       re-allocate textures on its side, then have the main
       thread re-send `setBitCount` + force a fingerprint
       repack. Not implemented because the worker context is
       isolated from the page lifecycle and rarely loses
       — leave for a "Don't fix unbroken things" reason.
     - The visual-diff harness (`parity.html`) tests
       `BitGridGL`, not `BitGridGLWorker`. Both use
       `BitGridGLCore` and the same `hostStatePacker`, so the
       harness still pins the rendering algorithm; it just
       doesn't exercise the worker round-trip. A
       `?renderer=gl-worker` mode for the harness would need
       async result collection.

### Don't

- Don't expand the GL renderer beyond the base bit pass without an
  explicit ask. A half-finished GL path that silently misses overlay
  state is worse than no GL path.
- Don't move `setState()`, mask diffing or heat-map updates to the
  worker without a measured perf reason. They touch live renderer
  state and the round-trip cost dominates at this app's data sizes.
- Don't remove the Canvas2D *overlay* code (labels, outlines,
  cacheline, minimap) prematurely. The Canvas2D layer is still the
  authoritative renderer for everything above the cell-fill plane.
  The cell-fill path (`skipBitFill` gating) is the only part targeted
  for removal — and only after the §7 backlog items 4–8 are done.
- Don't remove the `OffscreenCanvas` feature-detect in
  `BitGridGLWorker.attach()`. The silent Canvas2D fallback it enables
  is the only thing keeping the app functional on older browsers while
  the GL path matures.

