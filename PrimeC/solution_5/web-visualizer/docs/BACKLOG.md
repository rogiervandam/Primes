# Backlog

Use this as the short product backlog. For maintenance strategy and completed
refactor history, read `docs/AI_MAINTENANCE.md`.
#
462 DONE The "Zone opacity" setting should influence the opacity of the entire double timeline widget, docked or not, including the title, the timelines and the annotation.

**Feature description (release notes):** The "Zone opacity" slider in Settings → Layout now controls the opacity of the entire double timeline widget — including its title, timelines, and annotations — whether the widget is docked at the bottom or floating.

**Requirements:** The `zoneBgOpacity` value from renderer state must be applied to the CSS `opacity` of the `.double-timeline` container in both docked (`bottom: Xpx`) and undocked (floating, absolute-positioned) states. The leaving-fade transition (when undocking/hiding) overrides to `opacity: 0`.

**Test instructions:**
1. Open a trace and enable the double timeline (Settings → Layout → double timeline).
2. Drag the "Zone opacity" slider to 0.3 — the entire double timeline widget (title, bars, labels) should become semi-transparent.
3. Undock the widget (drag it away from the dock) — the opacity setting should persist.
4. Verify the leaving-fade transition (dismissing the widget) animates to fully transparent.
5. Re-dock — opacity is still applied correctly.

**Edge cases:**
- Opacity = 0: widget becomes invisible but remains interactive.
- Opacity = 1 (max): widget looks fully opaque as before.
- Leaving-fade transition must override zoneBgOpacity to 0 regardless of the slider value.

**Further ideas:**
- Separate opacity control for docked vs. floating states.

**Notes:**

463 DONE if the window is small and the detail panel is forced into more vertical rows, the masks are cut off halfway. Make sure that the masks are fully visible, by making them smaller (keep them proportional x/y).

**Feature description (release notes):** Mask previews in the Detail Panel now scale down proportionally to fit the available width, so they are never clipped when the window is narrow or the panel is small.

**Requirements:** A `ResizeObserver` is attached to the `.mask-preview-list` container. When the container width changes, the maximum preview width per slot is recomputed as `(containerWidth - gaps) / slotCount`. The scale factor is the minimum of the width-fit scale and height-fit scale, so masks always stay proportional.

**Test instructions:**
1. Open a trace with mask data and select an event that has masks. Verify mask previews are fully visible.
2. Narrow the browser window so the detail panel becomes narrow — mask previews should shrink proportionally rather than being clipped.
3. Widen the window back — masks should grow back to their normal size (capped at the default max size).
4. With multiple mask slots: confirm each slot's preview scales down to keep all slots visible side-by-side.

**Edge cases:**
- Container width = 0 on initial mount: falls back to `BASE_PREVIEW_W` (160px).
- Single slot: `perSlotMaxW` = full container width minus gap, so large single masks get more space.
- Events without masks: no ResizeObserver impact; preview area is not rendered.

**Further ideas:**
- Let the user set a minimum preview size so very narrow windows still show useful previews.

**Notes:**
Fixed: `SLOT_DECO_W = 18` (padding 8×2 + border 1×2) and `LIST_GAP = 10` now correctly account for per-slot decoration and inter-slot gap in `perSlotMaxW`. Scale cap changed from 2.0 → 1.0 so masks never enlarge beyond their natural pixel size.


466 DONE  When from the detail panel - section bits clicking on "more" showing the modal of changed/targeted, etc bits, make that modal horizontally scrollable, draggable and resizable, so that users can explore the full list of changed/targeted bits without it being cut off by the screen width. Also make sure that the modal doesn't overlap with side panels when open.

**Feature description (release notes):** The "more bits" detail inspector modal is now draggable (grab the header to reposition) and resizable (drag the bottom-right corner). The table inside is horizontally scrollable so all columns are accessible even on narrow screens.

