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
- Dragging the joined widget onto the detail panel now shows all-events transport and timeline inside the detail panel body. `allEventsInDetailPanel` state is persisted. A ✕ dismiss button removes the transport from the panel. `pushJoinedWidgetToDetailPanel` in `usePanelChoreography`; `JoinedEventsWidget` has a 'detail' drop zone via elementFromPoint hit-test.
- Balloon clamping: `.joined-events-widget` added to the overlay-rect query set in `getVisibleBalloonStyles` so balloons hide when they would overlap the floating widget.
- New-style inline JSON trace format supported in the parser. Each log line can now be: `<optional text> { traceline: <n>, depth: <n>, level: <n>, step: <n>, prime: <n>, start: <n>, stop: <n>, operation: "...", ... }`. The text prefix becomes the annotation; JSON fields map directly to step properties; missing fields are inferred from the annotation text. Both quoted and unquoted JSON keys are accepted. `lineToStep` linking in the raw-log viewer handles the new format.
- Clicking "go to source" in the detail panel now opens the raw log directly without also opening the trace-info popover. Closing the raw log no longer requires a second click to close the popover. `TraceInfoPopover` is now always mounted; `visible` prop controls whether the popover chrome is shown; the raw log dialog renders independently.
- Operation labels in the events panel now hover-expand to show their full text floating over adjacent chips (bitcount, timing) without pushing them. Wrapped in `.event-op-wrap` so the flex layout space is preserved. A `→←` / `←→` toggle button next to the operation filter switches the column between compact (100 px max) and wide (full text always visible) mode; the choice is persisted to `localStorage`.
- Auto-animate on event select toggle added to Settings → Animation → "Selection behaviour". When off, clicking an event in the list navigates to it silently without starting the per-event animation replay loop. The preference is persisted via `viewPrefs` (`autoAnimateOnSelect`, default `true`).
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

4 the balloon placement should be improved: (1) balloons should not overlap (2) when a bit under the all event panel, don't show the connector over the events panel (3) the connector should look better: more pointy at the bit side and much wider at the text box side (4) when i drag to the left, sometimes the connector gets "twisted"

5 (Done) When the single event widget is docked to the detail panel, the % progress value and gear icon now appear inline just to the right of the timeline slider instead of in a separate far-right column. Two separate `StepAnimSliders` instances created in Visualizer: one with `docked=false` (floating banner/joined widget) and one with `docked=true` (detail panel).
6 (Done) Autofit column count persists when autofit is turned off: the column count starts from the last autofit value. No upper bound on manual column count (already implemented; no change needed).
7 (Done) Nearby events "current" row now shows the event title (from `banner.line1`) with the same font/weight as the widget title, preceded by a play icon. A toggle button switches between showing the title block and the nearby events list; the mode is persisted via `settings.nearbyEventsMode`.
8 (Done) Search button in the toolbar now expands inline: clicking it shows a text input in the toolbar (replacing the button), with an optional inline result count chip and a ✕ close button. No separate popover; the input is in the original button's slot.

19 (Done) The joined events widget is now clamped vertically so it never overlaps the detail panel. The widget Y drag is constrained during drag and re-clamped whenever the detail panel opens, closes, or resizes. `detailOpen` and `detailHeight` props passed from Visualizer.
24 (Done) Storage model label "Wheel 8-of-30" renamed to "Wheel" in the selector and related UI.
25 (Done) Aggregated events now display original annotation text inline in the events list next to the summary (still shown in tooltip as well).
26 (Done) Single-event widget title now includes the current prime (e.g. "Event 42 | Mark multiples | Prime 13"); prime removed from the annotation metadata line to avoid duplication.
27 (Done) Opening raw log from the detail-panel source link now scrolls to the selected event line and highlights that current source line in the raw log viewer.
28 The parser should make a distinction between Number ranges and Bit ranges. 
29 The top of the events panel should not animate as a saparate unit


## New Ideas

- Make
  a button on the top bar to cycle through popular layout arrangements of bit, byte and grouping, with different annotations and outlines.  It should have a list too that pops out with the previews that can be cycles through

Make more backlog items, be creative!
Find two delightful improvements