# Backlog

Use this as the short product backlog. For maintenance strategy and completed
refactor history, read `docs/AI_MAINTENANCE.md`.

## Done

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
- Phase 1 of planned `Visualizer.jsx` split: created `VisualizerAlerts.jsx`
  (export progress/error banners + GL-unavailable banner) and
  `VisualizerOverlays.jsx` (minimap canvas + keyboard-shortcuts overlay),
  replacing the corresponding inline JSX and imports in `Visualizer.jsx`.
- Phase 2 of planned `Visualizer.jsx` split: created `VisualizerPanels.jsx`
  to compose `EventsPanel`, `SettingsPanel`, and `DebugToolsPanel`; moved
  four inline overlay-reset lambdas (`onRangeOverlayToggle`,
  `onRangeOverlayReset`, `onMultiplesOverlayToggle`,
  `onMultiplesOverlayReset`) into named handlers in the new component;
  introduced grouped `eventsProps` / `settingsProps` prop objects in
  `Visualizer.jsx` for a compact call site.

## Open

- When pushing the joined widget into the detail panel, also bring all-events
  controls and the all-events timeline into the detail panel.
- Make visualizer items related to overlays or animations clickable shortcuts.
  Clicking a bit-state legend/color item should let the user choose that state's
  color.
- Keep reducing `Visualizer.jsx` and `SieveRenderer.js`; prefer one focused
  hook/component/helper extraction per session. **Phase 1 and Phase 2 of the
  planned Visualizer.jsx split (section 15 of AI_MAINTENANCE.md) are now done.**
  Next: Phase 3 — create `VisualizerCanvasArea.jsx` for `CanvasStage` +
  `JoinedEventsWidget` + `stepAnimSlidersContent`.
- Add more useful tools to the debug window: GL worker status, texture upload
  sizes, bit count, current render cadence, and context-loss recovery state.
- Make the debug tools window draggable or pinnable only if it starts competing
  with settings/detail/sidebar workflows.
- The balloons and connectors must not cover or be under any panel. Don't show them in that case.
- Polish the mask animation's final stamp: shorten the final settle, reduce the
  up/down motion to a few pixels, and spend more time on the travel.
- Check bit-history balloon connector/clamping polish with events panel
  open/closed, settings open/closed, joined widget visible, minimap visible,
  light/dark themes, and high zoom.

## New Ideas

- Add a "presentation palette" preset optimized for projectors and screen
  recordings.
- Add a tiny recent-colors strip beside custom bit-state color pickers.
- Add a one-click "focus current cache line" action from cacheline badges.
- Add a compact "jump to next event changing this bit" action in bit-history
  balloons.

Make more backlog items, be creative!
Find two delightful improvements