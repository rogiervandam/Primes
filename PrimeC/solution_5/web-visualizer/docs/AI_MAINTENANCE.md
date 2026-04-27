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
  `playbackSpeedValue`) locally to avoid prop drilling them. **LayoutTab
  remains the last tab not yet extracted** — see §7.

---

## 7. What's worth doing next (suggested, not required)

These are concrete next-step refactors that each fit comfortably in a
single working session. Tackle them in order — earlier ones unblock later
ones:

1. **Extract `useKeyboardShortcuts` from Visualizer.jsx** — ✅ DONE.
2. **Split SettingsPanel by tab.** `LegendTab` and `AnimationTab` are
   done (`src/settings/LegendTab.jsx`, `src/settings/AnimationTab.jsx`).
   Still TODO: **`LayoutTab`** (lines ~709–1177 in `SettingsPanel.jsx`).
   This is the hardest one because the JSX closes over many local
   helpers (`set`, `setVectorProfile`, `renderGroupingFamily`,
   `LayoutOverview`, `SpacingControl`, `commitCustomGrouping`,
   `selectGroupingPreset`, `lastManualColumnCountRef`,
   `activeGroupingKey`, `activeGroupingLabel`, `isCustomVectorMode`,
   `customGroupDraft`/`setCustomGroupDraft`,
   `customPresetMenuOpen`/`setCustomPresetMenuOpen`,
   `groupingMenuOpen`/`setGroupingMenuOpen`,
   `openSpacingControl`/`setOpenSpacingControl`) and writes back to
   `onChange(...)` directly. Recommended sequence (unchanged from
   before):
   (a) extract pure helpers (`renderGroupingFamily`, `LayoutOverview`,
   `SpacingControl`) into `src/settings/`;
   (b) introduce a `useSettingsBundle()` hook in the parent that returns
   a `{ s, set, incr, decr, ... }` bundle so the new tab takes ~5 props
   instead of ~25;
   (c) only then extract the tab JSX.
   Doing this without (a)+(b) creates an unmaintainable 30+ prop
   signature.
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
5. **Extract `Camera3D` gesture wiring** — ✅ PARTIAL. Lifecycle moved
   to `src/hooks/use3DCamera.js`. Still TODO: split the giant pointer
   useEffect at `Visualizer.jsx` lines ~2587–2975 into 2D pan/zoom and
   3D rotation handlers. **Risk: high** — they share one pointer state
   machine and any regression breaks all canvas interaction. Recommended
   approach if attempted: keep the dispatching shell in place and extract
   the *body* of each gesture mode (`pan`, `rotate`, `pinch`, `wheel`)
   into pure functions in `src/visualizer/gestures/` that take
   `{ rendererRef, cameraRef, event, state }` and return the new
   `state`. Do not move state ownership.

### New backlog (added after the round that finished tasks 4+5)

6. **Finish the SettingsPanel tab split** (Task 2 above). The
   `useSettingsBundle()` parent-side hook is the unblocking step.
   AnimationTab is done; LayoutTab is the only remaining tab.
7. **Use `SearchOverlay` as a template for `MaskWriteOverlay`** —
   ✅ DONE (`src/renderer/overlays/MaskWriteOverlay.js`). Next overlay
   candidates, ranked by isolation:
   - **VectorTouchOrderOverlay** (`SieveRenderer._renderVectorTouchOrder`)
     — ~80 lines; reads `_maskWordOrderSummary`, `_maskTintColor`,
     `_maskEntryGroupBounds`, `_labelTextColor`, `_truncateTextToWidth`,
     `_fitLabelFontSize`. Needs no state of its own. **Recommended next.**
   - **CachelineAnnotationsOverlay** (`_renderCachelineAnnotations`) —
     larger, reads heat-map + cacheline metrics. Save for last among
     overlays.
8. **Promote the `seekGen` / `globalPaused` / `animBusyUntil` triplet**
   into a small `usePlaybackClock()` hook. Today they live as bare refs
   inside `Visualizer.jsx` and are mutated from many places; centralising
   them would make the playback rules testable in isolation.
9. **Move `viewPrefs` migration** out of `Visualizer.jsx` into
   `src/storage/viewPrefs.js` (read/write/migrate). Right now the
   migration code is interleaved with the initial `useState` lazy
   initialisers, which makes it hard to evolve the schema safely.
10. **Split the pointer/wheel/touch gesture `useEffect`** in
    `Visualizer.jsx` (~lines 2587–2975, ~390 lines). High risk because
    2D pan/zoom and 3D rotation share one pointer state machine. If
    attempted: keep the dispatching shell in place and extract the *body*
    of each gesture mode (`pan`, `rotate`, `pinch`, `wheel`) into pure
    functions in `src/visualizer/gestures/` that take
    `{ rendererRef, cameraRef, event, state }` and return the new
    `state`. Do not move state ownership.

If you're considering anything bigger than the above (e.g. rewriting
`SieveRenderer.render()`), stop and ask first. That single 700-line method
is the visual heart of the app and any regression is highly visible.
