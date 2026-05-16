# Backlog

Use this as the short product backlog. For maintenance strategy and completed
refactor history, read `docs/AI_MAINTENANCE.md`.

475 DONE: The zone-opacity setting should only influence the background of the double timeline widget

**Feature:** The `zoneOpacity` setting (Controls tab) now exclusively controls the opacity of the zone background bands in the DoubleTimeline widget. Previously it also faded the entire timeline container, which dimmed the text, axis labels, and controls at the same time. This change keeps those elements at full opacity while still letting the user adjust how prominent the colour zones are.

**Edge cases:**
- Setting zone-opacity to 0 should make zone bands invisible but leave all other timeline content unaffected.
- Other opacity-controlled elements (e.g. grid lines, canvas overlays) are independent and must not regress.
- Any future DoubleTimeline refactor must continue to apply `zoneOpacity` only to the zone band layer, not to the container.

**Notes:**
<!-- maintainer notes after testing -->

---

476 DONE: On the animation settings page, add a "Skip events with no changes" toggle button. When this is on and we are playing events, when going to the next event, we should go to the next event that has at least one change in the bits, instead of going to the next event regardless of changes. This will allow users to quickly skip through events that don't have any impact on the state and focus on the ones that do. This should make it more interesting to watch the animation and understand how the bits are changing over time. This feature should be implemented in a way that it can be easily toggled on and off, so users can choose whether they want to see all events or only the ones with changes.

**Feature:** A "Skip no-change events" toggle button has been added to the Selection behaviour section of the Animation settings tab. When active, the playback loop automatically advances past steps that have no changed bits (empty `changedBits` set), advancing immediately rather than waiting the normal inter-step delay. The setting is persisted to localStorage.

**Edge cases:**
- If ALL remaining events have no changes, the player should still eventually reach the end without an infinite loop (handled by always advancing to `next`).
- The toggle must not affect the seek/scrub behaviour, only auto-playback.
- Steps with a non-empty `changedBits` set but all bits equal to their previous value are still counted as "no change" because the set is empty in that case.
- Toggling during active playback takes effect on the very next step due to the ref-based implementation.

**Notes:**
<!-- maintainer notes after testing -->

---

477 DONE: The startup procedure is the entire time from loading the trace, zooming in and doing the 2d-3d transform. During this startup procedure, don't show the minimap, balloons, inspector, etc.

**Feature:** While the intro animation is running (class `ui-chrome-hidden` on the root container), several UI overlays that would distract from the cinematic intro are hidden via CSS: the minimap, floating balloons and their SVG connector lines, the detail inspector overlay, and the `gi-backdrop`. They reappear automatically when the intro finishes and the class is removed.

**Edge cases:**
- The hide rules use `opacity: 0` with a `transition` so elements fade in smoothly when the intro ends.
- Both `.bit-history-panel` (balloon cards) and `.bit-history-connectors` (the SVG lines between them) are hidden together so the connectors are never visible without their cards.
- If the intro is skipped (class never added, or removed before any frame renders), the elements remain visible at all times.
- Any new overlay element added in future should be evaluated for whether it should also be hidden during startup.

**Notes:**
<!-- maintainer notes after testing -->
---

478 DONE: At colors - theme, add a "Use system theme" toggle that, when enabled, automatically detects the user's OS-level light/dark mode preference and applies the corresponding visualizer theme. This way users can have a consistent experience across their applications without having to manually switch themes in the visualizer. The visualizer should listen for changes in the system theme and update accordingly in real-time, so if the user changes their OS theme while the visualizer is open, it will automatically adjust its appearance to match.

**Feature:** The Colors settings tab now shows three theme buttons: Light, Dark, and Auto. Selecting Auto enables system-theme following: the visualizer reads `prefers-color-scheme` on load and subscribes to real-time changes via `matchMedia`. If the user changes their OS theme while the visualizer is open the visualizer theme updates immediately. The Auto preference is persisted to localStorage as `isUseSystemTheme`.

**Edge cases:**
- While Auto is active, the Light/Dark buttons should appear inactive even if the resolved theme matches one of them.
- Clicking Light or Dark while Auto is active disables Auto and applies the chosen theme directly.
- If the browser does not support `matchMedia` (very old environments), Auto silently falls back to the last manually chosen theme.
- The system-theme listener is cleaned up when Auto is turned off to avoid memory leaks.

**Notes:**
<!-- maintainer notes after testing -->

---

479 TESTABLE: In events panel, let me drag the annotations left/right to adjust their margin, so I can drag them to the left to see more of the annotation text, even letting them overlap the counts/timings columns.

**Feature:** Dragging any annotation text in the Events panel left or right adjusts the global annotation left-margin (`--ep-annot-margin`). A horizontal drag of more than 3 px updates the margin in real time via `setAnnotationMarginLeft`. The range is −60 px to +60 px, allowing annotations to fully overlap the counts and timings columns on the left. A `col-resize` cursor hints at the gesture. After a drag, the next click on the annotation is suppressed so the detail inspector does not open accidentally. The setting is persisted to localStorage as `annotationMarginLeft`.

