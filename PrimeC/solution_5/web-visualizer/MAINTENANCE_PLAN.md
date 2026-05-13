# Web-Visualizer Maintenance Plan

A phased plan to improve maintainability and efficiency.  
Current codebase: **Visualizer.jsx 2308 lines · 27 CSS files (8183 lines) · 7034 lines in visualizer/ components**.

---

## Phase 1 — Remove Legacy / Unused Code

### 1.1  Single-Event Widget (`isSingleEvent*`)

The single-event loop/repeat/slider state is threaded through **19+ files** (Visualizer.jsx, StepAnimSliders.jsx, DoubleTimeline.jsx, CanvasStage.jsx, and 14 hooks). Verify whether the per-event animation slider widget is still required:

- `isSingleEventLoopActive`, `isSingleEventLoopActiveRef`
- `isSingleEventRepeatEnabled`, `isSingleEventRepeatEnabledRef`
- `isSingleEventWidgetRevealed`
- `isSingleEventSliderInPanel`

**Removal steps:**
1. Confirm in the UI that the "single-event repeat" widget is no longer visible or needed.
2. Search for every reference: `grep -rn "isSingleEvent\|singleEvent" src/`.
3. Remove state declarations in `useWidgetState.js` and `usePanelState.js`.
4. Remove all call-sites in hooks: `useStepAnimation`, `useStepAnimContent`, `usePlaybackLoop`, `usePlaybackControls`, `useAnimationPipeline`, `useSelectionOrchestration`, `useGoToStep`, `useStepSelectionHandlers`, `useViewPrefsSync`.
5. Remove `StepAnimSliders.jsx` if it exists solely for the single-event slider.
6. Remove corresponding CSS in `07-canvas.css` (`.step-focus-play-btn`, `.step-focus-scrub-btn`, `.step-focus-repeat-btn`, ~50 lines starting ~line 248).
7. Remove the `isSingleEventSliderInPanel` viewPref migration shim in `lib/viewPrefs.js`.

**Estimated savings:** ~200 lines across Visualizer.jsx + hooks; ~50 lines CSS.

---

### 1.2  `EventTitleBanner` ("step-banner")

`EventTitleBanner.jsx` is a 367-line floating/draggable banner with drop-zone gesture logic. It duplicates navigation already present in EventsPanel. Verify that removing it does not regress the "current step" summary display:

- The data it consumes (`currentStepBanner`, `surroundingEvents`) flows: `useStepDisplayData` → Visualizer → VisualizerMainContent → CanvasStage → `EventTitleBanner`.

**Removal steps:**
1. Confirm that the `DoubleTimeline` or another component already shows the same "current event" heading.
2. Delete `src/visualizer/EventTitleBanner.jsx`.
3. Remove the import in `Visualizer.jsx` line 16.
4. Remove `currentStepBanner` and `surroundingEvents` from `useStepDisplayData` return value and all downstream prop paths.
5. Remove `currentStepBanner` + `surrounding` from the `CanvasStage` prop bundle.
6. Remove the `eventTitleStyle` computed style in Visualizer.jsx.
7. Clean up any CSS for `.event-title-banner` (check `07-canvas.css` and `17-misc.css`).

**Estimated savings:** 367 lines (EventTitleBanner.jsx deleted) + ~30 lines Visualizer.jsx prop plumbing.

---

### 1.3  Floating Events / Undocked Timeline

`isTimelineUndocked` and `floatingDetailVisible` (items 163 and 157) add branching complexity throughout Visualizer.jsx (keyboard shortcuts, toolbar toggle, PanelLayoutContext, prop assembly). Confirm whether these docking/undocking features are still needed:

- Visualizer.jsx: `isTimelineUndocked`, `floatingDetailVisible`, `onUndockTimeline`, `onDockTimeline`, `onToggleFloatingDetail` (~10 references, lines 336–1911).
- The `DoubleTimeline.jsx` has undock/dock controls (1451 lines — largest component).

**If removing:**
1. Remove `useState` declarations (lines 337–338).
2. Remove the keyboard-shortcut branch for undocked `D` key (line 1184–1188).
3. Remove the `toolbarToggleDetail` callback branch (lines 1350–1354).
4. Remove the `isDetailOpen` ternary from `PanelLayoutContext` (line 1367).
5. Simplify `panelState` object (lines 1629 area) — remove `isTimelineUndocked`, `floatingDetailVisible`.
6. Remove undock/dock/floating props from `visualizerMainContentProps` (lines ~1907–1911).
7. Remove the corresponding undock controls from `DoubleTimeline.jsx`.

**Estimated savings:** ~40 lines Visualizer.jsx; significant simplification of DoubleTimeline.jsx.

