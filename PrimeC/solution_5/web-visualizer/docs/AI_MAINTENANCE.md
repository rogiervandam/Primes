# AI Maintenance Guide

> Read this first. It exists to keep AI agents (and humans) from re-doing
> work, breaking subtle invariants, or producing massive regressions in the
> visualizer codebase.

Prompt for refactor:

Read @file:docs/AI_MAINTENANCE.md, @file:docs/ARCHTECTURE.md and @file:COMPONENTS.md. Look at the AI_MAINTENANCE.md and select tasks from the backlog that fit together in one session. Perform these tasks and update the documents with what has been done and add to the backlog remaining work to do. Give a summary of what was done and what should be tested.



The web visualizer is a long-lived React/Vite app with **three** large files that historically attract most of the changes:

| File                         | Lines  | Role                                                             |
| ---------------------------- | ------ | ---------------------------------------------------------------- |
| `src/Visualizer.jsx`         | ~4 190 | Stateful orchestrator: trace, playback, viewport, hover, exports |
| `src/SieveRenderer.js`       | ~2 800 | 2D canvas renderer (sieve grid, overlays, animations)            |
| `src/settings/LayoutTab.jsx` | ~900   | Layout tab (extracted from former SettingsPanel monolith)        |

`SettingsPanel.jsx` itself is now ~260 lines — just the tab-row shell.
The former hotspot is replaced by `LayoutTab.jsx` and `AnimationTab.jsx`
(~545 lines) as the next-largest settings files.

---

## 1. Golden rules

1. **Always run `npm run build` after every edit.** The codebase has no test
   suite — the build (Vite + React) is your only automated safety net.
   Stages of work that pass the build are commit-worthy; stages that don't
   are broken.
1. **Don't reorder hooks across the lazy-closure boundary.** `useEffect`
   bodies routinely reference functions declared further down in
   `Visualizer.jsx` (e.g. `exportVideo`, `triggerAnimation`). This works
   because the effect callback is captured lazily and only invoked after the
   render pass completes. Keep that property when extracting code.
1. **Never break the renderer's `setState` shape.** Both
   `useTraceExport.js` and `Visualizer.jsx::triggerAnimation` call it with
   the same 7-argument signature. If you must extend it, take an options
   object and keep positional arguments backwards-compatible.
1. **Persistence keys are forever.** Anything written to `viewPrefs`
   (localStorage `sieve-visualizer:view-preferences:v1`) is on real users'
   machines. Add new keys; don't rename or repurpose existing ones. Use the
   `merge*` helpers in `src/lib/viewPrefs.js` to reconcile partials.
1. **Don't add features without removing equivalent dead code first.** When
   in doubt, grep the entire `src/` tree (and the `dist/` artefact too —
   minified code can confirm whether something is reachable in production).
1. **Don't write documentation files unless asked or strictly necessary.**
   Update existing docs (`ARCHITECTURE.md`, `COMPONENTS.md`, this file)
   instead of creating new ones.

---

## 2. Where to put new code

| You are adding…                      | Put it in…                                     |
| ------------------------------------ | ---------------------------------------------- |
| A pure helper (math, string, format) | `src/lib/`                                     |
| A reusable React hook                | `src/hooks/`                                   |
| A pure trace-format parser           | `src/parser/` and import from `traceParser.js` |
| A renderer drawing helper / palette  | `src/renderer/`                                |
| A new visualization mode             | `src/renderers/MyMode.js` (see §4)             |
| A new settings sub-control           | `src/settings/` (presentational)               |
| A toolbar/overlay piece              | `src/visualizer/`                              |
| A style block                        | `src/styles/NN-name.css` + add to `index.css`  |

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
1. Move it to `src/hooks/useFoo.js` with explicit `{ inputs }` and a return
   object.
1. Replace inline state declarations with the hook call.
1. **Place the hook call AFTER any function it depends on (e.g. `goToStep`)
   but BEFORE the first JSX usage.** Lazy closure handles the rest.
1. `npm run build`.

### Pattern B — extract repeated controlled-input boilerplate

Already done with: `useDraftInput` (range start/end, multiples prime).

The "draft text + commit on blur/Enter" pattern occurs frequently. Use
`src/hooks/useDraftInput.js`. Don't reinvent it.

### Pattern C — split a long render body into siblings

Pending for: `SettingsPanel.jsx` (currently three large tab branches),
`Visualizer.jsx` JSX body (canvas + overlays + balloons).

1. Identify a self-contained chunk of JSX that uses a small subset of the
   parent's state.
1. Move it to `src/visualizer/MyChunk.jsx` (or `src/settings/MyTab.jsx`).
1. Pass only the props it actually consumes — count them first; if the
   number exceeds ~12, the chunk isn't really "self-contained" yet.
1. **Don't introduce React Context just to dodge prop counts.** Plain props
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
- **Inline React components inside `LayoutTab` break button interactions
  during animation.** `LayoutTab` re-renders on every animation frame
  (because `Visualizer.jsx`'s `setStepScrubProgress` propagates down
  the component tree without memoization). Any `const Foo = () => {...}`
  defined inside `LayoutTab`'s function body is a *new* function
  reference each render. Rendering `<Foo />` JSX causes React to see a
  new component type → unmount old subtree → mount fresh subtree,
  destroying DOM elements mid-click. The fix is to call such functions
  directly (`{Foo()}`) rather than through JSX, or to define them at
  module level. `LayoutOverview` was changed to a direct call in §6;
  `SpacingControl` (still inside `LayoutOverview`) follows the same
  pattern on each `LayoutOverview()` invocation and is tolerated because
  its popover state lives in `LayoutTab`. Do not introduce new
  `<InlineComponent />` patterns inside `LayoutTab`.