**Edge cases:**
- At very negative values the annotation text will visually overlap other columns; this is intentional and the user's responsibility.
- The drag handler uses `document`-level `pointermove`/`pointerup` listeners so dragging outside the panel element works smoothly.
- The `annotationMarginLeft` ref prevents stale-closure issues when dragging quickly.
- The drag handler is only installed when `setAnnotationMarginLeft` is provided, keeping the Events panel self-contained.
- If the pref is missing from localStorage the default of 5 px is applied so existing traces look unchanged.

**Notes:**
<!-- maintainer notes after testing --> 
event-text overflow should not be hidden, but visible. It should be possible to drag it further to the left.

---

480 DONE: In settings - animation - Selection behaviour: add a "Repeat animation on select" toggle button that, when enabled, automatically sets repeat mode on whenever a new event is selected.

**Feature:** A "Repeat on select" toggle button has been added to the Selection behaviour section. All three Selection behaviour toggles — Auto-animate, Repeat on select, and Skip no-change — now appear on a single row in a three-column grid. When Repeat on select is active, clicking an event in the events list immediately turns on repeat mode for that event. When repeat mode is on, the play button shows a visible ring/glow indicator (`.dtl-repeat-on`) and the repeat handle on the animation timeline pulses red (`.dtl-repeat-handle--active`). The setting is persisted to localStorage as `isRepeatOnSelect`.

**Edge cases:**
- If repeat mode is already on, selecting a new event with Repeat-on-select active keeps it on (it is only ever set to `true`, never cleared by selection).
- Disabling Repeat-on-select mid-playback does not cancel the current repeat; it only prevents the next selection from activating it.
- Repeat-on-select and Auto-animate are independent toggles; either or both can be active.
- The three-column grid uses `<span />` placeholders for optional callbacks so the grid always has exactly three cells.

**Notes:**
<!-- maintainer notes after testing -->

---

481 DONE: In settings - animation: make the "Auto-animate on event select" a toggle button.

**Feature:** The "Auto-animate on event select" setting in the Selection behaviour section of Animation settings has been converted from a plain checkbox to a `PreviewOptionButton` styled toggle, matching the visual language of other controls in that tab.

**Edge cases:**
- The button active state must accurately reflect the current `isAutoAnimateOnSelect` value.
- The click handler must continue to toggle the value (not set it to a fixed value).
- Accessibility: keyboard and screen-reader activation must still work through the existing `PreviewOptionButton` component.

**Notes:**
<!-- maintainer notes after testing -->

---

482 DONE: In settings - animation: move the "Animate bits" section above the "Animate timings" section, and left align the buttons.

**Feature:** In the Animation settings tab the "Animate bits" toggle buttons section (controlling which individual bit-state operations trigger an animation) now appears immediately below the Animation style section, before the "Animation timing" (interval/speed) controls. The buttons in the Animate bits grid are left-aligned via `justifyContent: 'flex-start'` so they do not stretch to fill an odd-sized grid.

**Edge cases:**
- Reordering the sections must not change the data-flow; state and callbacks are still wired through the same props.
- Left-aligning should not clip or overlap any button when the sidebar is at minimum width.

**Notes:**
<!-- maintainer notes after testing -->

---

483 DONE: Create three fun new animation styles for bits and put them in the "Animation style" section next to the current ones.

**Feature:** Three new bit animation styles have been added alongside the existing Ripple, Fade, and Pulse options:

- **Spark** — Each changed bit fires 8 particle sparks outward along evenly distributed directions. The spread distance, size, and opacity are all driven by `progress` for a satisfying burst effect. The per-bit angle offset is derived deterministically from the bit index so the pattern is stable across frames.
- **Sweep** — A vertical scan line moves left-to-right across the canvas. Changed bits flash as the sweep line passes over them and then fade behind it, creating a "paint reveal" effect.
- **Glow** — Five concentric transparent circles of decreasing opacity are drawn around each changed bit, approximating a gaussian soft glow. The overall intensity rises quickly to a peak then fades slowly.

All three styles are available in both the seek/scrub timeline and the trigger (playback) animation hooks. Changing animation style, animation mode, or timeline animation mode immediately re-renders the current frame using the new style, continuing from the current scrub progress.

**Edge cases:**
- Spark: angle offsets are seeded per-bit to avoid all bits firing in the same direction at once; seeding must remain stable across renders.
- Sweep: canvas width is read from `r.canvas.width` with a safe fallback of 800; if the canvas is resized mid-animation the sweep X calculation adapts automatically since it runs every frame.
- Glow: the peak/fade envelope ensures the glow does not persist beyond `progress = 1`; the innermost layer uses an opaque fill to keep the bit itself clearly visible at peak.
- All three respect the existing `r.changedBits` guard and return early if the set is empty or progress is out of range.
- Style/mode changes during active playback do not re-seek (only scrub/paused state triggers the re-render).

**Notes:**
<!-- maintainer notes after testing -->

484 TESTABLE: Sometimes when play is active, the playhead is at 100%, but there is no fade-out and a delay of 1-2 seconds, while the event and animation delay are half a second.