---

### 1.4  ViewPrefs Migration Shims

`src/lib/viewPrefs.js` lines 147–365 contain localStorage migration shims for old keys (`stepsPanelCollapsed`, `repeatAnim`, `isSingleEventSliderInPanel`). Once the single-event widget is removed (1.1), the `isSingleEventSliderInPanel` shim can be deleted. The `stepsPanelCollapsed` shim can be removed after a grace period (it can be set to a one-time migration run rather than per-load).

---

## Phase 2 — Reduce Visualizer.jsx (2308 → ~1400 lines)

### 2.1  Extract the State-Assembly Block into a Hook

Lines 1510–1812 define ~15 plain JS objects (`canvasState`, `uiFrameState`, `animationState`, etc.) that are just reorganizations of already-existing variables — no logic. Extract these into a dedicated hook `useVisualizerStateBundle`:

```
src/hooks/useVisualizerStateBundle.js
```

The hook receives all raw variables and returns the named state objects. Visualizer.jsx becomes:

```js
const { canvasState, uiFrameState, animationState, ... } = useVisualizerStateBundle({ ... });
```

**Estimated savings:** ~300 lines from Visualizer.jsx (moved, not deleted).

---

### 2.2  Extract the Props-Assembly Block into a Hook

Lines 1813–2195 assemble `visualizerMainContentProps` and lines 2196–2250 assemble `toolbarProps`. These are also pure data reorganization. Extract into:

```
src/hooks/useVisualizerPropBundles.js
```

Returns `{ visualizerMainContentProps, toolbarProps }`. The inline `useCallback` closures that currently live inside the object literals (e.g. `openSpotlight`) should be hoisted out of the bundle to real `useCallback` declarations above.

**Estimated savings:** ~400 lines from Visualizer.jsx (moved).

---

### 2.3  Inline Multi-Line Hook Arguments

Many hook calls in Visualizer.jsx pass objects that span 10–30 lines each. For hooks that accept a single config object of 3–5 fields, collapse to one line:

```js
// Before (5 lines)
const foo = useFoo({
  a: aVal,
  b: bVal,
  c: cVal,
});

// After (1 line)
const foo = useFoo({ a: aVal, b: bVal, c: cVal });
```

Apply this rule: if the argument object has **≤ 5 properties and no trailing comments**, put it on one line.  
Affects ~30 call sites in Visualizer.jsx.

**Estimated savings:** ~80 lines Visualizer.jsx.

---

### 2.4  Collapse Trivial useCallback Wrappers

Visualizer.jsx contains ~15 useCallback wrappers that are one-liners wrapping a single setter:

```js
// Before
const enableRepeat = useCallback(() => setIsSingleEventRepeatEnabled(true), []);

// Can be passed directly, or aliased only where the dep-array matters.
```

After Phase 1 removes single-event state, audit remaining trivial callbacks and either remove them or inline them at the call site.

---

### 2.5  Reduce Prop-Drilling via Contexts

The following state is passed as props all the way into deep components but belongs in an existing context:

| State | Current path | Better location |
|---|---|---|
| `isDetailOpen` / `detailHeight` | Visualizer → VMC → CanvasStage → children | `PanelLayoutContext` (already exists) |
| `currentStep` | Visualizer → VMC → multiple | `ActiveStepContext` (already exists) |
| `isMacPlatform` / `isElectron` | Toolbar props bundle | New `PlatformContext` (tiny, static) |

Adding `isDetailOpen`, `detailHeight` to `PanelLayoutContext` and `currentStep` to `ActiveStepContext` removes ~20 prop slots across 4 files.

---

## Phase 3 — Streamline CSS (8183 → ~6500 lines)

### 3.1  Define Strong Base Classes in `23-components.css`

Currently there are 50+ button/icon/arrow variants spread across 10 files with duplicated `background`, `border`, `border-radius`, `color`, `cursor`, `transition` declarations. Define a small set of base classes:

```css
/* 23-components.css — base classes */

.btn                /* box model, border-radius, cursor, transition */
.btn-icon           /* square icon button (size, padding, flex centering) */
.btn-sm             /* small size modifier */
.btn-primary        /* accent colour */
.btn-ghost          /* transparent, border on hover */
.btn-danger         /* destructive red */

.icon               /* svg icon: display, vertical-align, fill: currentColor */
.icon-sm            /* 12px */
.icon-md            /* 16px — default */
.icon-lg            /* 20px */

.panel-arrow        /* unified panel-open/close arrow (replaces panel-toggle-arrow) */
.panel-arrow.is-open

.chip               /* small inline label / badge */
```

