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
  `src/lib/viewPrefs.js` for every persisted field. Existing keys: `autoAnimateOnSelect` (bool, default true) controls whether clicking an event auto-starts the animation loop; persisted via `getInitialViewState` / `writeViewPrefs`.
- `autoAnimateOnSelectRef` is passed to `usePlaybackLoop`; Effect 1 (selected-step auto-replay loop) checks it before starting and includes `autoAnimateOnSelect` in its dep array so it tears down immediately when the toggle is switched off.
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
- Keep the OffscreenCanvas capability check and `glUnavailable` warning. There is
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

  GL/Canvas2D resize alignment fixed (round 3): `refreshCanvasLayout` now
  defers the GL canvas CSS `style.width/height` update using
  `requestAnimationFrame` when the canvas size is changing. The wrapper div
  CSS is still updated immediately (for correct `translate(-50%,-50%)`
  centering). The GL canvas CSS stays locked to its OLD size (matching the
  existing drawing buffer) until the rAF fires. This prevents the browser
  from CSS-scaling the old OffscreenCanvas drawing buffer to fill the new
  CSS dimensions — the root cause of the grid and annotations moving in
  opposite directions during window resize. The rAF fires before the next
  browser paint, by which point the worker has processed the resize+render
  messages and updated its drawing buffer to the new size. In the one
  intermediate frame (if resize events and rAF firing are in different
  rendering cycles), the GL canvas clips at the old size (showing a
  slightly narrower grid) rather than distorting cell scales. Safari (direct
  synchronous mode) is unaffected; the deferred CSS update is harmless.
  GL/Canvas2D resize alignment fixed (round 3, corrected): `refreshCanvasLayout`
  now defers the GL canvas CSS `style.width/height` update via
  `requestAnimationFrame` when the canvas size changes. The wrapper CSS is
  updated immediately (for centering). When size IS changing, the GL canvas
  CSS is **explicitly locked to the OLD size** (`lockW = oldCanvasW`) to
  override the CSS `inset: 0` rule (which would auto-expand the GL canvas to
  the new wrapper size, triggering the same CSS-scale artifact). The lock
  prevents the browser from stretching the old OffscreenCanvas drawing buffer
  to fill the new CSS dimensions — the root cause of grid/annotations moving
  in opposite directions and zoom appearing to affect only annotations. The
  rAF fires before the next browser paint; by then the worker has processed
  the resize+render messages and updated the drawing buffer, so the GL CSS
  update to the new size is clean. Safari (direct mode) is unaffected.

  GL/Canvas2D resize alignment fixed (round 4, horizontal-growth race):
  `BitGridGLWorker` and `bitGridWorker` now exchange an explicit
  `rendered` acknowledgement (sequence-numbered). `Visualizer.refreshCanvasLayout`
  still locks GL canvas CSS to the old size during a size change, but when the
  canvas width grows it now waits for the matching worker render ack before
  unlocking GL CSS `style.width/height` to the new dimensions. This removes the
  remaining race where a single-frame rAF unlock could still land before the
  worker completed resize+render on large horizontal window growth. A short
  timeout fallback (80ms) keeps UI responsive if an ack is delayed.

  GL/Canvas2D resize alignment fixed (round 5, wrapper-shift position drift):
  When the wrapper (`canvas-transform-wrapper`) grows horizontally it moves
  its left edge leftward by `deltaW/2`. The GL canvas (`position:absolute;
  left:0`) moves with it. Canvas2D simultaneously re-renders with
  `panX += deltaW/2`. The combined screen offset between old GL cells and new
  Canvas2D annotations is a full `deltaW` (= `newW − oldW`). Fix: while GL
  CSS is locked to the old size, apply `transform:translate(deltaW, 0)` to
  the GL canvas so world-position W appears at the same screen X in both:
    GL screen X  = (center − newW/2 + deltaW) + (oldW/2 + panX_old)
                 = center + panX_old + deltaW/2
    C2D screen X = (center − newW/2) + (newW/2 + panX_old + deltaW/2)
                 = center + panX_old + deltaW/2  ✓
  The transform is cleared atomically with the CSS unlock in the same rAF
  callback. The `!glSizeChanging` path also defensively clears residual
  transforms. Note: using `deltaW/2` (half the delta) only partially
  compensates and still produces visible drift — the full `deltaW` is needed.

  GL/Canvas2D resize alignment fixed (round 6, backing-store catch-up gate):
  The most reliable main-thread signal turned out not to be the worker ack but
  the transferred GL canvas backing-store size itself. During large horizontal
  growth, `Visualizer.refreshCanvasLayout` now keeps the GL canvas CSS locked
  until the transferred canvas `width/height` catch up to the main Canvas2D
  canvas backing-store size, then unlocks CSS width/height and clears the
  temporary `translate(...)` compensation on the next rAF. Repeated
  `refreshCanvasLayout` passes during the same resize now preserve that active
  lock instead of treating the repeated target size as a normal no-op layout
  pass and clearing the transform early. The 80ms timeout fallback remains so
  the UI cannot stall indefinitely if the GL layer stops reporting the new
  size.

  GL/Canvas2D resize alignment fixed (round 7, GPU backing-size cap):
  On high-DPI wide displays, the oversized GL plane can hit the GPU canvas
  dimension limit before the user reaches full-screen width. Example: on a 5K
  display at `devicePixelRatio=2`, the current `canvasW ~= viewportW * 3.2`
  policy crosses `16384` backing pixels at just over `2560` CSS px width. That
  causes the GL canvas to fall behind while Canvas2D overlays still render at
  the requested size, presenting as horizontal drift. `BitGridGLWorker` now
  queries the WebGL limits (`MAX_VIEWPORT_DIMS`, `MAX_RENDERBUFFER_SIZE`,
  `MAX_TEXTURE_SIZE`) and clamps the GL effective DPR during resize so the GL
  backing store never exceeds the hardware limit. Visual alignment is preserved;
  the only tradeoff is that GL bit fills become slightly lower resolution at
  extremely large window sizes instead of desynchronizing from the overlays.

  GL/Canvas2D resize alignment fixed (round 8, start in direct mode near the
  limit): some displays are risky before the window is even resized because the
  available screen width plus the 3.2x oversized-plane policy already places the
  worker GL path at or near the GPU backing-size ceiling. `BitGridGLWorker`
  now checks the current display geometry at `attach()` time and skips the
  OffscreenCanvas worker path entirely when the estimated full-screen oversized
  plane would land within ~2% of the hardware limit. In that case it starts in
  synchronous main-thread `BitGridGLCore` mode from the outset, avoiding the
  worker/compositor path on exactly the class of 5K/high-DPI setups where the
  resize drift was still reproducible.

  GL diagnostic overlay (round 9): when direct-mode fallback is not working,
  the root cause is not obvious. Added `getDebugInfo()` method to
  `BitGridGLWorker` that exposes GL mode, max canvas dimension, device pixel
  ratio, viewport + screen dimensions, estimated canvas width, estimated
  backing size, risk threshold, and explicit mode reason
  (`safari`/`worker-unsupported`/`near-gpu-limit`/`worker-path`). A fixed
  debug overlay in the top-right corner (green text on black, monospace font)
  displays this information in real-time so maintenance can see exactly what
  decision the risk check made on the user's actual hardware. The overlay now
  updates continuously during render and also on `window.resize`, so dragging
  or resizing the browser updates values live instead of showing stale startup
  snapshots. This diagnostic layer helps answer: "Why is direct mode engaged?"
  and "Is the near-limit check changing with viewport size as expected?"

  GL/Canvas2D resize alignment fixed (round 10, direct-mode lock bypass):
  the worker resize synchronization lock (old-size CSS lock + temporary
  translate + backing-store catch-up wait) is only needed when rendering is
  asynchronous via OffscreenCanvas worker. After near-limit fallback started
  forcing Chromium into direct mode, this worker-only lock could still run
  during direct resizes and introduce drift. `BitGridGLWorker` now exposes
  `isDirectMode()`, and `Visualizer.refreshCanvasLayout` bypasses the lock/wait
  path entirely when direct mode is active, applying GL canvas CSS size
  updates immediately and clearing any residual transform. Worker mode retains
  the full lock/catch-up path.

  GL/Canvas2D resize alignment fixed (round 11, deterministic GL anchoring):
  Chromium could still show overlay drift in direct mode at very large canvas
  sizes because the GL canvas had `position:absolute; inset:0` while
  `refreshCanvasLayout()` also set explicit `style.width/height`. During rapid
  horizontal resize this mixed constraint model could produce inconsistent
  anchoring behavior versus the Canvas2D layers. Fix: GL canvas now uses a
  deterministic top-left anchor (`top:0; left:0`) in CSS, and layout refresh
  explicitly sets `left/top` plus `right/bottom:auto` before applying dynamic
  sizes/transforms. This removes right/bottom constraint interference and keeps
  GL and Canvas2D overlays pinned to the same origin during large resizes.

  GL/Canvas2D resize alignment fixed (round 12, integer canvas geometry):
  target canvas dimensions were previously allowed to stay fractional CSS
  values (from overscan multipliers like 3.2 and diagonal factors), which can
  force subpixel raster scaling at very large dimensions and high zoom. In
  direct mode this can surface as overlay drift after crossing certain window
  widths even when mode selection and anchoring are correct. `getCanvasTargetSize`
  now rounds target width/height to integer CSS pixels before resize/layout
  updates so GL and Canvas2D share the same integer geometry end-to-end.

  GL/Canvas2D alignment debugging (round 13, permanent debug widget):
  Misalignment persists at specific viewport/zoom combinations despite rounds 1–12
  fixes. To isolate the coordinate divergence, moved temporary GL mode overlay into
  a permanent DebugToolsPanel widget alongside FPS metrics. `DebugToolsPanel.jsx`
  now accepts `glDebugInfo`, `glCanvasRef`, and `glRendererRef` props and displays:
  (1) GL mode/reason/risk status; (2) viewport/canvas/backing geometry; (3) GL
  canvas bounding rect via ResizeObserver. This allows per-frame capture of exact
  canvas origins and sizes to identify where GL and Canvas2D diverge. Widget is
  toggled with the debug tools button in the toolbar, appears as a secondary panel
  next to the FPS widget, and updates on canvas resize/layout changes. Removed the
  temporary fixed-position overlay from `Visualizer.jsx` render tree.

  GL/Canvas2D alignment debugging (round 14, export-ready diagnostics):
  Added camera state diagnostics and a direct clipboard export path so resize bugs
  can be pasted into issues/chats without manual transcription errors.
  `DebugToolsPanel.jsx` now also reads `zoomLevel` plus 3D camera `rotateX/rotateY`
  values (via `camera3DRef`) and renders them in the GL section. A `Copy Debug To
  Clipboard` button now exports a structured report including mode/risk/canvas
  geometry, zoom, rotation, and GL rect coordinates. This makes breakpoint-specific
  failures (like large negative GL rect offsets during direct mode near GPU limits)
  reproducible and easier to compare across browsers.

  GL/Canvas2D alignment debugging (round 15, rect delta + transform introspection):
  Added explicit GL-versus-main-canvas diagnostics to distinguish real layer drift
  from transform-inflated bounding boxes. Debug panel now captures both `glCanvas`
  and `mainCanvas` `getBoundingClientRect()` values, reports deltas
  (`dx/dy/dw/dh`), and includes transform metadata (`glCanvas.style.transform`,
  computed GL transform, and wrapper computed transform). These values are included
  in the clipboard report so breakpoint failures can be triaged as either
  coordinate divergence (non-zero deltas) or shared-transform distortion
  (large but matching rects).

  GL/Canvas2D alignment hardening (round 16, applied-transform sizing source):
  Some high-zoom/high-resize breakpoints showed matching GL/Main rects (delta=0)
  while camera diagnostics disagreed with wrapper transform, indicating geometry
  sizing could be driven by a different angle source than the rendered transform.
  `getCanvasTargetSize` now derives overscan scaling from the applied wrapper
  transform string (`camera3DTransform`) instead of relying only on mutable
  camera ref fields. This keeps resize geometry calculations aligned with what is
  actually rendered. Debug panel now reports both camera angles and applied angles
  so desync can be detected immediately in clipboard exports.

  GL/Canvas2D alignment hardening (round 17, camera/apply lockstep + light-mode debug UX):
  Additional reports still showed camera angles diverging from applied wrapper tilt
  (`camera.rotateX` not matching rendered transform), while GL/Main rects remained
  aligned. Added a defensive reconciliation loop in `use3DCamera` that samples the
  live `Camera3D` instance each animation frame and updates React transform/style
  state only when values actually differ. This guarantees wrapper transform state
  cannot remain stale if an update callback is missed during heavy interaction.
  Also made `DebugToolsPanel` theme-aware: light mode now uses high-contrast text,
  borders, and section colors so diagnostics stay readable across themes.

  GL/Canvas2D stability + debug UX (round 18, perspective-safe tilt and no click-through):
  With camera/applied transforms in sync, remaining failures correlated with very
  large projected wrapper bounds at high zoom+tilt. Added a dynamic tilt safety cap
  tied to canvas height and camera perspective (`computeSafeTiltDegrees` in
  `Visualizer.jsx`), applied during layout refresh. This bounds perspective
  amplification so top-edge projection cannot explode as viewport/overscan changes.
  Startup tilt and tilt-toggle now target `min(30°, cam.maxTilt)`, and StrictMode
  re-enable paths respect the same cap. Also fixed debug panel interaction capture:
  `.debug-tools-panel` clicks are now excluded from canvas pointer-up bit toggles
  and the panel stops pointer/click propagation so `Copy Debug To Clipboard` no
  longer toggles bits behind the panel.

  Debug tools stability fix (round 19, TDZ crash on panel open/click):
  adding the new keyboard-copy hook introduced a temporal-dead-zone bug in
  `DebugToolsPanel.jsx`: a `useEffect` dependency referenced `handleCopyDebug`
  before that callback was initialized, throwing `ReferenceError: Cannot access
  'handleCopyDebug' before initialization` and blanking the full React tree when
  the panel mounted/interacted. Fix: define `handleCopyDebug` before any effects
  that reference it (directly or via dependency arrays), then bind the key handler
  ref from a later effect. Result: opening/clicking debug panel no longer crashes.

  GL/Canvas2D wide-viewport alignment fix (round 20, DPR=1 snap quantization):
  a remaining "looks fine at ~2.3k wide, off at ~3.2k wide" case in direct GL
  mode was traced to vertex shader corner snapping at `u_dpr=1`. The previous
  `corner = floor(corner * u_dpr + 0.5) / u_dpr` path quantized every cell corner
  to integer CSS pixels, while Canvas2D overlays use subpixel coordinates; across
  long rows this created cumulative visual drift. Fix in `bitGridGLCore.js`:
  apply DPR snapping only when `u_dpr > 1.01`. At DPR=1 we now preserve subpixel
  geometry to match Canvas2D positioning.

  GL/Canvas2D breakpoint hardening (round 21, layout-fingerprint completeness):
  remaining reports showed exact origin math and equal GL/main rects, yet visible
  mismatch could still appear at wider viewports. To eliminate stale position-texture
  reuse when wrap/layout state changes, the GL position fingerprint in
  `Visualizer.jsx` now also includes renderer layout-freeze inputs:
  `_frozenClPerVRow`, `layoutAvailWidth`, and `layoutAvailHeight`. This forces
  `uploadPositions()` whenever the frozen cacheline-per-row decision or visible
  layout availability changes. Debug export now also reports these fields for
  breakpoint capture verification.

  GL/Canvas2D breakpoint hardening (round 22, direct-mode force-repack):
  at extreme canvas sizes in direct mode, reports still showed exact origin math
  (`bit0` parity and zero rect deltas) while users observed visual disconnect.
  To rule out any residual position-texture cache edge case, the patched GL render
  path in `Visualizer.jsx` now forces `uploadPositions()` every frame when
  `isDirectMode()` is true (fingerprint bypass). Worker mode keeps fingerprint-based
  incremental uploads. This is a targeted safety path for the near-gpu-limit direct
  scenario.

  GL/Canvas2D breakpoint triage tooling (round 23, layer isolation mode):
  when debug metrics all agree (matching rects, bit0 parity, same transforms) but
  users still see a disconnect, the next question is whether it is a coordinate
  mismatch or a multi-layer 3D compositing artifact. Added debug layer isolation
  control wired through `Visualizer.jsx` -> `CanvasStage.jsx` -> `DebugToolsPanel.jsx`:
  `normal` / `gl-only` / `overlays-only`. Can be cycled via button in Debug Tools
  or `V` keyboard shortcut while the panel is open. The selected mode is included
  in copied debug reports (`Layer Mode:`) so breakpoint captures remain comparable.

  Debug visibility upgrade (round 24, full report shown in-panel):
  users needed the exact full diagnostic block visible without copying to clipboard.
  `DebugToolsPanel.jsx` now renders `FULL DEBUG REPORT (LIVE)` as a scrollable
  monospace `<pre>` that mirrors `buildDebugReport()` output exactly (same fields
  as clipboard export: mode, risk, viewport/canvas/backing, camera/applied angles,
  layer mode, renderer state, layout freeze fields, GL worker state, rect deltas,
  transforms, and bit0 parity lines).

  GL alignment hardening (round 25, real backing-size cap probe):
  breakpoint reports showed exact pan/origin math and zero rect deltas, while GL-only
  still drifted at large widths. A likely root cause is that browser canvas backing
  limits can be lower than reported WebGL caps (`MAX_TEXTURE_SIZE` etc.), causing
  implicit backing-size clamp and projection mismatch at large CSS widths.
  `BitGridGLWorker.getMaxGLCanvasDimension()` now combines GL caps with a real
  HTMLCanvas backing-size probe (`canvas.width` assignment binary search) and uses
  the minimum. This keeps resize DPR clamping and near-limit decisions aligned with
  the actual drawable backing-store limit on the running browser/GPU.

  GL alignment hardening (round 26, Chromium direct-mode compositor cap):
  user breakpoints still showed exact math parity (`bit0` parity, zero GL/Main
  rect deltas, matching camera/applied transforms) while GL-only visuals drifted
  in Chromium at very wide canvas sizes; Safari remained correct. This points to
  a browser compositor path issue rather than coordinate math. `BitGridGLWorker`
  now applies an additional direct-mode safe backing cap on Chromium-family
  browsers (`8192` px max dimension) by lowering effective DPR when needed.
  This keeps very large direct-mode GL canvases out of the compositor tiling
  regime that can offset projected WebGL layers. Debug output now reports both
  `directCompositorSafeDimension` and `effectiveMaxBackingDimension` so future
  breakpoint captures can confirm when the cap is engaged.

  GL alignment hardening (round 27, normalized position texture coordinates):
  the compositor cap engaged correctly in both good and bad Chromium breakpoints,
  but the wide case still drifted while Safari remained correct. That ruled out
  the backing-size cap as the sole cause and shifted suspicion to browser-specific
  handling of large canvas-space position values in the GL position texture path.
  `hostStatePacker.packPositions()` now stores pan-independent positions normalized
  by canvas CSS width/height, and the vertex shader reconstructs CSS-space by
  multiplying by `u_canvasSize`. This keeps texture payload values near 0..1
  instead of large absolute canvas coordinates and removes another large-number
  numeric path from Chromium direct-mode rendering.

  GL alignment hardening (round 28, shared direct-mode DPR across sibling canvases):
  later breakpoint captures showed the bad cases lining up with a much smaller
  GL effective DPR (`_dpr ~= 0.58`) while Canvas2D overlays still rendered at the
  full window DPR. The CPU-side coordinate math remained correct, and both canvas
  elements reported identical projected rects, which points to Chromium applying
  different bitmap-to-CSS scaling paths to sibling canvases inside the same 3D
  transform. Fix: when GL is in direct mode, `Visualizer.refreshCanvasLayout()` now
  asks `BitGridGLWorker` for its effective DPR first and passes that same DPR into
  `SieveRenderer.resize()`. The overlay canvases and GL canvas therefore share the
  same backing-to-CSS ratio under the wrapper transform instead of only sharing the
  same CSS box size. `Visualizer` also now treats `canvasWidth/canvasHeight` as the
  source of truth for GL CSS size, rather than re-deriving CSS dimensions by dividing
  the overlay canvas backing size by `window.devicePixelRatio`.

  GL alignment hardening (round 29, Canvas2D actual-DPR accounting):
  after introducing override DPR for the Canvas2D layers, some renderer internals
  still derived logical canvas size from `window.devicePixelRatio`. That became
  wrong whenever direct-mode GL forced an effective DPR below the window DPR.
  `SieveRenderer` now tracks `canvasDpr` explicitly and uses it for logical
  width/height calculations (`_buildFrameContext`, `_computeClPerVRow` fallback)
  so internal clipping and clear passes reflect the canvas' real backing ratio.

  GL alignment hardening (round 30, composite direct-mode GL through Canvas2D):
  even with shared DPR and corrected Canvas2D accounting, Chromium still showed
  misalignment once the live WebGL canvas was heavily upscaled in direct mode,
  while Safari remained correct. The remaining differentiator was the WebGL canvas
  element itself. In risky direct-mode cases (`effectiveDpr < 1`), `Visualizer`
  now renders GL first, then `SieveRenderer` composites that GL canvas into the
  main 2D canvas via `drawImage(...)` before drawing overlays. In normal mode the
  live GL element is hidden while this composited path is active, so Chromium no
  longer has to project the WebGL canvas element directly under the large CSS/3D
  transform. Debug isolation modes still keep the live GL canvas available.

  GL alignment hardening (round 31, logical-size source-of-truth consistency):
  post-round-30 reports showed X alignment fixed but a remaining Y-only offset.
  Root signal: when DPR is clamped, backing sizes are rounded per-axis, so
  re-deriving logical size from `canvas.width / dpr` can produce axis-specific
  fractional drift. `SieveRenderer` now consistently treats `canvasWidth` /
  `canvasHeight` as the logical-size source of truth (with backing/dpr only as
  fallback), including frame context sizing, cacheline overlay visible-range math,
  ripple culling bounds, and GL-composite destination dimensions. Debug output now
  reports renderer logical canvas size and renderer DPR explicitly so dumps no
  longer imply `window.devicePixelRatio` is always the active 2D canvas DPR.

  GL alignment tooling (round 32, manual Y calibration control):
  user validation showed X alignment corrected with a remaining Y-only offset at
  wide direct-mode breakpoints. Added a temporary debug calibration control in
  `DebugToolsPanel`: `GL Y Offset (debug calibration)` slider/buttons
  (`-400..+400 px`, step 1, quick +/-10 and reset). The value is applied to both
  paths: (1) live GL canvas positioning (`glCanvas.style.top`) and (2) the
  direct-mode GL->Canvas2D compositing destination Y in `SieveRenderer`.
  The offset is included in copied/live debug reports (`GL Y Offset (debug):`)
  so measured compensation-vs-viewport can be captured and fitted into an
  automatic correction curve if needed.

  GL alignment hardening (round 33, auto Y compensation + manual trim):
  user-provided calibration points showed a repeatable trend: Y offset increases
  as effective DPR drops below ~0.9 and rises further with tilt/perspective.
  `Visualizer` now computes an automatic Y compensation in direct mode:
  `offset ≈ cssHeight * max(0, 1 - effectiveDpr - 0.08) * (0.48 + 0.80*tiltStrength)`
  where `tiltStrength = hypot(sin(|rx|), sin(|ry|))` from applied camera angles.
  This auto value is applied to both live GL canvas positioning and GL->2D
  compositing. The debug slider remains as a manual trim on top. Debug reports
  now include auto/manual/total Y offsets so model tuning can be done from
  captured breakpoints without guessing.

  GL alignment hardening (round 34, auto model retune from residuals):
  new calibration samples still needed manual trims (`+60`, `+110`, `+280`) at
  different DPR/tilt points. Auto compensation was underestimating medium tilt
  and some 2D-wide cases. Updated model:
  `offset ≈ cssHeight * max(0, 1 - effectiveDpr - 0.08) * factor`
  with `factor = min(1.32, 0.56 + 0.24*t + 3.95*t^2)` and
  `t = hypot(sin(|rx|), sin(|ry|))`.
  This keeps low-tilt behavior near previous values while increasing medium-tilt
  response and capping extremes to avoid runaway over-correction.

  GL alignment hardening (round 35, low-tilt residual trim):
  follow-up samples showed modest over-correction in low-tilt / near-2D cases
  (manual residuals around `-17` to `-28` px), while medium-tilt response was
  acceptable. Coefficients were adjusted to slightly lower the base factor and
  preserve tilt growth:
  `factor = min(1.32, 0.54 + 0.24*t + 4.05*t^2)`.
  Net effect: less correction at `t≈0`, nearly unchanged correction at
  medium tilt, and capped high-tilt behavior retained.

  GL alignment hardening (round 36, high-DPR tilt uplift):
  additional sample at `dpr≈0.84`, `tilt≈14.4°` still required significant
  positive manual trim, indicating under-correction in the small-deficit /
  non-zero-tilt corner. Added a bounded uplift term on top of the base model:
  `uplift = cssHeight * tiltStrength * max(0, (0.14 - dprDeficit)/0.14) * 0.27`
  and `offset = base + uplift`.
  This selectively increases compensation when DPR deficit is modest but tilt is
  present, while leaving low-DPR cases mostly unchanged.

  Debug calibration workflow (round 37, paste/apply snapshot):
  to speed iterative re-checks, `DebugToolsPanel` now supports importing old
  debug dumps. A new `IMPORT SNAPSHOT (PASTE)` textarea + `Apply Pasted Snapshot`
  button parses key fields from pasted text (`Zoom`, `panX`, `panY`, applied
  rotate X/Y, `Layer Mode`, and manual GL Y offset) and applies them through
  `Visualizer` via `applyDebugSnapshot`. This lets users jump back to the same
  captured pose quickly, then report new manual residuals after model retunes.
  Manual input remains explicitly present in the report as
  `GL Y Offset (manual)` and `GL Y Offset (total)`.

  GL alignment hardening (round 38, small-deficit tilt bridge):
  new telemetry showed a failure case where effective DPR was only slightly
  below 1 (`~0.97`) but tilted direct mode still needed a large positive Y
  compensation, while true DPR=1 cases remained near zero. The auto model in
  `computeAutoGlYOffset` now treats these separately: it keeps a hard guard for
  near-exact DPR=1 (`rawDeficit < 0.01 => 0 offset`), preserves the prior
  high-deficit behavior (`max(0, rawDeficit - 0.08)`), and adds a
  tilt-weighted bridge term for the 0.95-0.99 DPR range where Chromium still
  drifts under projection. The high-DPR uplift now keys off `rawDeficit`
  directly with a lower coefficient to avoid over-correction.

  GL alignment hardening (round 39, high-deficit tilt damping):
  subsequent wide-screen samples (`dpr~0.59`, `tilt~18 deg`) showed that round
  38 could over-correct heavily in tilted high-deficit direct mode (auto near
  +1425 while manual residual was about -302). `computeAutoGlYOffset` now adds
  a damping term tied to `rawDeficit * tiltStrength` in the factor curve,
  clamped with a floor, so tilt amplification tapers as DPR deficit grows.
  At the same time, the high-DPR uplift coefficient was nudged up slightly so
  small-deficit tilted cases (e.g. `dpr~0.97`) still receive meaningful auto
  compensation. Net intent: reduce overshoot in extreme wide+tilt breakpoints
  without regressing near-1 DPR tilt fixes.

  GL alignment hardening (round 40, residual trim term):
  follow-up telemetry after round 39 was close but still showed opposite-sign
  residuals in two high-deficit cases: about `-15` px in a tilted wide case and
  about `+12` px in a flat case. Added a small residual term
  `h * rawDeficit * (0.01 - 0.06 * tiltStrength)` on top of base+uplift. This
  slightly increases compensation for flat high-deficit scenes and slightly
  reduces compensation for tilted high-deficit scenes, while staying near-zero
  for near-1 DPR cases due to `rawDeficit` scaling.

  GL alignment hardening (round 41, width-aware residual gate):
  new telemetry from very wide direct-mode scenes (`cssWidth ~13.2k-15.5k`) at
  `dpr ~0.53-0.62` showed under-correction returning (+95 to +172 manual) while
  previously calibrated narrower cases stayed accurate. `computeAutoGlYOffset`
  now accepts `cssWidth` and adds a width-gated residual term that ramps in for
  ultra-wide canvases (`widthGate` starting near 12.5k CSS px), uses a
  medium-tilt emphasis, and suppresses at high tilt (`highTiltGate`) to avoid
  regressing prior high-tilt matches. This targets the new ultra-wide misses
  without re-opening already-stable ranges.

  GL alignment hardening (round 42, mid-width residual lane):
  further data at narrower widths (`cssWidth ~10.0k-11.7k`, `dpr ~0.70-0.82`)
  still required positive manual offsets (+52 to +120), indicating this band
  behaves differently from both previously fixed ultra-wide scenes and earlier
  near-1 DPR cases. Added a dedicated mid-width residual term in
  `computeAutoGlYOffset` with a separate gate (ramp-in near 9.6k, ramp-out near
  12.15k), tilt-dependent factor, and medium-tilt dampening. This lets us lift
  compensation in the mid-width band without over-driving the ultra-wide lane.

  GL alignment validation (round 43, convergence check):
  rerunning the four 3127x1197 calibration scenes after round 42 reduced manual
  trims from large positives to near-zero residuals (`+14`, `-4`, `+7`, `-17`).
  This indicates the current model shape now spans the practical direct-mode
  width/tilt ranges tested so far (mid-width and ultra-wide) without requiring
  ongoing manual correction for baseline use.

  GL alignment tooling (round 44, interactive calibration mode):
  the debug tools panel now includes a full calibration workflow that can be
  launched in-place. When active, `Visualizer.jsx` enables manual GL X/Y trim
  controls, `SieveRenderer` outlines every visible cell in the Canvas2D overlay,
  and `DebugToolsPanel.jsx` drives a 10-case rotation sweep with viewport target
  assistance. The panel can try `window.resizeTo(...)` toward a target viewport,
  fall back to manual border-drag guidance when the browser blocks resize, let
  the user commit per-case calibration points, record extra viewpoints, and copy
  a structured calibration report to the clipboard. Exiting calibration mode
  restores the user's prior zoom/pan/rotation/layer snapshot.

  Debug tools usability (round 45, collapsible sections + viewport scrolling):
  the expanded calibration workflow made the debug window too tall to navigate
  on some viewports. `DebugToolsPanel.jsx` now groups the largest areas into
  collapsible sections (`GL MODE`, `CANVAS COORDS`, `FULL DEBUG REPORT`,
  `IMPORT SNAPSHOT`, and `ALIGNMENT CONTROLS`), with the long report/import
  blocks closed by default. `20-debug-tools.css` also caps the panel height to
  the viewport and enables internal scrolling so the lower controls remain
  reachable even when every section is expanded.

  GL alignment retune (round 46, mid-width axis-aware tilt compensation):
  the 2707x1307 calibration sweep exposed that the prior auto-offset model still
  under-corrected direct-mode scenes in the ~10k-12k CSS width band when tilt
  was driven mostly by `rotateX` or by a single-axis `rotateY`. `computeAutoGlYOffset`
  in `Visualizer.jsx` now keeps separate `xTiltStrength` / `yTiltStrength`
  signals, derives dominant-axis terms, and feeds them into both the main base
  factor and the mid-width residual lane. Mixed X/Y tilts remain close to the
  previous behavior, while X-dominant and Y-dominant near-limit cases receive
  extra compensation without reopening the ultra-wide path.

  Calibration UX fix (round 47, manual X-offset responsiveness + zoom telemetry):
  manual GL X alignment controls in the debug calibration panel now apply
  immediately. `Visualizer.jsx` updates direct GL canvas positioning and
  composited GL offsets in a dedicated effect whenever X/Y debug trims change,
  then triggers a render so slider/button nudges are visible without waiting for
  a resize/layout event. The debug report and clipboard calibration report now
  include explicit browser zoom telemetry (`window.devicePixelRatio` and
  `visualViewport.scale` when available) so calibration datasets preserve both
  in-app zoom and browser zoom context.

  GL alignment retune (round 48, high-tilt shape correction for 10k-12k width):
  the 2579x1175 sweep (browser zoom 100%, effective renderer DPR ~0.76 in
  near-limit direct mode) showed two opposite errors at once: X-dominant cases
  (notably high `rotateX`) still under-corrected, while high `rotateY` and
  balanced high mixed-tilt cases over-corrected. `computeAutoGlYOffset` now adds
  `balancedTilt`/`highTilt` terms and retunes coefficients so the model gives
  stronger X-dominant lift but applies explicit damping to high Y-dominant and
  high balanced-mix corners. The same damping is applied in the mid-width
  residual lanes to reduce over-shoot without undoing medium-tilt convergence.

  Calibration UX update (round 49, fine-grained nudge buttons):
  both manual GL offset controls in `DebugToolsPanel.jsx` now include `-1` and
  `+1` nudge buttons in addition to the existing `-10`, `0`, and `+10` actions.
  This makes per-case alignment commits easier when coarse 10px steps are too
  large, especially near convergence where residuals are single-digit pixels.

  GL alignment retune (round 50, broad under-correction recovery at 2579x1175):
  the latest 2579x1175 sweep at browser zoom 100% still showed consistently
  positive manual Y trims across nearly every recorded case (roughly +115 to
  +255), while the high balanced `20/20` case stayed close. `computeAutoGlYOffset`
  now increases both X- and Y-dominant lift, reduces the previous Y-high-tilt
  damping, and adds a balanced low-tilt boost gated to fade out before the
  high-tilt shoulder. This is targeted at the 10k-12k near-limit band with
  effective renderer DPR around 0.76, so medium/balanced tilts gain lift while
  the already-close high balanced case remains protected.

  GL alignment retune (round 51, stronger near-limit lift + extra case grid):
  the follow-up 2579x1175 report still showed broad positive residual trims at
  browser zoom 100% (most cases requiring +150 to +257 manual Y), with only the
  high balanced `20/20` case close/slightly over. The model was retuned again to
  increase baseline/mid-tilt lift in the 10k-12k width band, strengthen both
  X- and Y-dominant residual lanes, and keep explicit high balanced-tilt damping
  so `20/20` does not run away. The calibration suite in `DebugToolsPanel.jsx`
  was expanded with focused intermediate cases (`24/0`, `0/24`, `16/8`, `8/16`)
  to isolate axis bias and mixed-tilt curvature during the next sweep.

  GL alignment retune (round 52, axis-shaped damping at 2608x1175):
  the 2608x1175 sweep surfaced a split pattern: large under-correction in
  X-heavy/medium-mixed cases (e.g. `18/0`, `12/12`, `16/8`, `45/0`) and
  over-correction in Y-heavy/high-mixed cases (`6/24`, `0/32`, `20/20`).
  `computeAutoGlYOffset` was retuned to increase X-dominant lift while adding
  stronger Y-dominant/high-balanced damping, plus a smaller low-tilt Y lane to
  avoid over-pushing Y-heavy medium tilts. Calibration cases were expanded again
  with edge probes (`28/4`, `4/28`) to directly compare X-biased vs Y-biased
  mixed tilts at similar total tilt magnitude.

### 5. Improve Widget And Panel Workflows

Done: all-events and single-event widgets can be joined/split; widget drag
handles are scoped; topbar transport hides automatically when the floating
all-events widget is visible; joined widget anchoring was fixed; dragging or
expanding the joined widget to the left/events side now opens both the events
panel and detail panel, with the single-event timeline shown in detail and the
all-events timeline kept in the events panel; detail-panel timeline actions
keep the percent and gear aligned on the right. Dragging the joined widget onto
the detail panel now shows all-events transport and timeline inside the detail
panel body: `allEventsInDetailPanel` state (persisted), `AllEventsTransport`
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