**Requirements:** `DetailInspectorOverlay` now maintains `dragPos` and `panelSize` state. The panel header has a `cursor: grab` affordance and handles `pointerdown`/`pointermove`/`pointerup` for drag. A resize handle at the bottom-right corner (CSS triangle) handles resize drag. On re-open (the `open` prop changes from false to true), position and size reset to defaults. The table uses `width: max-content; min-width: 100%` and `white-space: nowrap` so column overflow triggers horizontal scroll.

**Test instructions:**
1. Open a trace, select an event, open the detail panel, and click "more" next to the bits section.
2. Drag the modal by its header — it should reposition on the screen.
3. Drag the resize handle (bottom-right corner) — width and height should change.
4. Scroll the table horizontally — all columns should be accessible.
5. Close and re-open the modal — position and size reset to defaults.
6. Verify the modal does not overlap with the Events or Settings panels.

**Edge cases:**
- Pointer capture (`setPointerCapture`) ensures drag continues even if the pointer leaves the modal.
- If the modal is dragged beyond viewport edges, it can be scrolled back with the table's own scroll.

**Further ideas:**
- Persist the modal's last position/size between openings.
- Allow the modal to be pinned/docked to a panel edge.

**Notes:**
Fixed: removed `maxWidth: 180px; overflow: hidden; textOverflow: ellipsis` inline style from the Events `<td>` in `DetailInspectorOverlay.jsx`. The cell now grows to its natural content width; the table wrapper's `overflow: auto` + `width: max-content` triggers horizontal scroll when annotations are long. The tooltip (`title`) still shows the full text on hover.

467 DONE  When the minimap is toggled on or off, it should fade in/fade out.

**Feature description (release notes):** The minimap overlay now smoothly fades in when enabled and fades out when disabled, using a CSS `opacity` transition (300 ms ease-in-out), instead of an abrupt show/hide.

**Requirements:** The `.minimap-overlay-canvas` CSS class uses `opacity: 0` as the hidden state (replacing `display: none`) with a `transition: opacity 300ms ease-in-out`. `MinimapRenderer._hideAttachedCanvas()` sets `style.opacity = '0'`; `render()` sets `style.opacity = '1'`.

**Test instructions:**
1. Enable the minimap (Settings → Layout → Minimap). It should fade in over ~300 ms.
2. Disable the minimap. It should fade out over ~300 ms.
3. Verify the minimap does not snap or flicker during the transition.
4. Toggle rapidly — should handle gracefully (CSS transition interrupts cleanly).

**Edge cases:**
- If the canvas is not yet rendered when toggled on, opacity starts at 0 and transitions to 1 on first render call.
- Pointer events on the fading-out canvas are blocked (`pointer-events: none` on the canvas element).

**Further ideas:**
- Configurable fade duration in settings.

**Notes:**
Fixed: `useMinimapAvailability.js` now calls `r.minimapRenderer._hideAttachedCanvas()` immediately when `available = false`, so the opacity CSS transition fires right away. Previously the canvas only hid on the next `render()` call.


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


469 DONE In settings - layout: rearrange and make the buttons consistent:
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

**Feature description (release notes):** Settings → Layout tab reorganised into three clear sections. "Grid views" lists all bit-grid overlays in a consistent 3-column grid (row 1: Range/Primes/Multiples; row 2: Targeted/Already set/Newly set; row 3: Changed/Touch order/Cachelines; row 4: Animations). A new "Assistants" section groups Minimap, Balloon and Inspector together. "Labels" section is trimmed to the pure annotation toggles (Number, Bits, Bytes; then Groups, Cachelines). The old separate Heatmap button and "Cacheline hits" annotation button are merged into a single "Cachelines" 3-state button that cycles: off → cacheline numbers → heatmap. The new "Cachelines" label button in Labels (showCachelineLabels) is a placeholder for cacheline index text labels on the grid.

**Requirements:** The Layout tab settings panel shows three named sections — "Grid views", "Assistants", and "Labels" — with buttons grouped as described above. Clicking "Cachelines" in Grid views cycles through off/numbers/heatmap states. "Touch order" appears in Grid views row 3 (not in Labels). "Groups" replaces the old "Grouping" label. "Cachelines" in Labels toggles showCachelineLabels (renderer integration pending).

