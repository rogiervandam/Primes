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

## Open

- Make visualizer items related to overlays or animations clickable shortcuts.
  Clicking a bit-state legend/color item should let the user choose that state's
  color.
- Keep reducing `Visualizer.jsx` and `SieveRenderer.js`; prefer one focused
  hook/component/helper extraction per session.
- Add more useful tools to the debug window: GL worker status, texture upload
  sizes, bit count, current render cadence, and context-loss recovery state.
- Make the debug tools window draggable or pinnable only if it starts competing
  with settings/detail/sidebar workflows.
- Polish the all-events transport in the detail panel: verify it doesn't push
  detail sections below the fold at small heights; add a visual separator from
  the step-anim sliders when both are visible simultaneously.
- Check bit-history balloon connector/clamping polish with events panel
  open/closed, settings open/closed, joined widget visible, minimap visible,
  light/dark themes, and high zoom.
- Manually tune balloon connector width/opacity if it competes with dense
  overlays, especially in light theme.
- Rewrite the logging system so that it is easier to read f. Each line has:
    - an optional text of some arbitrary amount of characters
    - optional a json string (starting with  "{ traceline: <x>" where <x> is the line number. The properties of the json object are optional, like  depth: <>, level: <>. step: <>, etc... }. \
      When parsing, try to infer the missing properties from the text. Use the text as an annotation.
- the balloon placement should be improved: (1) balloons should not overlap (2) when a bit under the all event panel, don't show the connector over the events panel (3) the connector should look better: more pointy at the bit side and much wider at the text box side (4) when i drag to the left, sometimes the connector gets "twisted"
- Make the "operation" labels in the all events panel more readable: (1) immediately give it the full size while hovering over it (the expanded text must not push away the other text, but the expanded text may float over the bitcount, timing, etc) and (2) give me an easy way to switch between this column in full width or reduced width
- when the single event widget is docker to the detail panel, don't show the %progress and gear icon on the far right, but just to the right on the timeline slider, as it looked on the single event widget.
- Make a toggle to turn automatic animation start when selecting a sigle event on or off
- In settings -> layout panel -> Autofit. when turning auto fit off, start at the count that was set by auto fit.
- Change the nearby events: (1) Don't have "current" as the name, but the the Title with the same font, style and size as on the widget itself. Keep the play button in front of it; (2) make it possible to have the nearby events instead of the title.
- when clicking in the details panel to go to the source, don't open the file/title details but just show the log, so that when i close the raw log, i don't have to close the file/title details. 


## New Ideas

- Make
  a button on the top bar to cycle through popular layout arrangements of bit, byte and grouping, with different annotations and outlines.  It should have a list too that pops out with the previews that can be cycles through

Make more backlog items, be creative!
Find two delightful improvements