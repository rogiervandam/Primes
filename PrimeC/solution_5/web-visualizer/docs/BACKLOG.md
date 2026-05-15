# Backlog

Use this as the short product backlog. For maintenance strategy and completed
refactor history, read `docs/AI_MAINTENANCE.md`.


462 The "Zone opacity" setting should influence the opaticy of the entire double timeline widget, docked or not, including the title, the timelines and the annotation. 

463 if the window is small and the detail panel is forced into more vertical rows, the masks are cut off halfway. Make sure that the masks are fully visible, by making them smaller (keep them proportional x/y).

466 When from the detail panel - section bits clicking on "more" showing the modal of changed/targeted, etc bits, make that modal horizontally scrollable, draggable and resizable, so that users can explore the full list of changed/targeted bits without it being cut off by the screen width. Also make sure that the modal doesn't overlap with side panels when open.

467 When the minimap is toggled on or off, it should fade in/fade out.

468 DONE When doing a "reset zoom" or during a 2d-3d or 3d-2d transition, the camera should smoothly animate to a position where you can see the whole sieve in the main area not covered by panels. This way users won't lose their orientation and can quickly get an overview of the entire sieve layout after zooming out or switching views.

**Feature description (release notes):** Reset zoom and tilt-toggle now animate the 2D camera to show the complete sieve centered in the visible area — the region not covered by the Events or Settings panels.

**Requirements:** When the user triggers "reset zoom" (toolbar button or keyboard shortcut `0`), or when the camera tilt is toggled (flat ↔ 30°), the pan/zoom smoothly animates so the full sieve grid is visible in the uncovered canvas area (excluding left EventsPanel and right SettingsPanel widths).

**Test instructions:**
1. Open a trace file. With the Events panel and Settings panel both open, press `0` (reset zoom) — the sieve should re-center and scale to fill the area between the two panels.
2. Zoom in deeply on a corner, then press `0` — the sieve smoothly animates to the panel-aware fit.
3. Click the tilt button (flat→30°) — after the camera tilt animation completes the viewport smoothly refits to show the whole sieve.
4. Click the tilt button again (30°→flat) — same: viewport refits after tilt returns to 0°.
5. Load a new trace — the initial viewport fit already accounts for open panels.
6. With both panels closed, verify reset zoom / tilt still works correctly (insets = 0 → same as before).

**Edge cases:**
- Panels animate in/out; insets are read at the moment reset zoom or tilt fires, so a panel mid-transition returns the final target inset width. This is acceptable.
- Very small window with both panels open: `effectiveW = max(1, ...)` prevents divide-by-zero.
- The intro tilt (first load) also calls `refitViewportToContent` so the initial view is panel-aware.

**Further ideas:**
- When a panel opens/closes while the user is not interacting, automatically nudge the pan so content doesn't slide under the newly opened panel.

**Notes:**
- ~~must work at different WEGGL SSAA levels, where the zoom seems to be different.~~ Fixed: `wrapperEl` is now resolved via the GL canvas element (always present, all render modes) instead of `renderer.canvas.parentElement` which is `null` for single-canvas modes (the default mode 3). Anchor is now always read from `wrapperEl.style.left/top`.
- ~~still not zooming out enough when 3d.~~ Fixed: tilt angle is now taken from `camera3D.rotateX` (updated synchronously in every animation frame, no timing gap) and CSS transform is read from the GL canvas element (not the glyph overlay canvas, which is absent in the default mode). Both `camera3DRef` and `glCanvasRef` are now threaded through `useViewportNavigation` and `useZoomControls` as extras to `applyViewportFit`.
- ~~at different SSAA levels, visual bit-density (bitStride) changed.~~ Fixed (item 502): `glLayoutComputer.js` now uses `canvasSnapDpr` (= physical device DPR, without SSAA multiplier) instead of `canvasDpr` (which includes the SSAA factor and is further clamped by the canvas size). bitStride is now constant across all SSAA levels and render modes. 55 regression tests added in `glLayoutComputer.test.js`.


469 In settings - layout: rearrange and make the buttons consistent:
Grid views section:
- first row: Range, Primes and Miltiples
- second row: Targeted, Already set, Newly set
- third row: Changed, Touch order, Cachelines (was cacheline hits)
- fourth row: Animations (was Animate)
Assistents section:
- first row: Minimap, Balloon, Inspector
Labels section:
- first row: Number, Bits, Bytes
- second row: Groups, Cachelines (new). Text for cacheline numbers should be possible on the grid as well.
-> Make the heatmap a second mode of the "Cacheline hits", so that when you click on "Cacheline hits" it cycles between showing the cacheline numbers and showing the heatmap and have it off. 

470 While changing the window size, the zoom of the main content should be adjusted so that te exact same bit of the grid stays in view. This way users won't lose their orientation while resizing the window.

472 DONE Viewport fit is wrong in WebGL-tilt modes (1, 3, 5, 7): the grid appears "zoomed in too much" because `applyViewportFit` never reduced `effectiveH` for those modes. The tilt-correction block required a CSS `rotateX(Xdeg)` match, but WebGL-tilt modes leave the GL canvas CSS transform empty (the shader reads `camera3D.rotateX` internally). Fix: use `camera3D.rotateX` as the authoritative tilt angle (already passed by all call sites) and fall back to the CSS-regex value only when `camera3D` is not provided. The same `effectiveH` formula now fires correctly for both CSS-tilt and WebGL-tilt modes (`useViewportFit.js`). Tests: 416 pass, build clean.

471 In settings -> animation, 
- when the user has masks animation enabled, don't change that when the events has no masks. On the butto, text mention: "(no masks in this event)"
- in timeline animation mode, remove "both"; the user must be able to toggle mask and bits individually, so that they can choose to animate both.
- when both are selected, do the mask animation and the bit animation at the same time, so that users can see the correlation between the mask changes and the bit changes more clearly. Try to synchronize the animation of the masks and the bits, so that they start and end at the same time, even if they have different numbers of changes.




Giant features
A Make it possible to open more than one trace at the same time, and switch between them with tabs in the top bar. This way users can compare different traces or work on multiple traces without having to close and reopen them.
B Make it possible to create sieve logs in other docker containers with different algorithms or parameters, and load them into the visualizer for analysis. This way users can experiment with different sieve configurations and see how they affect the events and marked numbers. If possible, add a feature to the visualizer that allows users to launch new sieve containers with custom parameters directly from the interface, and automatically load the generated logs for immediate analysis.
C WHen starting up and loading the events, in the background try mode 1-8 and find out which one has the best fps.
D 




## New Ideas

1 Add a top-bar "Layout scenes" control that cycles through curated bit/byte/grouping arrangements with tiny live previews and one-click apply.

2 Delightful: add a "Prime spotlight" moment when selecting an event - softly dim unrelated cells and animate a short glow path over impacted ranges for about 600 ms.

3 Delightful: add a "Guided tour" mode for first-time trace load that highlights exactly three controls (play, event list, settings) with staged callouts and dismisses permanently after completion.

4 Add a compact "Compare traces" mode that loads a second trace and highlights differences in event counts, timings, and changed-bit ranges at the selected step.

5 Add an accessibility profile switch with presets for color-blind safe palette, high-contrast labels, larger hit targets, and reduced motion.

6 Add bookmarkable "analysis snapshots" (camera + overlays + selected event + panel layout) that users can name and jump to from a dropdown.