**Test instructions:**
1. Open Settings → Layout tab. Verify the "Grid views" section has 4 rows matching: Range/Primes/Multiples; Targeted/Already set/Newly set; Changed/Touch order/Cachelines; Animations.
2. Verify "Assistants" section shows Minimap, Balloon, Inspector.
3. Verify "Labels" section shows row 1: Number, Bits, Bytes; row 2: Groups, Cachelines.
4. Click "Cachelines" in Grid views once → should activate cacheline numbers (×N Δ3 annotations). Click again → should switch to heatmap. Click again → should turn off both.
5. Verify "Touch order" button in Grid views row 3 toggles touch-order labels as before.
6. Verify no "Heatmap" standalone button and no "Cacheline hits" button appear anywhere.

**Edge cases:**
- If heatmap was previously on, the "Cachelines" button starts in heatmap state and cycles correctly.
- If a cacheline annotation mode other than 'hits' was active (e.g. 'age'/'both'), the button still shows "CL: numbers" and a click toggles to heatmap then off; the old 'age'/'both' modes are no longer UI-accessible.
- The new showCachelineLabels toggle in Labels section does nothing visually until renderer support is added.

**Further ideas:**
- Add renderer support for cacheline index labels (CL0, CL1, …) driven by showCachelineLabels.
- Restore hit/age/both sub-modes via a context menu or secondary click on the Cachelines button.

**Notes:**
Cacheline labels are now visible on the grid (implemented in item 473).

470 DONE While changing the window size, the zoom of the main content should be adjusted so that the exact same bit of the grid stays in view. This way users won't lose their orientation while resizing the window.

**Feature description (release notes):** When the browser window is resized, the viewport anchor is captured before the layout changes and restored afterward, so the bit at the centre of the screen remains centred after the resize. In 3D-tilt modes, the anchor is calculated via the perspective projection for greater accuracy.

