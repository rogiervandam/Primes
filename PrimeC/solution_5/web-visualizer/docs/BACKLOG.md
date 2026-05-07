# Backlog

Use this as the short product backlog. For maintenance strategy and completed
refactor history, read `docs/AI_MAINTENANCE.md`.

## Done

- Retuned GL auto Y-offset for 2608x1175 with stronger X-biased lift and stronger Y/high-balanced damping; added edge calibration probes (`28/4` and `4/28`).
- Retuned GL auto Y-offset again from the 2579x1175 @100% report with stronger near-limit lift and expanded calibration cases (`24/0`, `0/24`, `16/8`, `8/16`) to better isolate axis and mixed-tilt error.
- Updated GL auto Y formula again from the latest 2579x1175 report to recover broad under-correction: stronger X/Y-dominant lift plus a low-tilt balanced boost that fades before high balanced tilt.
- Added `-1`/`+1` nudge buttons to both GL X and GL Y manual calibration controls for fine-grained alignment commits.
- Retuned GL auto Y-offset again for the 10k-12k near-limit band: increased X-dominant compensation while damping high Y-dominant and balanced high-tilt cases that were over-correcting.
- Fixed calibration-mode GL X offset controls so slider/button changes refresh immediately, and added browser zoom telemetry (devicePixelRatio + visualViewport.scale) to debug/calibration reports.
- Retuned automatic GL Y compensation again for mid-width near-limit scenes by distinguishing X-dominant and Y-dominant tilt, reducing under-correction from the 2707x1307 calibration sweep.
- Made the debug tools panel scrollable and split the longest areas into collapsible sections so calibration controls remain reachable on smaller viewports.
- Added a debug-panel calibration mode with a 10-case rotation sweep, viewport target help, manual GL X/Y alignment controls, all-cell overlay outlines, viewpoint recording, and clipboard calibration reports.
- Validated GL auto-offset convergence on the 3127x1197 four-scene sweep; manual residual trims now stayed near zero (+14/-4/+7/-17).
- Added a separate mid-width GL auto-offset correction lane (about 9.6k-12.1k CSS width) to handle under-correction without disturbing ultra-wide tuning.
- Added width-aware GL auto-offset residual correction for ultra-wide direct-mode scenes, with high-tilt suppression to preserve earlier calibrated cases.
- Added a small deficit-scaled residual trim to GL auto-offset so high-deficit flat and tilted cases converge closer without destabilizing near-1 DPR behavior.
- Retuned GL auto-offset again for wide tilted direct-mode breakpoints by damping tilt response as DPR deficit grows, reducing large overshoot cases.
- Retuned direct-mode automatic GL Y compensation for small DPR deficits (`~0.95-0.99`) under tilt, while keeping true DPR=1 cases at zero auto offset.
- Fixed a Visualizer startup crash caused by referencing `getMinimapDetailH` before initialization; the minimap helper is now declared before snapshot callbacks that depend on it.
- Reduced startup console noise from optional benchmark companion files by checking `/api/logs` before requesting `*_sievebenchmark.json`, avoiding repeated 404 fetches when no benchmark file exists.
- Added an explicit favicon asset/link (`public/favicon.svg` + `index.html` head link) so dev sessions no longer request a missing `/favicon.ico` by default.
- Added a Grid view "Balloon" mode control in Layout settings with three options: `Off`, `On bit clock` (click-only), and `Click + hover`. Balloon hover/click behavior now follows this setting and persists via view preferences.
- Details panel mask metadata now sits to the right of the mask preview inside
  "Mask pattern & preview".
- Added more engaging color schemes.
- Split more `Visualizer.jsx` behavior: panel and joined-widget transition
  callbacks now live in `src/hooks/usePanelChoreography.js`.
- Joined widget left/events-panel push is wired: dragging it into the left edge
  band, or using its expand button, opens the events panel and detail panel,
  hides the floating single-event banner, and leaves the all-events timeline in
  the events panel while the single-event timeline appears in detail.
- The detail-panel timeline's percent value and gear icon stay right-aligned.
- FPS/render timing moved out of the tilted 3D canvas plane into a small
  toolbar-toggled debug tools window. The toolkit button defaults off, and the
  renderer now exposes samples instead of drawing the chart itself.
- Bit-history balloons now draw a soft curved connector between the visible bit
  edge and the nearest measured balloon edge. The obsolete hover mouse-position
  state was removed because balloons are anchored from renderer bit geometry.