- **Do NOT call `glRendererRef.current.dispose()` from any cleanup effect.**
  `OffscreenCanvas.transferControlToOffscreen()` is a one-shot, irreversible
  operation on an `HTMLCanvasElement`. Calling `dispose()` in a React cleanup
  effect terminates the worker permanently. In `React.StrictMode` (always on
  in `npm run dev`) every effect runs cleanup+setup twice; if dispose is in
  the cleanup, the second setup run finds the canvas already transferred but
  the worker dead — all `_post()` calls silently become no-ops and GL
  rendering disappears (bit fills, focus tints, overlay tints and borders all
  invisible). The GL worker must live for the full lifetime of the `Visualizer`
  component. Let the browser terminate it on page unload. `dispose()` is kept
  for test harnesses and the parity harness; just don't call it from effects.

---

## 6. What's been done already

Track refactors here so the next agent doesn't redo them. Append; don't
overwrite.

- ✅ Added `<` / `>` detail-level buttons to the Events panel
  (`EventsPanel.jsx`). The buttons flank the existing log-level `<select>` in
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
- ✅ Persisted `colorPreset` and `customColors` to `viewPrefs` localStorage.
  Added `DEFAULT_COLOR_PREFS`, `initialColorPreset`, and `initialCustomColors`
  to `src/lib/viewPrefs.js`; both fields now appear in `getInitialViewState()`
  and in the `writeViewPrefs` effect + dependency array in `Visualizer.jsx`.
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
- ✅ **Clickable legend items** (`onAction` prop on `LegendSections`).
  Overlay and animation-style rows in the legend are now interactive.
  Clicking a row executes the associated settings toggle and switches the
  settings sidebar to the relevant tab (Layout for overlays, Animation for
  animation styles). If the legend is floating when clicked, it docks
  itself and re-opens the sidebar on the correct tab. Implementation:
  `LegendSections` accepts `onAction(key)` where keys are `'primeOverlay'`,
  `'rangeOverlay'`, `'multiplesOverlay'`, `'heatMap'`, `'animRipple'`,
  `'animFade'`, `'animPulse'`, `'animSequential'`. Each actionable row is
  wrapped in a `role="button"` div with `.legend-row--actionable` class
  (cursor: pointer + hover highlight + ⚙ badge). `SettingsPanel` builds
  `legendActions` with `useCallback` and passes it to both `LegendTab`
  and the floating `LegendSections`. `LegendTab` threads it through as
  `onAction`. No new files; pure prop addition.
- ✅ **Fixed minimap overlap on macOS** (`minimapRightInset` bug). The
  hardcoded `360 px` right-inset was smaller than the Mac settings panel
  (`388 px per .platform-mac .settings-sidebar { width: 388px }`), causing
  the minimap to overlap the panel by ~18 px. Both `r.minimapRightInset`
  (in the `[settingsCollapsed, isMacPlatform]` effect) and `sideInsetRight`
  (balloon clamping helper) now use `isMacPlatform ? 388 : 328`.
- ✅ **Timeline wipe during inter-event delay** (all-events playback parity).
  The `StepAnimSliders` wipe animation already fired during single-event
  repeat delays. Removed the `&& singleEventLoopActiveRef.current` guard
  from all 4 `setDelayPhaseMsRef.current(delayMs)` call sites inside
  `triggerAnimation` (after mask stamp, after sequential/bounce, after
  `animStyle === 'none'`, and after the ripple/fade/pulse effect). The
  wipe now triggers whenever `delayMs > 0`, covering both the
  `delayBetweenRepeats` (single-event loop) and `delayBetweenEvents`
  (all-events playback) paths. Pause-in-flight works correctly for both
  because `waitForDelay` checks `globalPausedRef.current`, which is
  set/cleared in sync with `animationReplayPaused`.
- ✅ **Auto-hide topbar transport when all-events widget is visible.**
  `controlsHidden` is now a derived value (`stepsPanelCollapsed &&
  !allEventsWidgetHidden`) instead of a persisted user-toggled state.
  The topbar transport (play/pause + scrubber) hides automatically when
  the floating all-events widget is showing, and re-appears when the
  events panel is expanded or the widget is docked. Removed: the
  eye/eye-off `toolbar-immersive-toggle` button, the ▼
  `toolbar-show-events-widget` re-show button, the `toggleControlsHidden`
  callback, the H keyboard shortcut, `initialControlsHidden` from
  `viewPrefs.js`, and the dead `.toolbar-immersive-toggle` /
  `.toolbar-show-events-widget` CSS. `toggleStepsPanel` now calls
  `setAllEventsWidgetHidden(false)` on every toggle so collapsing the
  panel reliably shows the widget (undoes any prior dock gesture).