Each variant overrides only what differs from the base. All existing button classes that duplicate these properties are refactored to compose the base class.

---

### 3.2  Audit and Consolidate Per-File Button Duplicates

For each file, replace duplicated button declarations with composition:

| File | Classes to refactor |
|---|---|
| `04-toolbar.css` | `.btn-info`, `.panel-toggle-btn`, `.panel-toggle-btn--popout`, `.raw-log-copy-btn`, `.raw-log-close-btn` |
| `06-events-panel.css` | `.event-op-wide-btn`, `.event-level-btn`, `.event-depth-toggle` |
| `07-canvas.css` | `.step-focus-play-btn`, `.step-focus-scrub-btn`, `.step-focus-repeat-btn`, `.animation-option-btn` |
| `08b-detail-compact.css` | `.btn-icon` (duplicates 23-components) |
| `10-settings.css` | `.btn-sm`, `.btn-group`, `.btn-option` |
| `14-events-panel-collapsible.css` | `.btn-icon-sm` |
| `03-welcome.css` | `.log-file-btn` |

Strategy: add `btn` (or `btn-icon`) to the HTML element's className, then the existing specific class only overrides colour/size deltas.

**Estimated savings:** ~200 lines CSS.

---

### 3.3  Merge Small CSS Files

Files under 50 lines that style a single narrow concern should be merged:

| Source file | Merge into |
|---|---|
| `09-export-progress.css` (~40L) | `23-components.css` |
| `21-upload-prompt.css` (~45L) | `03-welcome.css` |
| `08b-detail-compact.css` (272L) | `08-detail-panel.css` (keep as a section) |
| `16-settings-extras.css` (107L) | `10-settings.css` |

Update `index.css` imports accordingly.  
**Estimated savings:** 4 fewer files, ~100 lines CSS (deduplication during merge).

---

### 3.4  Audit `17-misc.css` (569 lines)

`17-misc.css` is the second-largest file after `07-canvas.css` but is named "misc" — a sign of accumulated drift. Review each selector and move it to the appropriate feature file, or delete it if unused.

---

### 3.5  Remove CSS for Deleted Features

After Phase 1 deletions, remove matching CSS:
- Single-event widget styles in `07-canvas.css` (`.step-focus-*`, ~60 lines).
- `EventTitleBanner` styles wherever they live (check `07-canvas.css`, `17-misc.css`).
- Undocked-timeline float styles (check `24-double-timeline.css`).

---

## Execution Order

| # | Task | Files touched | Impact |
|---|---|---|---|
| 1 | Phase 1.1: Remove single-event widget | 15 files | −200 lines code, −50 CSS |
| 2 | Phase 1.2: Remove EventTitleBanner | 6 files | −400 lines (component + plumbing) |
| 3 | Phase 1.3: Remove floating/undocked timeline | 3–4 files | −80 lines |
| 4 | Phase 3.1: Define base CSS classes | 23-components.css | foundation for 3.2 |
| 5 | Phase 3.2: Apply base classes | 8 CSS files | −200 lines CSS |
| 6 | Phase 3.3: Merge small CSS files | 5 CSS files | −100 lines, −4 files |
| 7 | Phase 3.5: Remove CSS for deleted features | 2–3 CSS files | −110 lines CSS |
| 8 | Phase 2.1: Extract `useVisualizerStateBundle` | Visualizer.jsx + new hook | −300 lines |
| 9 | Phase 2.2: Extract `useVisualizerPropBundles` | Visualizer.jsx + new hook | −400 lines |
| 10 | Phase 2.3: Inline short hook args | Visualizer.jsx | −80 lines |
| 11 | Phase 2.4: Remove trivial useCallbacks | Visualizer.jsx | −20 lines |
| 12 | Phase 2.5: Move state to contexts | 4–6 files | −20 prop slots |
| 13 | Phase 1.4: Remove viewPrefs shims | viewPrefs.js | −50 lines |
| 14 | Phase 3.4: Audit 17-misc.css | 17-misc.css | variable |

**Total estimated reduction:** ~800 lines from Visualizer.jsx (2308 → ~1400), ~460 lines from CSS (8183 → ~7700), and deletion of ~4 source files.

---

## Definition of Done

- [ ] All existing tests pass (`npm test`).
- [ ] No TypeScript / ESLint errors introduced.
- [ ] Visualizer.jsx is under 1500 lines.
- [ ] No button/icon/arrow base styles duplicated across more than one CSS file.
- [ ] `23-components.css` contains the canonical `.btn`, `.btn-icon`, `.icon`, `.panel-arrow` definitions.
- [ ] `index.css` import list reflects merged files.