**Feature:** The playback scheduler now advances to the next event promptly after the configured inter-event delay expires. Two sources of extra delay were eliminated: (1) `estimateAnimDuration` was including `plan.totalDuration` in its return value even for `animStyle = 'none'`, inflating `animBusyUntilRef` by up to ~500 ms; (2) a `fadeOutBudget` (up to 420 ms) was added to `animBusyUntilRef` even though the fade-out of the current step's highlights is already covered by the next event's own `animBusyUntilRef` budget. Together these caused 0.5–1 s of extra dead time after the animation ended. The scheduler now uses `est + delayMs` only.

**Edge cases:**
- For `animStyle = 'none'`, `estimateAnimDuration` now returns only `fadeOutMs` (the pre-animation fade of the previous step's highlights), since no bit animation runs.
- The `getFadeOutDurationPure` import in `useTriggerAnimation` is retained for the early-fade-out path inside the repeat-end-handle case (lines ~384 and ~422).
- Removing `fadeOutBudget` from `totalCycleDuration` is safe because N+1's `triggerAnimation` sets its own `animBusyUntilRef = est_N+1 + delayMs + …` which includes the fade-out of N's highlights inside `est_N+1`'s `fadeOutMs` term.
- Playback with `isStepAnimRunning` still acts as a secondary guard: if the actual animation takes longer than `est`, the scheduler waits for `isStepAnimRunning = false` before advancing.

**Notes:**
<!-- maintainer notes after testing -->
Sometimes there is a delay before the fade-out starts. Sometimes there is no fade-out at all. 




## New Ideas

1 Add a top-bar "Layout scenes" control that cycles through curated bit/byte/grouping arrangements with tiny live previews and one-click apply.

2 Delightful: add a "Prime spotlight" moment when selecting an event - softly dim unrelated cells and animate a short glow path over impacted ranges for about 600 ms.

3 Delightful: add a "Guided tour" mode for first-time trace load that highlights exactly three controls (play, event list, settings) with staged callouts and dismisses permanently after completion.

4 Add a compact "Compare traces" mode that loads a second trace and highlights differences in event counts, timings, and changed-bit ranges at the selected step.

5 Add bookmarkable "analysis snapshots" (camera + overlays + selected event + panel layout) that users can name and jump to from a dropdown.

6 Make it possible to open more than one trace at the same time, and switch between them with tabs in the top bar. This way users can compare different traces or work on multiple traces without having to close and reopen them.

7 TESTABLE: Make it possible to create sieve logs in other docker containers with different algorithms or parameters, and load them into the visualizer for analysis. This way users can experiment with different sieve configurations and see how they affect the events and marked numbers. If possible, add a feature to the visualizer that allows users to launch new sieve containers with custom parameters directly from the interface, and automatically load the generated logs for immediate analysis. This should be a feature toggled separate screen, that can be accessed through the screen where you can select or upload logs. Start with enabling PrimeC/solution_5 be started with different command lines. As much logic as possible must be on the visualizer side. Keep the code for this feature in separate files and modules, so it does not interfere with the main visualizer codebase.

**Feature:** A "Run Sieve in Docker" toggle button has been added to the welcome / log-picker screen. Clicking it shows a self-contained `SieveRunnerScreen` panel (lazy-loaded from `src/sieve-runner/`). The panel:
- Checks Docker availability and whether the `sieve_default` image is built (`GET /api/sieve/status`).
- Lets the user pick a sieve variant (from the same list as the `SIEVEVARIANTS` shell variable), enter a sieve size (10–10,000,000), and select a trace level (5–9; default 9).
- Clicking **Run** calls `POST /api/sieve/run`, which spawns `docker run --rm -v <logDir>:/home/sieve/log sieve_default trace <level> <variant> <size> trace-filename <output>`. The output `.sievetrace` file is written directly to the shared log directory.
- A jobs list polls `GET /api/sieve/jobs` every 1.5 s while any job is running. Completed jobs show a **Load trace** button that dismisses the runner screen and loads the trace through the existing `loadFromApi` path.
- Running jobs show a **Cancel** button; the server kills the named container and marks the job cancelled.

All code is isolated in `server/sieve-docker-api.mjs` and `src/sieve-runner/`. No existing log-API code or main visualizer components were modified.

**Edge cases:**
- If Docker is not installed or not in PATH, the status banner shows an actionable error; the Run button stays disabled.
- If the `sieve_default` image is not built, a warning with the build command is shown.
- Sieve size and trace level are validated server-side (whitelist + numeric bounds) before any process is spawned; no user input reaches a shell.
- Up to 3 jobs can run concurrently; a 5-minute per-job timeout kills stalled containers.
- The runner is not shown when the visualizer is open (only available on the welcome / log picker screen).
- The static nginx build has no Node.js server; the status API call silently returns nothing and the screen degrades gracefully (banner shows "Checking…" indefinitely — this is acceptable for non-dev deployments).

**Notes:**
<!-- maintainer notes after testing -->



8 When starting up and loading the events, in the background try mode 1-8 and find out which one has the best fps.
 