- ✅ **Fixed Annotation and Grouping-outline buttons not responding during
  single-event animation playback.** Root cause: `LayoutOverview` was
  defined as a React component *inside* `LayoutTab`'s function body.
  On every `LayoutTab` re-render (which happens on every animation frame
  because `setStepScrubProgress` propagates up the component tree from
  `Visualizer.jsx` → `SettingsPanel` → `LayoutTab`), `LayoutOverview`
  was a new function reference. React identified it as a new component
  type and **unmounted the old `LayoutOverview` subtree and mounted a
  fresh one** — destroying the DOM elements for the Annotations and
  Grouping-outline buttons between mousedown and mouseup, so clicks
  never registered. The Grid view section (rendered outside
  `LayoutOverview` in `LayoutTab`'s main return) used stable
  module-level `PreviewOptionButton` references and was unaffected.
  Fix: changed `<LayoutOverview />` (JSX component invocation, which
  triggers React's component-lifecycle machinery) to `{LayoutOverview()}`
  (direct function call) in `LayoutTab`'s main return. React now
  integrates the returned JSX as part of `LayoutTab`'s own render
  output; the module-level `AnnotationButton` and `PreviewOptionButton`
  elements it returns have stable type references and are reconciled
  in-place — no unmount/remount during animation.
  **Minefield note:** `SpacingControl` is still defined inside
  `LayoutOverview`; when `LayoutOverview()` is invoked on each render,
  `SpacingControl` is a new function. Any `<SpacingControl />` usage in
  the Arrangements section will still unmount/remount per render.
  This is accepted because: (a) the spacing popover state lives in
  `LayoutTab`, not in `SpacingControl`, so it survives the remount;
  (b) the user did not report spacing controls as broken. If spacing
  controls ever become a problem, promote `SpacingControl` to a
  module-level component and pass `openSpacingControl`,
  `setOpenSpacingControl`, `s`, `incr`, `decr` as props — five props
  that cover all its needs.
  **General rule for LayoutTab:** Never define a React component
  (`const Foo = () => {...}`) inside `LayoutTab`'s function body and
  then render it as `<Foo />`. Use direct function calls (`{Foo()}`),
  module-level components, or proper child components with props. The
  problem recurs silently otherwise because no ESLint rule flags it.
- ✅ Added widget join/split feature. New `src/visualizer/JoinedEventsWidget.jsx`
  merges the floating all-events transport widget and the single-event
  `EventTitleBanner` into one draggable panel when the user drags one onto
  the other. `widgetsJoined` boolean state in `Visualizer.jsx` persisted via
  `viewPrefs`. Join detection uses `document.querySelector` proximity (40 px
  hit-pad) in both `EventsPanel`'s and `EventTitleBanner`'s `detectDropZone`
  helpers, returning `'joinWidget'`. A `merge-target` CSS class is toggled on
  the target widget during drag. The joined widget has a ⊡ split button that
  plays a `@keyframes joined-widget-split` (scale+fade-out, 320 ms) then
  resets `widgetsJoined`. Appear animation: `@keyframes joined-widget-appear`
  (scale 0.88→1 + fade). `toggleStepsPanel` and `revealCurrentStepInPanel`
  call `setWidgetsJoined(false)` when the panel opens; `JoinedEventsWidget`'s
  expand-panel button also splits first. CSS in `src/styles/18-joined-widget.css`.
- ✅ **Removed `willReadFrequently: true` from Canvas2D context acquisition.**
  `SieveRenderer.attach()` and `attachSettledCanvas()` previously passed
  `{ willReadFrequently: true }` to `canvas.getContext('2d', ...)`.
  This hint tells the browser that `getImageData` will be called frequently,
  causing Safari to disable GPU acceleration for the canvas and switch to a
  software renderer — making rendering very slow on macOS Safari compared
  to Chrome/Edge. The hint was incorrect: `getImageData` is never called on
  these canvases in the production rendering path (only in the dev-only
  `parityHarness.js`). Both calls now use plain `canvas.getContext('2d')`.
- ✅ **Renamed StepPanel → EventsPanel throughout the codebase.**
  `StepPanel.jsx` → `EventsPanel.jsx`; CSS files `06-step-panel.css` →
  `06-events-panel.css` and `14-step-panel-collapsible.css` →
  `14-events-panel-collapsible.css`. All CSS class names updated:
  `.step-panel` → `.events-panel`, `.step-panel-*` → `.events-panel-*`,
  `.step-item` → `.event-item`, `.step-list` → `.event-list`,
  `.step-group*` → `.event-group*`, `.step-search` → `.event-search`,
  `.step-filter` → `.event-filter`, `.step-depth-*` → `.event-depth-*`,
  `.step-agg-*` → `.event-agg-*`, `.step-num/op/changes/prime/text` →
  `.event-num/op/changes/prime/text`, `.step-level-*` → `.event-level-*`.
  React state / callbacks renamed: `stepsPanelCollapsed` →
  `eventsPanelCollapsed`, `setStepsPanelCollapsed` →
  `setEventsPanelCollapsed`, `toggleStepsPanel` → `toggleEventsPanel` in
  `Visualizer.jsx`, `CanvasStage.jsx`, `Toolbar.jsx`,
  `EventTitleBanner.jsx`, `JoinedEventsWidget.jsx`.
  `viewPrefs.js` `initialPanelVisibility()` migrates the legacy
  `stepsPanelCollapsed` key to `eventsPanelCollapsed` for users with saved
  prefs (reads new key first; falls back to old key; default: collapsed).
  All docs updated (ARCHITECTURE.md, COMPONENTS.md, BACKLOG.md).
- ✅ **Split `SieveRenderer._drawBitBody` into three focused methods.**
  `_drawBitBody` is now a 10-line dispatcher that calls
  `_drawBitBodyLowered` (sunken set-bit with drop shadow + inner
  highlight), `_drawBitBodyRaised` (3D-box raised bit with side-face
  polygons and optional GL-deferred top face), or `_drawBitBodyNormal`
  (flat bit fill). Each method has a JSDoc summary explaining the GL
  interaction. No logic changes — purely structural. Addresses §7 item 13.
- ✅ **Stabilised keyboard shortcut handler (item 12 partial).**
  `useKeyboardShortcuts` now stores all handler inputs in an internal
  `handlersRef` object (updated inline on every render) and registers
  the `keydown` listener exactly once (empty `useEffect` dep array).
  The listener reads current values via `handlersRef.current`, so it
  never tears down and re-registers when `currentStep`, `goToStep`,
  `handlePlayPause`, or any other dep changes during playback. The hook
  signature is unchanged; callers pass the same props as before.
  Added `goToStepRef` to `Visualizer.jsx` (a stable always-current ref)
  and switched the play/pause scheduler `useEffect` to call
  `goToStepRef.current(next, ...)` — removing `goToStep` from its dep
  array so the scheduler is not torn down and rebuilt on every step.
  Both changes follow the existing `triggerAnimationRef` pattern
  documented in §3 Pattern A.
- ✅ **Lazy-loaded Visualizer + traceParser (item 21).**
  `App.jsx` uses `React.lazy(() => import('./Visualizer'))` so the
  Visualizer chunk (SieveRenderer, BitGridGLWorker, all settings and
  visualizer subcomponents) only downloads when the user first opens a
  file. `parseTrace` is dynamically imported inside `loadFile` /
  `loadFromApi` so `traceParser.js` is also split out. A
  `preloadVisualizer()` fire-and-forget call at the top of both handlers
  starts the chunk download while the file is being read — minimising the
  Suspense fallback window. The `<Visualizer>` render is wrapped in
  `<Suspense fallback={<div className="loading-msg">Loading
  visualizer…</div>}>`. Bundle result: 149 kB / **48 kB gzip** initial
  (welcome screen only) + 309 kB / 87 kB gzip Visualizer chunk +
  21 kB / 7 kB gzip traceParser chunk. Previous single-chunk was
  477 kB / **140 kB gzip** — **66% initial load reduction**.
  Module count: 89 → 90. `npm run test`: 50/50 pass.
- ✅ **Replaced floating settings-toggle pill with toolbar gear icon.**
  `Toolbar.jsx` now imports `GearIcon` from `settings/buttons` and uses
  it for the settings-panel toggle button (replacing `PanelRight`). The
  `settings-toggle-float` floating button that used to render in
  `SettingsPanel.jsx` when `collapsed` is `true` has been removed —
  the toolbar gear icon is now the sole affordance for expanding the
  panel. Dead CSS (`.settings-toggle-float`, `.settings-collapsed-label`)
  removed from `10-settings.css`. The unused `GearIcon` import removed
  from `SettingsPanel.jsx`. Minimap comment in `Visualizer.jsx` updated
  to remove the reference to the now-deleted float button.
- ✅ **Extracted search state + handler into `useSearchState` hook.**
  New file `src/hooks/useSearchState.js` (Pattern A). The hook owns
  `searchQuery` / `searchResult` / `searchOpen` state, the `handleSearch`
  callback (full bit/byte/uint32/uint64/vector/number query parser with
  renderer highlight + viewport fly-to), and the clear-on-close
  `useEffect`. Accepts `{ rendererRef, navigateToBit, storageModel,
  getMinimapDetailH }`. Placed after `navigateToBit` in `Visualizer.jsx`
  so the hook receives a stable callback (lazy-closure ordering rule).
  `numberToBit` removed from `Visualizer.jsx`'s SieveRenderer import
  (only needed inside the hook now). `Visualizer.jsx` reduced from
  4 279 → 4 191 lines (−88). Module count: 90 → 91. `npm run build`
  clean; `npm run test` 50/50 pass.
- ✅ **Gear-icon in single-event widget toggles the Animation tab.**
  `SettingsPanel.jsx` now exposes an `onActiveTabChange` prop and wraps
  `setActiveTab` in a `changeActiveTab` helper that calls
  `onActiveTabChange?.(tab)` on every tab switch — programmatic
  (`activeTabRequest`), user-click, and legend-action code paths all go
  through this helper. `Visualizer.jsx` adds `settingsActiveTab` state
  (default `'layout'`) and passes `onActiveTabChange={setSettingsActiveTab}`
  to `SettingsPanel`. `openAnimationSettings` is updated: if
  `!settingsCollapsed && settingsActiveTab === 'animation'` it closes the
  panel via `setSettingsCollapsed(true)` and returns; otherwise it opens
  the panel to the Animation tab as before.
- ✅ **Bottom-left anchor when joining widgets.** When the user drags one
  floating widget onto the other to trigger a join, the `JoinedEventsWidget`
  now appears with its bottom-left corner at the same screen position as the
  `EventTitleBanner`'s bottom-left corner at the moment of joining. Changes:
  `EventTitleBanner` passes `bannerRef.current.getBoundingClientRect()` to
  `onJoinWidgets(bannerRect)`; `EventsPanel` queries
  `document.querySelector('.step-focus-banner').getBoundingClientRect()` and
  passes it when the all-events floater is dropped on the banner.
  `Visualizer.jsx` stores the rect in `joinBannerRect` state and passes it to
  `JoinedEventsWidget` as `initialBannerRect`. `JoinedEventsWidget` computes
  `floatDrag.x = bannerRect.left − (vw/2 − 260)` on init (aligns left edge
  immediately, since widget width is a fixed 520 px); a `useLayoutEffect`
  with empty deps fires once after first paint, reads `widgetRef.current
  .offsetHeight`, and sets `floatDrag.y = bannerRect.bottom − TOP_OFFSET −
  widgetHeight`, clamped to not exceed the toolbar.
- ✅ **Removed `SieveRenderer.skipBitFill` and all Canvas2D cell-fill code**
  (WebGL-worker deepening backlog items 7 and 8 / stability backlog items 27
  and 28). Since items 4–6 (overlay borders, lowered-3D, rise-and-settle) were
  all ported to GL in earlier sessions, the Canvas2D fill paths became dead
  code that only ran on old browsers.
  `skipBitFill` property removed from constructor, `init()`, and
  `_buildFrameContext()`. Removed Canvas2D paths:
  `_renderClear()` background fill blocks (Canvas2D now only calls
  `clearRect`); `_drawBitBodyNormal()` body (empty — GL handles fills);
  `_drawBitBodyLowered()` body (empty — GL animTex handles lowered fills;
  feature dormant); `_drawBitBodyRaised()` top-face `fillRect` + `strokeRect`
  (GL animTex covers top face; side-face polygons stay Canvas2D since GL
  instanced quads cannot extend outside cell boundaries); `_drawBitFocusRange()`
  body (empty — GL state bit 7 handles focus tint); tint `fillRect` and border
  `strokeRect` blocks in `_drawBitPrimeOverlay`, `_drawBitRangeOverlay`,
  `_drawBitMultiplesOverlay` (GL shader handles tints and borders; dots and
  labels remain Canvas2D). `Visualizer.jsx` render wrapper simplified: removed
  `glOwnsFill`, `rr.skipBitFill = glOwnsFill`, and `if (!glOwnsFill) return`
  lines. Added `glUnavailable` React state: set to `true` when
  `BitGridGLWorker.attach()` returns `false`, triggering a persistent amber
  `.gl-unavailable-banner` (CSS in `09-export-progress.css`) that lists the
  minimum browser requirements (Chrome 69+, Firefox 105+, Edge 79+, Safari
  16.4+). Parity harness comment updated to note the GL shader is now the
  source of truth for tint values. `npm run build` clean; `npm run test`
  50/50 pass. Visualizer chunk: 307 kB / 86.95 kB gzip (−0.5 kB gzip from
  removing dead fill code).
- ✅ **Fixed React StrictMode GL worker lifecycle bug** (discovered immediately
  after items 7/8/27/28). In development builds, `React.StrictMode` deliberately
  mounts every component twice (setup → cleanup → setup) to surface lifecycle
  bugs. The mount-only `useEffect([], [])` cleanup in `Visualizer.jsx` was
  calling `glRendererRef.current.dispose()`, which terminated the worker and
  set `_lost = true`. The second setup run reused the same `glCanvasRef` (canvas
  element not re-created) and found `glRendererRef.current` pointing at the dead
  worker. Because `_lost = true`, all `_post()` calls became no-ops; `attach()`
  was never called again (the `if (!gl)` branch was skipped). Result: bit fills,
  focus tints, overlay tints and borders were all invisible — only Canvas2D dots
  and labels rendered. Fix: removed the `dispose()` call from the `useEffect([])`
  cleanup entirely. `OffscreenCanvas.transferControlToOffscreen()` is a one-shot
  irreversible operation; the GL worker must survive for the full component
  lifetime. In production there is no StrictMode double-mount; on page unload
  the browser terminates all workers automatically. In `BitGridGLWorker.dispose()`
  the `_lost = true` flag is retained (it was added as part of the items 7/8
  session) so that `dispose()` remains safe to call from test harnesses and
  the parity harness — callers just don't call it from a cleanup effect anymore.

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
1. **Update the parity harness to exercise `BitGridGLWorker`.** ✅ DONE.
   `parity.html` formerly had a Renderer dropdown (direct / worker).
   Dropdown removed in item 3 below; harness is now worker-only.
   See item 3 for full history.
1. **Remove `BitGridGL.js` (direct mode).** ✅ DONE.
   `BitGridGL.js` deleted. Renderer dropdown removed from `parity.html`.
   `parityHarness.js` updated: `BitGridGL` import and `runGL()` function
   removed; `run()` is now unconditionally the worker path. The Canvas2D
   reference in `renderRef()` was extended to draw border strips matching
   the new GL shader border pass (item 4), so parity comparison stays
   valid. `refWithoutMultiples()` retained (still needed to match the
   `multiplesOverlay=false` GL host). `hostStatePacker.js` had no
   `BitGridGL`-specific code to remove.
1. **Port overlay borders to GL.** ✅ DONE (border stroke pass).
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
1. **Port lowered-3D shading to GL.** ✅ DONE (animTex + u_loweredActive).
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
1. **Port rise-and-settle animation to GL.** ✅ DONE (via animTex, same
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

- ✅ **Converted settings controls to `PreviewOptionButton` style.**
    - **Animation tab**: The "Timeline animation mode" (Mask/Bits/Both)
      `step-focus-mode-btn` group → `PreviewOptionButton` in a 3-column
      `preview-btn-grid-3`. The "Event duration target" (Progressive/Linear)
      `step-focus-mode-btn` group → `PreviewOptionButton` in a 2-column
      `preview-btn-grid-2` inside the timing-control. The "Mask stamp
      animation" checkbox → standalone `PreviewOptionButton` toggle in a
      `preview-btn-grid-2`. The "Pause event replay" checkbox removed
      (same control exists in the single-event widget). Unused
      `animationReplayPaused` / `onAnimationReplayPausedChange` props
      dropped from the `AnimationTab` signature.
    - **Colors tab**: The "Theme" light/dark `btn-option` buttons →
      `PreviewOptionButton` in a 2-column `preview-btn-grid-2` with SVG
      sun/moon icons. The "Color preset" `<select>` → `PreviewOptionButton`
      grid (3 columns: "Theme", "Default", "High Contrast", "Pastel",
      "Dark Mode") where each button's swatch is a 4×2 mini grid rendered
      with the preset's actual `setBit` / `clearedBit` / `unchangedBit`
      RGB values. The `PreviewOptionButton` import was added to
      `ColorsTab.jsx`. The CSS rule `.preview-btn-swatch svg { fill: none }`
      is overridden per-rect via inline `style={{ fill: color, stroke: 'none' }}`
      so the hard-coded preset colors show through correctly.
- ✅ **Minimap always visible when enabled, regardless of panel state.**
  Two root causes were fixed simultaneously.

  1. **Z-index / stacking**: The minimap canvas (`z-index: 11`) was
     painted behind the floating panels (settings sidebar, step panel —
     `z-index: 28`), so opening either panel hid the minimap. Fixed by
     changing `.minimap-overlay-canvas` to `position: fixed; z-index: 35;
     width: 100vw; height: 100vh` in `07-canvas.css`. The canvas is now
     a viewport-level overlay above all panels; `pointer-events: none`
     is preserved so it never intercepts clicks.
     The minimap `<canvas>` element was also moved out of `CanvasStage`'s
     `.canvas-container` (which has `transform-style: preserve-3d` and
     therefore creates its own stacking context, trapping the minimap's
     z-index inside it) and is now rendered directly in `Visualizer.jsx`
     as a sibling of `.main-content`. At that DOM level no ancestor
     creates a stacking context, so `z-index: 35` is evaluated in the
     root stacking context and correctly paints above the settings
     sidebar (z-index: 28), step panel (z-index: 28), and the detail
     panel (z-index: auto). The `minimapCanvasRef` prop was removed from
     `CanvasStage` since the canvas element is no longer rendered there.
  1. **Wrong visibility check**: `updateMinimapAvailability` and
     `renderMinimap` both used the oversized (3× drag-headroom) canvas
     dimensions for `isContentFullyVisible`, causing the minimap to be
     marked "not available" when the content was smaller than the
     oversized canvas but larger than the real viewport. Fixed by
     storing the actual container-visible dimensions on the renderer as
     `r.viewportW / r.viewportH` (set in `refreshCanvasLayout` on every
     resize) and using those in both checks. `renderMinimap` now reads
     `window.innerWidth/Height` for the fixed-canvas drawing surface.
  1. **Settings-panel inset**: `r.minimapRightInset` (set to 360 when
     the settings sidebar is expanded, 0 when collapsed) offsets the
     minimap left so it never overlaps panel controls. A `useEffect`
     in `Visualizer.jsx` keeps it in sync with `settingsCollapsed`.
  1. **Hit-test coordinates**: Minimap click/drag detection changed
     from container-relative (`rawX/rawY`) to viewport-relative
     (`e.clientX / e.clientY`) to match the fixed-position `_minimapRect`
     coordinates stored by `renderMinimap`.
- ✅ **Cacheline annotations shown without heatmap.** Previously the
  `"×N Δstep"` badges only rendered when `heatMapEnabled` was true.
  Four changes were made:

  1. `Visualizer.jsx` — both `rebuildHeatMap` call sites now run
     whenever `heatMapEnabled || (cachelineAnnotation && cachelineAnnotation !== 'none')`.
     This ensures `clHitCount` / `clLastHitStep` are populated even
     when the colour heat overlay is off.
  1. `CachelineAnnotationsOverlay.js` — guard changed from
     `!heatMapEnabled || !clHitCount` to just `!clHitCount`. When
     heatmap is off the badge uses a neutral slate-500 colour
     (`{ r:100, g:116, b:139 }`) instead of the heat gradient.
     Badge text is now `"cache ×N"` / `"cache ΔN"` / `"cache ×N ΔN"`
     (prefix added per user request). Badge is now placed centred in
     the `annotBottomExtra` extension zone *below* the bit cells
     (mirroring the same 14–22 px extension logic used by
     `_renderCachelineOutline`), so it never overlaps the bits.
  1. `SieveRenderer._renderCachelineOutline` — `annotActive` no longer
     gates on `heatMapEnabled`; the outline extension is applied
     whenever `cachelineAnnotation !== 'none'`.
  1. `LayoutTab.jsx` — `cycleCLAnnotation` no longer returns early
     when heatmap is off; annotation button `active` prop no longer
     requires `heatMapEnabled`; hints updated to not mention heatmap.
- ✅ **Equal-height section cards in the detail panel.** All four
  `.detail-section-card` elements in the compact detail panel now
  stretch to the same height within each grid row.
  Change is CSS-only (`08b-detail-compact.css`):
    - `.detail-sections`: `align-items: start` → `align-items: stretch`
      so grid places each card at the row's full height.
    - `.detail-section-card`: added `display: flex; flex-direction: column`
      so the card itself is a flex container and can expand downward.
    - `.detail-section-rows`: added `flex: 1` so the row list grows to
      fill the card's available height, distributing unused space evenly
      across rows.
- ✅ **Settings panel tile buttons are now square.** All `AnnotationButton`
  (`.anno-btn`) and compact `PreviewOptionButton` (`.preview-btn.compact`)
  tiles in the settings panel now render as perfect squares. Change is
  CSS-only in `src/styles/15-layout-overview.css`:
    - `.anno-btn`: removed `min-height: 90px; max-height: 100px; max-width: 120px`;
      added `width: 100%; aspect-ratio: 1 / 1; overflow: hidden;`.
    - `.preview-btn.compact`: replaced the same three constraints with
      `width: 100%; aspect-ratio: 1 / 1; overflow: hidden;`.

  Each button now fills its grid column width and its height is
derived from the aspect ratio — giving a perfectly square tile in
all three-column (annotation, outline, animation, overlay, color
preset, theme) and two-column (mask stamp animation) grids. Hint
text that extends beyond the square is clipped by `overflow: hidden`.

- ✅ **Fixed `ColorsTab` dependency direction for `COLOR_PRESETS`.**
  `ColorsTab.jsx` was importing `COLOR_PRESETS` from `'../SieveRenderer'`
  — coupling a settings UI component to the renderer module. `COLOR_PRESETS`
  was already defined in `src/renderer/constants.js` and re-exported via
  `SieveRenderer.js` for backwards compatibility. Changed the import in
  `ColorsTab.jsx` to `'../renderer/constants'` directly. No circular
  import introduced; `SieveRenderer`'s re-export kept intact for any
  remaining direct-renderer consumers. Build passes clean at 88 modules.
  (Backlog item 17.)
- ✅ **Scoped the event-widget drag handle to the title area.**
  The `onMouseDown={handleMouseDown}` on the outer banner `div` was
  replaced with a dedicated `.step-focus-drag-handle` wrapper around
  the `.step-focus-lines` block (title line, annotation, bits-changed
  count). Added `bannerRef` (`React.useRef`) to the outer div so
  `handleMouseDown`'s `isOverDetailPanel` hit-test still disables pointer
  events on the whole banner (not just the drag handle). CSS:
  `cursor: grab` / `:active { grabbing }` moved from
  `.step-focus-banner` to `.step-focus-drag-handle`. The annotation
  area keeps its `onMouseDown stopPropagation` so clicking to
  expand/collapse the annotation does not trigger a drag or the
  click-without-drag → open-panel side-effect. Context rows and sliders
  remain non-draggable (their `onMouseDown stopPropagation` is unchanged).
- ✅ **Fixed event-widget initial placement when shown from detail panel.**
  Both `onShowEventTitle` callbacks now compute a `dragOffsetY` instead
  of always using `0`. The CSS anchor is `bottom: 20px` in `07-canvas.css`.
  **CanvasStage.jsx** (detail panel ▲ button): `DetailPanel` calls
  `onToggle()` immediately after `onShowEventTitle`, so the panel ends
  in a closed state; fixed `dragOffsetY = -(22 + 30 − 20) = −32` places
  the banner 30 px above the closed header (22 px matches the `detailPad`
  convention). **Visualizer.jsx** (EventsPanel ▲ button): detail state
  doesn't change; offset computed dynamically as
  `−(totalPanelH + 10)` where `totalPanelH = detailOpen ? detailHeight + 22 : 22`.

7. **Remove `SieveRenderer.skipBitFill` and the Canvas2D cell-fill code.**
   ✅ DONE. The `skipBitFill` property has been removed from `SieveRenderer`
   (constructor, `init()`, and `_buildFrameContext()` return). The Canvas2D
   cell-fill code that was gated by it is also removed:
   - `_renderClear()` no longer paints the background fill (GL clearColor
     handles it; Canvas2D only calls `clearRect` to maintain transparency).
   - `_drawBitBodyNormal()` body is empty (GL instanced quads handle fills).
   - `_drawBitBodyLowered()` body is empty (GL animTex + u_loweredActive
     handles lowered fills; the branch is dormant since `loweredSetBits`
     is always false).
   - `_drawBitBodyRaised()` keeps the Canvas2D side-face polygons (GL cannot
     render quads that extend outside the cell boundary), but the top-face
     `fillRect` + `strokeRect` block is removed (GL animTex covers it).
   - `_drawBitFocusRange()` body is empty (GL state bit 7 handles the tint).
   - `_drawBitPrimeOverlay`, `_drawBitRangeOverlay`, `_drawBitMultiplesOverlay`:
     the `if (!f.skipBitFill) { tint fillRect }` and
     `if (px >= 4 && !f.skipBitFill) { strokeRect }` blocks are removed
     (GL fragment shader handles tints and borders). Dots and labels remain
     Canvas2D.
   `Visualizer.jsx` render wrapper simplified: the `const glOwnsFill`,
   `rr.skipBitFill = glOwnsFill`, and `if (!glOwnsFill) return` lines
   removed. The wrapper now unconditionally calls `origRender()` then
   dispatches to GL if `g` is truthy.
8. **Decide the no-OffscreenCanvas fallback.** ✅ DONE (option b + c hybrid).
   Decision: require OffscreenCanvas (all evergreen browsers since ~2019).
   When `BitGridGLWorker.attach()` returns `false`, a `glUnavailable` React
   state is set to `true` and a persistent `.gl-unavailable-banner` warning
   is shown below the toolbar (amber/warning colour) listing the minimum
   browser requirements (Chrome 69+, Firefox 105+, Edge 79+, Safari 16.4+).
   Bit cells remain unfilled (degraded but not broken — labels, overlays,
   and panels still work). CSS for the banner lives in `09-export-progress.css`.
   Note: `BitGridGL.js` (direct-mode fallback) was deleted in item 3; there
   is no silent Canvas2D fallback for cells anymore.
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
    by ~200 lines. **Partially unblocked by item 12** (`goToStep` is now
    ref-stable via `goToStepRef`). Remaining blocker: `triggerAnimation`
    and `stopSeqAnim` closures captured by the single-event loop also
    need to be ref-stabilised before the extraction is safe — the loop
    already reads `triggerAnimation` through `triggerAnimationRef.current`
    but `stopSeqAnim` is still a direct closure capture in several effects.
12. **Stabilise `Visualizer.jsx` callback refs.** ✅ PARTIALLY DONE.
    `goToStepRef` added to `Visualizer.jsx` (always-current ref,
    same pattern as `triggerAnimationRef`). The play/pause scheduler
    `useEffect` now calls `goToStepRef.current(...)` and its dep array
    shrunk from `[playing, steps.length, goToStep]` to `[playing, steps.length]`.
    `useKeyboardShortcuts` refactored to store all inputs in a `handlersRef`
    and register the `keydown` listener once (empty dep array) — see §6.
    **Remaining:** export callbacks (`exportPng`, `exportVideo`) are still
    direct `useCallback` values passed as props; they are not in any heavy
    `useEffect` dep array, so stabilising them is lower priority. Item 11
    (extract playback loop) is partially unblocked: `goToStep` is now
    ref-stable; the remaining blocker is the `triggerAnimation` and
    `stopSeqAnim` closures that the single-event loop captures.
13. **Split `SieveRenderer._drawBitBody` further.** ✅ DONE. `_drawBitBody`
    is now a 10-line dispatcher calling `_drawBitBodyLowered`,
    `_drawBitBodyRaised`, or `_drawBitBodyNormal`. Each branch is a
    standalone private method with a clear JSDoc summary. No logic
    changes — purely structural. The prerequisite note about GL lowered-3D
    porting is moot since that work is already done (see §7 item 5).
14. **Introduce lightweight integration tests.** ✅ DONE. Vitest
    installed (`npm run test` / `npm run test:watch`). Two test files
    created with zero DOM dependencies:
    - `src/lib/__tests__/animationTiming.test.js` — 34 tests covering
      `clampMs`, `progressiveTierShares`, `bitsAtTimeRatio`,
      `timeRatioAtBitIndex`, `computeEventNormalDuration`,
      `computeEventDuration`, and `getFadeOutDuration` (including
      tier-boundary round-trip assertions).
    - `src/parser/__tests__/traceParser.test.js` — 16 tests covering
      JSON v3, JSON v2, text-format parsing (shape, bitCount,
      storageModel, changedBits), and the error-case paths (empty
      input, bad JSON, version < 2).
    All 50 tests pass clean. `vitest.config.js` at the project root;
    configuration is minimal (`environment: 'node'`, no jsdom needed).
    Remaining test gap: a Playwright smoke test loading the sample
    trace, playing 3 seconds, and asserting no console errors — deferred
    to a future session (requires Playwright setup + headless browser).
15. **Audit `Visualizer.jsx` `useState` seed values.** ✅ DONE.
    Grepped for `readViewPrefs()` inside `Visualizer.jsx` — zero
    occurrences found. All `useState` seeds already flow from
    `getInitialViewState()` via the single `useMemo(initState)` call.
    The "storage is read exactly once" invariant is fully clean.
16. **Extract the minimap render + hit-test into a `MinimapRenderer`
    class.** ✅ DONE. New file `src/renderer/MinimapRenderer.js`
    following Pattern D. The class takes the host renderer in its
    constructor and exposes `attach(canvas)`, `render(cW, cH, detailH)`,
    `hitTest(x, y, cW, cH)`, and `isContentFullyVisible(vW, vH)`.
    `SieveRenderer` now delegates all four public methods to
    `this.minimapRenderer`; the dead `minimapCanvas`/`minimapCtx` fields
    and the 100-line inline drawing block are removed from
    `SieveRenderer`. Dead variable block (`bitsPerCacheLine`, `totalCL`,
    `clPerVRow`, `totalVRows`) removed from the rendering path.
    `Visualizer.jsx` changed `r._minimapRect = null` →
    `r.minimapRenderer._rect = null`; `hitTest` now guards against
    disabled minimap via `this.host.minimapEnabled` so the explicit
    null-clear is only needed for timing (not correctness). Module count
    89 → 89 (new file; no net import change since SieveRenderer already
    bundled).
17. **Review `ColorsTab` import of `COLOR_PRESETS` from `SieveRenderer`.**
    ✅ DONE. `COLOR_PRESETS` was already in `src/renderer/constants.js`
    and re-exported via `SieveRenderer.js`. Changed `ColorsTab.jsx` to
    import from `'../renderer/constants'` directly. No circular import
    introduced; build passes clean at 88 modules.
18. **Add `propTypes` or TypeScript types to the top-level component
    boundaries.** `Visualizer.jsx`, `SettingsPanel.jsx`, and `EventsPanel.jsx`
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
20. **Throttle settings-panel re-renders during rapid slider input.** ✅ DONE.
    `AnimationTab.jsx` wraps all range-slider `onChange` handlers in
    `startTransition` (`useTransition` imported at line 1). `ColorsTab.jsx`
    does the same for the grid-opacity slider. `LayoutTab.jsx` uses
    `+/−` buttons (not range sliders) so no changes were needed there.
21. **Lazy-load `traceParser.js` and the renderer on first trace open.** ✅ DONE.
    `App.jsx` now uses `React.lazy(() => import('./Visualizer'))` so the
    Visualizer (and its transitive deps: `SieveRenderer`, `BitGridGLWorker`,
    all settings/visualizer subcomponents) live in a separate async chunk.
    `parseTrace` is dynamically imported (`await import('./traceParser')`)
    inside `loadFile` and `loadFromApi` so `traceParser.js` is also split
    out. A `preloadVisualizer()` fire-and-forget helper is called at the top
    of both handlers so the chunk starts downloading while the file is being
    read/fetched — minimising the Suspense fallback window. The `<Visualizer>`
    render is wrapped in `<Suspense fallback={<div className="loading-msg">
    Loading visualizer…</div>}>`. Bundle before: 477 kB / 140 kB gzip (single
    chunk). Bundle after: 149 kB / 48 kB gzip initial + 309 kB / 87 kB gzip
    Visualizer chunk + 21 kB / 7 kB gzip traceParser chunk — a **66% initial
    load reduction**. Module count: 89 → 90 (+1 for traceParser chunk).

### Stability / reliability backlog

22. **Guard the `captureStream` path against hidden canvas.** ✅ DONE.
    `useTraceExport.js` checks `canvas.offsetParent === null` before
    calling `captureStream`; if the canvas is not visible, it calls
    `setExportError(msg)` with a user-readable message and returns early,
    rather than producing a silent empty recording.
23. **Worker error surfacing.** ✅ DONE. `BitGridGLWorker.js` already had
    an `onerror` handler (console.error + `_lost = true`). Added
    `onmessageerror` to both `BitGridGLWorker.js` and
    `bitPrePassClient.js` to catch deserialization failures (rare
    structured-clone errors). For `bitPrePassClient`, `onmessageerror`
    also clears the pending-callback map so callers don't hang.
    A React error-boundary notification remains optional — the Canvas2D
    layer keeps rendering through any GL-worker failure, so a silent
    console error is appropriate at this stage.
24. **Consolidate `pendingResizeAnchorRef` logic.** The panel-collapse
    pan-compensation path (§5 minefield) is fragile and spread across
    five toggle handlers. A single `setPanelState(newState, anchorBit)`
    helper that stashes the anchor and flips the panel state atomically
    would be less error-prone. Extract only after the current shape has
    proven stable across multiple panel-combination toggles.
25. **Port lowered-3D shading to GL.** ✅ DONE — see item 5 in the
    WebGL-worker deepening backlog above.
26. **Port rise-and-settle animation to GL.** ✅ DONE — see item 6 in the
    WebGL-worker deepening backlog above.
27. **Remove `SieveRenderer.skipBitFill` and the Canvas2D cell-fill code.**
    ✅ DONE — see item 7 in the WebGL-worker deepening backlog above.
28. **Decide the no-OffscreenCanvas fallback.** ✅ DONE — see item 8 in
    the WebGL-worker deepening backlog above.
29. **Partial `texSubImage2D` updates.** Currently the full state texture
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

| Lever               | What it fixes                                                                                        | What it doesn't fix                                                     |
| ------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| **Worker pre-pass** | Main-thread jank from cold computations (prime-flag table, heat-map maintenance, mask diffing) running synchronously inside `setState()` | Per-`fillRect` cost. The draw loop still runs on the main thread.       |
| **WebGL bit grid**  | Per-bit draw-call cost. One instanced/fullscreen-quad draw replaces N `fillRect`s.                   | CPU work *outside* the bit pass (overlays, labels, cacheline outlines). |

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
    - heat overlay, motion trails, vector touch order, mask write

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
1. **Color parity.** ✅ *Done at scope.* Shader handles
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
1. **State texture protocol.** ✅ *Done at current scope.*
   One `R8UI` `stateTex`, one byte per bit, packed bits
   `set | changed | ghost | repeated | prime | range | multiples |
   focus`, repacked every render in JS (`uploadState(host)`).
   Full-repack cost measured negligible at typical bit counts
   (10k bits in well under a frame). Partial `texSubImage2D`
   updates and a separate `targetHitCounts` magnitude texture
   are the natural next steps **only if** lowered-3D / hit-count
   gradient shading land in items 1–2 — i.e. when there are
   features that actually consume a richer per-bit payload.
1. **Hit-testing.** ✅ *Enforced.* `bitIndexToCanvas()` /
   `canvasToBitIndex()` are the JS-side authoritative layout
   helpers. The GL canvas is layered *under* the Canvas2D input
   layer with `pointer-events: none` (set both in `07-canvas.css`
   and defensively in `BitGridGL.attach()`). Any future GL-side
   hit-test must call `host.canvasToBitIndex(x, y)` rather than
   re-deriving layout from GL state — see the JSDoc on
   `BitGridGL.attach()`.
1. **Visual diff harness.** ✅ *Done (minimal).* `parity.html`
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
1. **Step 3 — OffscreenCanvas worker dispatch.** ✅ *Done.*
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