**Requirements:** In `refreshCanvasLayout`, when an `anchor` is passed (from the window-resize event), `r.panX` and `r.panY` are set via `canvasW/2 - anchor.contentX * zoom` (rather than relying solely on the `dCanvasW/2` delta approach). When `anchor` is null (panel toggle), the delta-fallback is used (delta is zero for panel toggles since canvas dimensions don't change on panel toggles).

**Test instructions:**
1. Open a trace and zoom into a specific bit. Note which bit is at the centre of the viewport.
2. Resize the browser window (wider or narrower) — the same bit should remain at the centre.
3. Resize while in a 3D-tilt mode — the centre bit should still be preserved.
4. Open/close the Events or Settings panel — no pan jump should occur (panel toggle delta = 0).

**Edge cases:**
- Very rapid window resize: the throttle (`requestAnimationFrame`) ensures only the first anchor is captured per frame; subsequent resize events are ignored until the frame fires.
- Canvas at minimum size: `Math.max(0.0001, zoom)` prevents division by zero.

**Further ideas:**
- Extend to also preserve the pan position during device DPI changes.

**Notes:**
Fixed: reverted the anchor-based pan restoration introduced in this item back to the always-delta approach (`r.panX += (canvasW - oldCanvasW) / 2`). The anchor approach caused extreme panY jumps when `r.canvasWidth = 0` at capture time (producing a huge `contentY` value). The delta approach is mathematically equivalent for the canvas-centre point in both 2D and 3D modes and is stable. The `captureViewportAnchor` / `anchor` parameter is kept in the API but is no longer used.


472 DONE Viewport fit is wrong in WebGL-tilt modes (1, 3, 5, 7): the grid appears "zoomed in too much" because `applyViewportFit` never reduced `effectiveH` for those modes. The tilt-correction block required a CSS `rotateX(Xdeg)` match, but WebGL-tilt modes leave the GL canvas CSS transform empty (the shader reads `camera3D.rotateX` internally). Fix: use `camera3D.rotateX` as the authoritative tilt angle (already passed by all call sites) and fall back to the CSS-regex value only when `camera3D` is not provided. The same `effectiveH` formula now fires correctly for both CSS-tilt and WebGL-tilt modes (`useViewportFit.js`). Tests: 416 pass, build clean.

471 TESTABLE In settings -> animation, independent Mask/Bits toggles for timeline animation mode.

**Feature description (release notes):** The animation mode selector in Settings → Animation now shows two independent toggle buttons — Mask and Bits — instead of three exclusive radio buttons (Mask/Bits/Both). Users can activate either or both simultaneously. When Mask is active but the current event has no mask data, the button shows "No masks in this event" as a hint. When both are active, mask stamping and bit-by-bit animation run together.

**Requirements:** `bitAnimationMode` values are `'bit'` | `'mask'` | `'both'` (replacing the old `'combined'`). The Mask button is active when `mode === 'mask' || mode === 'both'`; Bits button when `mode === 'bit' || mode === 'both'`. Clicking Mask toggles mask on/off (leaving at least `'bit'`); clicking Bits toggles bits on/off (leaving at least `'mask'`). `currentStepHasMasks` is passed from the AnimationConfigContext to show the hint. The `'combined'` string is replaced with `'both'` in `useTriggerAnimation.js` and `usePlaybackControls.js`.

**Test instructions:**
1. Open Settings → Animation. Verify there are two toggle buttons (Mask, Bits) instead of three radio buttons.
2. With only Bits active (default), click Mask → both should be active ("Mask + Bits" hint).
3. With both active, click Mask → only Bits stays active. Click Bits → only Mask stays active.
4. Try to deactivate the last active button — it should remain active (at least one must be on).
5. Load a trace event without mask data and activate Mask → the Mask button should show "No masks in this event" hint.
6. Load a trace event with mask data and activate Mask → the mask animation should play.

**Edge cases:**
- Default mode is `'bit'` (unchanged from before).
- Persisted `'combined'` values from old sessions are not stored (bitAnimationMode is not persisted across sessions), so there is no migration concern.
- When both are on and event has no masks, `hasMaskAnimation` is false, so only the bit animation plays.

**Further ideas:**
- When both are active, truly run mask and bit animations in parallel (Promise.all) for full simultaneity.
- Persist the mode choice between sessions.

**Notes:**
Fixed: changed the final `return` at the end of the mask animation block to `if (!combinedMode) return;` so 'both' mode falls through to the sequential bit animation. Bits now animate one by one with ripple/pulse effects after the mask stamps complete.


472 DONE The minimap should not be overlapped by the double timeline, docked or floating. This way users can always see the minimap and use it to navigate the timeline, even when they are analyzing the events in the double timeline.

**Feature description (release notes):** The minimap overlay now clears the height of the docked double timeline widget so it never overlaps it. The minimap's bottom boundary accounts for both the detail panel height and the docked double-timeline height.

**Requirements:** In `useMinimapDetailHeight.js`, after computing the detail panel clearance, the code also queries `.double-timeline:not(.dtl-timeline-undocked)` to measure the docked timeline's height and adds it to the total clearance. This ensures the minimap draws above both the detail panel and the docked double timeline.

**Test instructions:**
1. Enable the minimap and the double timeline (docked). Verify the minimap does not overlap the double timeline at the bottom.
2. Open the detail panel as well. Verify the minimap clears both the detail panel and the double timeline.
3. Undock the double timeline (floating). Verify the minimap now only clears the detail panel (floating timeline is excluded from clearance).
4. Toggle the double timeline off — minimap returns to only clearing the detail panel.

**Edge cases:**
- `.double-timeline:not(.dtl-timeline-undocked)` returns null when the timeline is hidden or undocked: clearance is not added.
- Detail panel collapsed: clearance is 36px (header only).

**Further ideas:**
- Also handle the case where the double timeline is floating and positioned at the bottom of the viewport.

**Notes:**
- Fixed: added a `useEffect` in `Visualizer.jsx` that watches `isTimelineUndocked`. When the dock state changes, it schedules an `rAF` that calls `updateMinimapAvailability()` and `r.renderMinimap(...)`. The effect runs post-paint (after React has committed the class change), and the `rAF` gives CSS transitions one more frame to settle before measuring the new docked height.


473 DONE Make cacheline labels visible on the grid when the "Cachelines" label toggle is on. This way users can see the cacheline index (CL0, CL1, etc.) for each cell and understand which cells belong to the same cacheline.

**Feature description (release notes):** When "Cachelines" is toggled on in Settings → Layout → Labels, a "CL0", "CL1", … index label is drawn at the left edge of the first row of each physical cacheline group in the grid. The labels are visible regardless of whether the heatmap or cacheline annotations are active.

**Requirements:** `showCachelineLabels` (boolean, default `false`) is synced from `layoutSettings` to `r.showCachelineLabels` via `useRendererLayoutSync.js`. `CachelineAnnotationsOverlay._renderCachelineIndexLabels()` draws the labels in the `labelH` row area at the left edge of the first vector in each cacheline group. The labels use a slate-600 background pill with white text. The method is called unconditionally from `render()` before the heat-badge pass, and exits early if `host.showCachelineLabels` is false or if required geometry helpers are absent. `viewPrefs.js` includes `showCachelineLabels: false` as a default.

**Test instructions:**
1. Open a trace. Go to Settings → Layout → Labels and click the "Cachelines" toggle.
2. The grid should show small "CL0", "CL1", … badges at the top-left of each cacheline group's first row.
3. Toggle it off — labels disappear immediately.
4. Scroll the grid — labels remain correctly positioned for each visible cacheline group.
5. Zoom in and out — labels scale gracefully (font size capped relative to `labelH`).
6. Verify labels appear even when heatmap and cacheline annotation badges are off.

**Edge cases:**
- When `cachelineSize` or `bitsPerCacheLine` is zero/undefined: `_renderCachelineIndexLabels` returns early without error.
- Labels are only drawn when the GL rendering context (`glCtx`) is present; the 2D canvas ctx path is prepared but only used for font measurement.
- Cachelines that start off-screen are skipped via the `startVRow`/`endVRow` culling.

**Further ideas:**
- Show the cacheline size in bytes next to the index (e.g., "CL0 (64B)").
- Colour the label pill using the heat gradient when heatmap is enabled, for visual consistency with the heat badges.

**Notes:**

474 DONE When starting and populating the events panel, apply the correct e.g. "loglevel" or "collapse level" that was set in the user preferences.

**Notes:**
Fixed: the `levelFilter` effect (mode === 'collapse') now removes all numeric top-level group IDs from the collapsed set before applying node-level collapse/expand, so all prime groups are expanded on load and only depth-tree nodes at level ≥ N are collapsed. This ensures the saved 'collapse:N' preference is immediately visible when a new trace is loaded.







## New Ideas

1 Add a top-bar "Layout scenes" control that cycles through curated bit/byte/grouping arrangements with tiny live previews and one-click apply.

2 Delightful: add a "Prime spotlight" moment when selecting an event - softly dim unrelated cells and animate a short glow path over impacted ranges for about 600 ms.

3 Delightful: add a "Guided tour" mode for first-time trace load that highlights exactly three controls (play, event list, settings) with staged callouts and dismisses permanently after completion.

4 Add a compact "Compare traces" mode that loads a second trace and highlights differences in event counts, timings, and changed-bit ranges at the selected step.

5 Add an accessibility profile switch with presets for color-blind safe palette, high-contrast labels, larger hit targets, and reduced motion.

6 Add bookmarkable "analysis snapshots" (camera + overlays + selected event + panel layout) that users can name and jump to from a dropdown.

7 Make it possible to open more than one trace at the same time, and switch between them with tabs in the top bar. This way users can compare different traces or work on multiple traces without having to close and reopen them.
8 Make it possible to create sieve logs in other docker containers with different algorithms or parameters, and load them into the visualizer for analysis. This way users can experiment with different sieve configurations and see how they affect the events and marked numbers. If possible, add a feature to the visualizer that allows users to launch new sieve containers with custom parameters directly from the interface, and automatically load the generated logs for immediate analysis.
9 WHen starting up and loading the events, in the background try mode 1-8 and find out which one has the best fps.
 