- Log level filter options renamed to "level N (LN)" format for clarity (e.g. "Up to level 5 (L5)").
- Events panel indentation whitespace reduced: base padding decreased from 8px to 6px, per-level step from 14px to 10px; `.event-child` extra padding removed (was 24px).
- Timeline slider row `min-height` set to 28px and wrapper height increased to 28px to better match topbar btn-icon row height.
- "View raw log" button added to the trace info popover (click the trace title). Opens a draggable, resizable dialog with line-numbered monospace view of the original file. Linked line numbers (matching events in the trace) are highlighted in accent color; clicking one closes the viewer, navigates to that step, and opens the events panel. A "Copy all" button copies the raw source to clipboard.
- Raw log dialog now opens near the top of the window (y=60px below the toolbar) instead of centered, so it doesn't obscure the canvas.
- Detail panel labels and trace meta chips expand fully on hover instead of being truncated: `.detail-panel-title-main` wraps, `.trace-meta-chip` expands, `.detail-row-label` allows wrapping on hover.
- Grid opacity slider in Colors tab now responds immediately during animation (`startTransition` wrapper removed so the update is synchronous).
- Collapse level behavior fixed: switching to a higher collapse level (e.g. "collapse at L9" after "collapse at L5") now expands nodes at levels below the new threshold, so levels L5–L8 become visible as expected.
- Event annotations are now shown inline in the events panel list (italicized, after the range summary) so they are readable without hovering for the tooltip. Applies to all events that carry an annotation, including aggregate/collapsed ones.
- Storage model auto-detected from the trace log on every new trace load; the `storageModel` state resets to `header.storageModel` when the trace changes, so the user no longer needs to set it manually after loading a trace.
- "View raw log" button moved to the first item in the trace-info popover (above Storage model), so it is always immediately visible without scrolling.
- Event panel < and > level buttons now cycle within the active dropdown group: clicking < or > while "Up to" is selected steps through all "Up to" levels (ending at "All" when increasing past the max); while "Collapse at" or "Only level" is selected the buttons cycle only within that group. The > button is correctly disabled at the upper bound of collapse/exact groups.
- When changing animation type (style or mode) mid-animation, the new animation starts from the same progress position instead of restarting from 0. Works for both in-flight direct animations and the single-event / selected-steps replay loops.
- Removed unimported historical file `src/settings/TitleTab.jsx`.
- Mask-stamp animation polished: travel phase now takes 58% of each stamp slot (was 45%), settle shortened to 15% (was 30%), final vertical lift capped at 4 px (was up to 18 px). Both orderedEntries and legacy-groups paths in `SieveRenderer.renderMaskStamp()` updated.
- Dragging the joined widget onto the detail panel now shows all-events transport and timeline inside the detail panel body. `isAllEventsInDetailPanel` state is persisted. A ✕ dismiss button removes the transport from the panel. `pushJoinedWidgetToDetailPanel` in `usePanelChoreography`; `JoinedEventsWidget` has a 'detail' drop zone via elementFromPoint hit-test.
- Balloon clamping: `.joined-events-widget` added to the overlay-rect query set in `getVisibleBalloonStyles` so balloons hide when they would overlap the floating widget.
- New-style inline JSON trace format supported in the parser. Each log line can now be: `<optional text> { traceline: <n>, depth: <n>, level: <n>, step: <n>, prime: <n>, start: <n>, stop: <n>, operation: "...", ... }`. The text prefix becomes the annotation; JSON fields map directly to step properties; missing fields are inferred from the annotation text. Both quoted and unquoted JSON keys are accepted. `lineToStep` linking in the raw-log viewer handles the new format.
- Clicking "go to source" in the detail panel now opens the raw log directly without also opening the trace-info popover. Closing the raw log no longer requires a second click to close the popover. `TraceInfoPopover` is now always mounted; `visible` prop controls whether the popover chrome is shown; the raw log dialog renders independently.
- Operation labels in the events panel now hover-expand to show their full text floating over adjacent chips (bitcount, timing) without pushing them. Wrapped in `.event-op-wrap` so the flex layout space is preserved. A `→←` / `←→` toggle button next to the operation filter switches the column between compact (100 px max) and wide (full text always visible) mode; the choice is persisted to `localStorage`.
- Auto-animate on event select toggle added to Settings → Animation → "Selection behaviour". When off, clicking an event in the list navigates to it silently without starting the per-event animation replay loop. The preference is persisted via `viewPrefs` (`isAutoAnimateOnSelect`, default `true`).
- Close button on the trace title restores to the file picker and resets streaming parser state (header + steps cleared). Items 10.
- "View raw log" button in the trace info popover fixed (prop wiring was broken; button was invisible). Item 11.
- All-events floater can be dropped onto the detail panel to dock, and dragged back out or dismissed via ✕ button. Items 12. Loading overlay bar styled to match the timeline scrubber (solid accent fill, 9px rounded rail). Minimum overlay display time reduced to 2 seconds. Items 18.
- Canvas intro zoom 2.8s → 3.8s; 2D→3D tilt 0.4s → 0.9s (intro + toggle). Items 13, 14.
- Events panel, settings sidebar, detail panel body all animate in/out with slide + fade transitions (~500ms ease-out). Item 15.
- Detail panel and single-event widget hidden until first play or event selection. Item 16.
- "Timeline" label in single-event widget renamed to "Animation". Item 17.
- All panels, floating widgets and the all-events floater are hidden (opacity 0, pointer-events none) while the loading overlay is active, then fade in together once the overlay exits. Eliminates flash of panels on startup.
- after opening a log, don't show (or hide) the panels
-  start a async streaming load of the log, defer it to the background. When the sieve size is establised (usually in the first few log lines), then broadcast that event. You can forget about the logline after it has been processed. If the users want to view the raw log, just reload it from the start, or if clicked on a source line from the detail panel, load the log and scroll to that line: the log should be lazy loading as well.
- upon getting the event, start a async render of the canvas. Animate it from infinitely small to the full size (streight, 2d) and then do the transform from 2d to 3d tilted. This way the user can see something is happening immediately, and the animation will be delightful.
- regularly broadcast the amount of log files streamed. When the first 100 lines are loaded, start an async populating the DOM in the events panel. When it is filled to the window height, If the user had the event panel and/or settings opened in the last session, wait for the animation to finish and then open these panels (these should always open with a animation).
- do a lazy loading of the events panel: only populate the dom for the first 100 and then visible events, and then populate more as the user scrolls. This way we can handle very large logs without freezing the browser. Consider lazy loading the hierarchy of events too.
- The opening animation should be slower, around 3 seconds before full in view. Also focus on the top of the grid and have the first line at the center of the display.
- Don't auto play and activate the play button 2 seconds afther the 2d/3d transform.
- I see dark mode and then ligt mode - probably because the settings are applied. Have some delay before the first display update to let most things load
- Delay the showing of the single event widget until the user hits play for the first time or selects an event in the all events panel.
- never deactivate the single event timeline and play/pause button: the user must be able to hit pause there at any time to stop the animation, and hit play to start it again. If the event has no duration, just take the delay between events or repeats and progress% that.
- don't start playing automatically anymore
- the grid if centered in the center at startup. But if it doesn't fit on screen, instead focus on the top and have the first line at 1/3 of the display height. 
- In settings -> layout panel -> Autofit. When turning auto fit off, start at the count that was set by auto fit. And allow for more than 64 columns. 

