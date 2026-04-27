# AI Maintenance Guide

> Read this first. It exists to keep AI agents (and humans) from re-doing
> work, breaking subtle invariants, or producing massive regressions in the
> visualizer codebase.

The web visualizer is a long-lived React/Vite app with **three** large files
that historically attract most of the changes:

| File | Lines | Role |
|---|---|---|
| `src/Visualizer.jsx` | ~3 800 | Stateful orchestrator: trace, playback, viewport, hover, exports |
| `src/SieveRenderer.js` | ~2 900 | 2D canvas renderer (sieve grid, overlays, animations) |
| `src/SettingsPanel.jsx` | ~1 500 | Right-hand sidebar with three tabs |

Even after the refactors documented below, these files remain **the** hot
spots. Touch them only with awareness of the contracts described here.

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

---

## 6. What's been done already

Track refactors here so the next agent doesn't redo them. Append; don't
overwrite.

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

No open backlog items remain after this round. If you're considering
anything bigger than the above (e.g. rewriting `SieveRenderer.render()`),
stop and ask first. That single 700-line method is the visual heart of
the app and any regression is highly visible.
