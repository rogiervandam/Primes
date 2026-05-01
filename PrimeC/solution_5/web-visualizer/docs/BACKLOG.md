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

## Open

- Improve the bit balloons: draw a clear soft curved connector between the bit
  and the balloon, then remove stale connector or placement code.
- Polish the mask animation's final stamp: shorten the final settle, reduce the
  up/down motion to a few pixels, and spend more time on the travel.
- When pushing the joined widget into the detail panel, also bring all-events
  controls and the all-events timeline into the detail panel.
- When pushing the all event widget in the detaiil panel, also bring all-events controls and the all-events timeline into the detail panel.
- Make visualizer items related to overlays or animations clickable shortcuts.
  Clicking a bit-state legend/color item should let the user choose that state's
  color.
- Keep reducing `Visualizer.jsx` and `SieveRenderer.js`; prefer one focused
  hook/component/helper extraction per session.
- FPS should not be in the 3d plane, but in the upper right corner in a small window where we can put other debug tools as well. The top bar icon should be a toolkit icon and should toggle that window on or off (default to off).



## New Ideas

- Add a "presentation palette" preset optimized for projectors and screen
  recordings.
- Add a tiny recent-colors strip beside custom bit-state color pickers.
- Add a one-click "focus current cache line" action from cacheline badges.
- Add a compact "jump to next event changing this bit" action in bit-history
  balloons.

Make more backlog items, be creative!
Find two delightful improvements