## Open

1 Make visualizer items related to overlays or animations clickable shortcuts. Clicking a bit-state legend/color item should let the user choose that state's color.

2 Polish the all-events transport in the detail panel: verify it doesn't push  detail sections below the fold at small heights; add a visual separator from  the step-anim sliders when both are visible simultaneously.

3 Check bit-history balloon connector/clamping polish with events panel  open/closed, settings open/closed, joined widget visible, minimap visible,  light/dark themes, and high zoom.

4 (Done) Balloon placement improved: (1) overlap-checking now uses clamped positions so two balloons never land on top of each other; (2) balloon+connector hidden when the anchor bit is behind the events panel; (3) connector is now very pointy at the bit tip and much wider at the balloon face, with smooth blended control points; (4) connector no longer twists when dragging left — symmetric control points with interpolated perpendicular direction prevent self-intersection.

6 (Done) Autofit column count persists when autofit is turned off: the column count starts from the last autofit value. No upper bound on manual column count (already implemented; no change needed).
7 (Done) Nearby events "current" row now shows the event title (from `banner.line1`) with the same font/weight as the widget title, preceded by a play icon. A toggle button switches between showing the title block and the nearby events list; the mode is persisted via `settings.nearbyEventsMode`.
8 (Done) Search button in the toolbar now expands inline: clicking it shows a text input in the toolbar (replacing the button), with an optional inline result count chip and a ✕ close button. No separate popover; the input is in the original button's slot.

