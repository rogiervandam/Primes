# AI Maintenance Guide

Read this first before changing the web visualizer. This document is for AI
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
6. Do not change persisted preference keys without migration. Add keys; do not
   repurpose existing keys.
7. Update existing docs when behavior changes. Avoid creating new docs unless
   explicitly requested.

## Current Hotspots

Approximate source size at this guide revision:

| File                               | Size        | Why it matters                                                                                       |
| ---------------------------------- | ----------: | ---------------------------------------------------------------------------------------------------- |
| `src/Visualizer.jsx`               | ~4200 lines | Runtime owner for trace state, playback, panels, gestures, export, and renderer wiring.              |
| `src/SieveRenderer.js`             | ~2655 lines | Canvas2D overlay renderer and layout authority. GL owns cell fills, but this class still owns labels, outlines, hit-testing, minimap, frame-timing samples, and many overlays. |
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
  `src/lib/viewPrefs.js` for every persisted field.
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

Left to do:

- Extract remaining renderer overlay-like passes only when isolated: target
  outline, ghost-mask highlight, motion trails, cacheline outline/heat overlay,
  and prime/range/multiples dot/label passes.
- Keep `SieveRenderer` as the source of layout truth unless a full renderer-mode
  contract is implemented.

### 3. Keep WebGL Worker Rendering Reliable

Done: production uses `BitGridGLWorker`; direct `BitGridGL.js` was removed; GL
draws background, bit cell fills, focus/prime/range/multiples tints and borders,
lowered-cell geometry, and rise-and-settle animation offsets. Worker context-loss
recovery and a worker parity harness exist. The FPS/debug UI is a React window
outside the 3D/canvas plane, toggled by a toolkit icon and defaulting to hidden.

Left to do:

- Run `parity.html` after shader, packing, or state-texture changes.
- Keep the OffscreenCanvas capability check and `glUnavailable` warning. There is
  no Canvas2D cell-fill fallback anymore.
- Consider partial `texSubImage2D` updates only after profiling shows full state
  repacks are a real bottleneck at large bit counts.
- If adding new per-bit GL state, plan the texture protocol first. The current
  `R8UI` state byte is fully allocated.

### 4. Preserve Playback And Animation Correctness

Done: playback loops are centralized in `usePlaybackLoop`; callback refs prevent
listener/effect churn; timeline wipe works during inter-event delay; changing
animation settings during single-event loop no longer freezes playback.

Left to do:

- Fix mask-stamp animation polish: the final stamp currently moves too far up
  and down. Make travel take longer, make the final settle shorter, and reduce
  the final vertical motion to only a few pixels.
- Any new animation must abort on `seekGenRef`, pause on `globalPausedRef`, and
  set `animBusyUntilRef` when it blocks all-events playback.
- Test all animation modes with play, pause, scrub, event step, all-events
  playback, and single-event repeat.

### 5. Improve Widget And Panel Workflows

Done: all-events and single-event widgets can be joined/split; widget drag
handles are scoped; topbar transport hides automatically when the floating
all-events widget is visible; joined widget anchoring was fixed; dragging or
expanding the joined widget to the left/events side now opens both the events
panel and detail panel, with the single-event timeline shown in detail and the
all-events timeline kept in the events panel; detail-panel timeline actions
keep the percent and gear aligned on the right.

Left to do:

- When pushing the joined widget into the detail panel, include all-events
  controls and the all-events timeline in the detail panel.
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

Done: pinned and hover balloons are extracted under `src/visualizer/` and hover
suppression is in place over floating widgets.

Left to do:

- Add a clear visual connector from a balloon to its bit: a soft curved filled
  shape between the nearest bit edge and the nearest balloon corner.
- Remove stale connector or balloon-placement code after the new connector is
  working.
- Check balloon clamping with events panel open/closed, settings open/closed,
  joined widget visible, and minimap visible.

### 8. Improve Settings And Color Discoverability

Done: settings tabs are split; preview-style option buttons are used broadly;
legend overlay/animation rows are clickable; color presets include more engaging
schemes; canvas background colors are persisted per theme.

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
`stepsPanelCollapsed` migrates to `eventsPanelCollapsed`; merge helpers cover
partial saved settings; `widgetsJoined`, colors, canvas backgrounds, panel
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
paths.

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
`startTransition`.

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
- Remove unimported or historical files when their value is gone. Example:
  `src/settings/TitleTab.jsx` is currently unimported historical code.

## Completed Work Worth Remembering

The old guide contained a long session-by-session log. These are the durable
facts that still matter:

- Settings are split into `LayoutTab`, `ColorsTab`, `AnimationTab`, and
  `LegendTab`; `SettingsPanel` is mostly a shell plus floating legend state.
- Renderer overlays already extracted: `SearchOverlay`, `MaskWriteOverlay`,
  `VectorTouchOrderOverlay`, `CachelineAnnotationsOverlay`, and
  `MinimapRenderer`.
- Visualizer hooks already extracted: `useTraceExport`, `useDraftInput`,
  `useKeyboardShortcuts`, `usePlaybackClock`, `use3DCamera`,
  `usePlaybackLoop`, `useSearchState`, and `usePanelChoreography`.
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
- Color presets, canvas background customization, clickable legend rows,
  keyboard help, debug-tools performance window, copy-event buttons, collapsed
  group count badges, and joined widgets are implemented.
- The current test suite is meaningful. Do not describe build as the only safety
  net anymore.

## Topic Backlog

Use this as overflow for work that does not fit cleanly under one goal yet.

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