19 (Done) The joined events widget is now clamped vertically so it never overlaps the detail panel. The widget Y drag is constrained during drag and re-clamped whenever the detail panel opens, closes, or resizes. `isDetailOpen` and `detailHeight` props passed from Visualizer.
24 (Done) Storage model label "Wheel 8-of-30" renamed to "Wheel" in the selector and related UI.
25 (Done) Aggregated events now display original annotation text inline in the events list next to the summary (still shown in tooltip as well).
26 (Done) Single-event widget title now includes the current prime (e.g. "Event 42 | Mark multiples | Prime 13"); prime removed from the annotation metadata line to avoid duplication.
27 (Done) Opening raw log from the detail-panel source link now scrolls to the selected event line and highlights that current source line in the raw log viewer.
28 (Done) When the raw log is not yet loaded, the detail panel shows a "view source" link for any event that has an annotation. Clicking it fetches the raw source, scans for the matching line, then opens the raw log viewer scrolled to that line.
29 (Done) Events panel header and step-list now animate together as one unit on expand (both use the same 500ms timing, no stagger delay).
30 (Done) The "ANIMATION" label in the joined widget now acts as a drag handle — mousedown on it propagates to the widget's drag handler instead of being blocked by the event-area stopPropagation. A grab cursor is shown.
31 The parser and internals should make a distinction between Number ranges and Bit ranges: assume ranges mention bit indices. When byte is mentioned, it should be treated as a range of 8 bits starting at the byte index * 8. When word or vector is mentioned, search for mentions of uint16/32/64 and treat those as ranges of 16/32/64 bits starting at the index * (bits per unit). Or when mention of uint16v2/4/8 or uint32v2/4/8 or uint64v2/4/8, treat those as ranges of 16*2/4/8 or 32*2/4/8 or 64*2/4/8 bits starting at the index * (bits per unit * vector length). This way we can support more complex annotations and have a more consistent interpretation of ranges. When the spec mentions "numbers" or "factors" and the log annotation doesn't specify bits or bytes, we can take the mentioned range as a number range and try to infer the bit range from the context (e.g. if the event is "read 4 numbers" and the annotation says "offset 16, length 4", we can infer that it's probably 4 bytes starting at bit 128, so bits 128-159). This will require some changes to the parser and how it represents events and annotations internally, but it will make the system more flexible and powerful in handling different types of logs and annotations.
32 (Done) Zoom transitions are now animated (~300ms) for toolbar zoom-in/zoom-out/reset and mouse-wheel zoom, instead of jumping instantly.
33 (Done) When leaving auto-fit mode for the first time (including +/- from auto mode), manual column count starts from the current auto-fit value.
34 (Done) Overall playback speed ceiling increased to 1600% (converters, clamps, controls, persistence, and tests updated).
35 (Done) Single-event widget drag can now start from anywhere on the widget body except timeline controls (play button, timeline slider area, gear, and other buttons/inputs).
36 (Done) When all-events transport is docked into the detail panel, it is rendered to the left of the event title/annotation in the detail header row.
37 (Done) In the detail panel, the event timeline is shown in only one place at a time; the single-event timeline dock row is hidden when all-events transport is present.
38 (Done) Joined-widget intro motion is suppressed for anchored joins so it no longer appears to animate in from elsewhere during merge.
39 (Done) Added a repeat toggle button (with repeat icon) to the single-event widget timeline controls. Repeat-on loops until disabled; repeat-off plays once. The toggle is disabled/ignored during all-events playback.
40 (Done) Debug tools window is now draggable, defaults to the bottom-right corner, and clamps away from the settings panel when it is open.
42 (Done) Dragging the single-event widget feels heavy, like there is a delay between the mouse movement and the widget movement. It should feel more responsive and fluid.

Make the minimap canvas just the size shown on screen, and have it be a floating DOM element on the very top. 

43 (Done)
I want to be able to try different setups for the rendering and the animation, and be able to switch between them easily, because i experience bugs (probably in the browser) on different devices and screen sizes. 
In the debug window, want to have controls for:
- settting the DPR value manually, to test the behavior under different zoom levels and screen densities
- setting the canvas size of the webgl layer
- setting the canvas size of the css/svg layer
- setting the canvas size of the glyph-rendering layer (if we go with the 2d glyph rendering approach)
When i change these values, the visualizer should re-render with the new settings immediately, so i can see how it affects the rendering and the animation. Make sure the center of all the layers keeps being line up when i change these settings, so i can isolate the effects of each setting on the rendering and the animation.

I want to be able to try different setups for the rendering and the animation, and be able to switch between them easily, because i experience bugs (probably in the browser) on different devices and screen sizes. In the debug windows, i want to select one of the following rendering modes: 
1. all text are rendered 2d in a canvas using the layout arrangement, annotations, etc. Then the whole canvas is compressed with resolution buckets and send to the webgl layer as a texture, and the webgl layer does the merge with the 3d grid and the tilt. Webgl is on a flat 2d canvas, not a tilted canvas. 
2. Option 1, but webgl does just layer composition. Tilt is done with css 3d transforms on the canvas element, so the webgl layer is always rendered as a flat 2d canvas and the tilt is purely a visual effect applied to the whole canvas. 
3. the grid and the text are rendered together in the webgl layer as textured quads, with the text rendered in an offscreen 2d canvas and sent as a texture to webgl. The webgl layer does the layout arrangement, annotations, etc, and merges them with the 3d grid and the tilt.
4. 2 parallel canvases (one for text, one for grid) which are tilted with css
5-8: mode 1-4 but not using direct mode, but workers
For each mode, all animations should work, dragging, zooming and tilting should work and changing the arrangements and colors also. Allow me to override the DPR, canvas sizes, and other relevant settings for each mode in the debug tools, and see the effects immediately. Make sure the center of all the layers keeps being line up when i change these settings, so i can isolate the effects of each setting on the rendering and the animation.


44 (Done)  The text on the bits with webgl rendering is not really centered on the bits, it is a bit off. It should be perfectly centered on the bits, so it looks better and more polished.
45 (Done)When zooming in or out, the zoom is not focused on the mouse position, It should be focused on the mouse position, so i can zoom in and out on specific areas of the grid more easily and intuitively. What is under the mouse position should stay under the mouse position when zooming in and out, so i can control the zoom more precisely and easily.

46 (Done) When dragging the grid during mask animation, the masks are not dragging with the grid, which results in weird placement.
47 (Done) The path/trail for the mask animation must be much clearer.
48 When handling large grids (100k+ bits), not everytthing is rendered anymore. In case of large grids, at a certain zoom level start making little quads per group instead of per bit for performance.
49 (Done) Make the touch order and cachline hits annotations a bit wider, so all the text fits in there and is no cut off
50 (Done) In the events panel, when a search text is entered, show a clear button to clear the search text and results, so i can easily go back to the full events list without having to delete the text manually.
51 (Done) WHen the events panel is open, the fps on the canvas drops significantly, probably because of the increased DOM elements and the event listeners. Optimize the performance of the events panel when it is open, so i can use it without affecting the performance of the canvas too much. Consider using virtualization or windowing techniques to only render the visible events in the panel, and debounce or throttle the event listeners to reduce the frequency of updates.
52 (Done) Upon hiding the settings panel, it should not disapper, reappear and then fade out. Instead, it should just slide to the right side.
53 (Done) When the events panel is open, have fout arrow buttons at the top right: to the left, down or up or right. When pressing down, slide the events down and dock the all events floater in the detail panel. When pressing right, slide the events up and animate it going in the all events floater. When pressing left, slide the events panel to the left and hide it, and undock the all events floater if it was docked. This way i can easily switch between having the events in the panel or in the detail panel, or hiding them completely. When pressing up, slide the events up and dock the the timeline in the top bar.
54 (Done) Change the placement and appearnace of the top bar button to pop out the timeline into a floating widget. Make it a downward arrow on the right side of the event/events count.
55 (Done) In the events panel, don't show the number of events in the header. Instead, show the number of selected items next to the "hide no-ops" on the right.
56 (Done) In the debug window, keep FPS, GL mode and other green text with At Risk, rendering mode and the panel with full debug report and the controle to choose AA oversample and the apply button. Remove "Force mode", "Show GL/glpyh bounds", "Restart Renderen", Force GL redraw, etc.
57 (Done) Solve the problem where there is a message about offscreencanvas which is not supported in the current browser when in dev mode it is called twice in a row. 






## New Ideas

1 Add a top-bar "Layout scenes" control that cycles through curated bit/byte/grouping arrangements with tiny live previews and one-click apply.

2 Delightful: add a "Prime spotlight" moment when selecting an event - softly dim unrelated cells and animate a short glow path over impacted ranges for about 600 ms.

3 Delightful: add a "Guided tour" mode for first-time trace load that highlights exactly three controls (play, event list, settings) with staged callouts and dismisses permanently after completion.

4 Add a compact "Compare traces" mode that loads a second trace and highlights differences in event counts, timings, and changed-bit ranges at the selected step.

5 Add an accessibility profile switch with presets for color-blind safe palette, high-contrast labels, larger hit targets, and reduced motion.

6 Add bookmarkable "analysis snapshots" (camera + overlays + selected event + panel layout) that users can name and jump to from a dropdown.

