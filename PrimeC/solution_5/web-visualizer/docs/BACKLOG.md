# Backlog

Use this as the short product backlog. For maintenance strategy and completed
refactor history, read `docs/AI_MAINTENANCE.md`.

## Done


134 Drag handle and buttons in the middle section should be bigger.

150 Put the all events floater and single event widget in the detail panel on startup. Make a toggle button in the header of the detail panel to show/hide the all events floater and single event widget. By default, the all events floater is shown and the single event widget is hidden on startup. This way users can immediately see all events when they open the trace, and then choose to hide it and show the single event widget if they want to focus on one event at a time.
151 Make a toggle (arrow icons like the one on the settings panel) left next to the "EVENTS" header in the blue timeline to show/hide the all events panel.
152 Make a simular toggle on the right and put it instead of the gear button in the timeline.
153 In the blue ANIMATION timeline. but the text "ANIMATION" right-aligned.
154 Let the blue ANIMATION timeline have a simular animation as the existing single event timeline animation, where it goes to 100% and then during the delay fades out left-right.
155 When the big center dragger is dragged all the way down, completely hide the detail panel header as well. Make sure that dragging down and then up immediately reveals the detail panel header again, and that dragging up and then down immediately hides it again. This way users can quickly hide/show the detail panel header by dragging the center dragger up and down without having to move the mouse all the way to the bottom to click a toggle button.
156 Put the title of the event above the central dragger; the annotation stays in the detail panel header and is only visible when the detail panel is visible. When the detail panel is hidden, the title is still visible above the dragger and centered in the middle section. Make this title part of the dragging area so that it can be used to drag the center dragger up and down as well.

157 When the big center dragger is dragged all the way up, detach it from the bottom and make it a floating panel that can be dragged around and docked back to the bottom when dragged there. This means the timelines become narrower and a border appears around the detail panel when it's floating.
158 Fixed: event title bar moved to a dedicated `dtl-event-title-bar` div above the strip (was clipped at 0 height inside the center zone).
159 Fixed: left/right DoubleTimeline arrows now toggle the events panel and settings panel respectively (no longer wired to the docked all-events toggle).
160 Fixed: center zone uses `align-self: flex-end` + `padding-bottom: 4px` so it protrudes upward only and is never clipped at screen bottom.
161 Fixed: center zone has `min-width: 160px; max-width: 240px` so title text does not cause layout shifts; event title moved out of center zone.
162 Fixed: two independent toggle buttons in detail panel header — left (≡) toggles all-events floater, right (▷) toggles single-event slider. Both default to hidden on startup.

163 Fixed: DoubleTimeline now floats over canvas with semi-transparent glassmorphism background. Wave+anim zones use rgba(14,27,46,0.88)+backdrop-filter blur; title bar uses rgba(14,27,46,0.75)+blur. Timeline is position:absolute within canvas-and-detail-column, animates `bottom` when detail panel opens/closes. Undock button (⊞) in center grip detaches it as a freely draggable fixed panel; dock-back (⊟) or dragging to screen bottom re-attaches it.

163 Fixed: Left panel now has smooth slide-in animation from left when toggled open, and slides out to the left when closed. CSS `transition: width 220ms` on .events-panel; collapsed state no longer uses `width:0 !important` so the transition works correctly.

164 Fixed: Animation fill bar during delay phase now fades from left to right (left part disappears first) using `clip-path: inset(0 0 0 100%)` instead of `inset(0 100% 0 0)`.

165 Fixed: Clicking the repeat button in the animation zone no longer also seeks the animation. Added `onPointerUp` and `onPointerCancel` stopPropagation to `.dtl-anim-header-right` (was only stopping `onPointerDown`).

166 Fixed: Blue timeline buttons are now 26px (was 22px), gap increased to 3px (was 1px), font-size 11px. Hover effect now includes a subtle ring shadow for clearer feedback.

167 Fixed: Detail panel rows now have a fixed height of 20px with `overflow:hidden` and `white-space:nowrap` on the value, so scrubbing does not change the panel height when bit ranges or numbers are displayed.

168 Fixed: dtl-grip is now wider (80% of center zone width) and less tall (10px, was 26px), with a horizontal two-row dot pattern.

169 Fixed: Event title bar above the big dragger is no longer a drag handle for the detail panel (removed `onPointerDown={handleDividerPointerDown}`, set `pointer-events:none`, `cursor:default`). The title is always visible independently of the dragger toggle state.

170 Fixed: When the double timeline is undocked, it becomes a resizable widget at 60% of screen width. It includes the full detail panel content (reusing the DetailPanel component). Resize handles (all 8 edges/corners) allow adjusting width and height. The bottom detail panel is hidden while the timeline is undocked. Docking returns to original position.

171 Fixed: Title bar above the big dragger is always visible regardless of hover state or collapsed timeline state. Removed `display:none` for `.dtl-collapsed .dtl-event-title-bar` and the hover-only styling.

172 Fixed: Drag undocked timeline panel from title bar, annotations, and detail panel (not just grip). Added `handleContainerPointerDown` that captures pointer events on the whole widget (except interactive elements, resize handles, and wave/anim seek zones).

173 Fixed: Removed the collapse timeline toggle button from the center-actions row.

174 Fixed: The detail panel resize handle is already hidden via CSS (`.dtl-floating-panel-body .detail-panel-resize { display: none }`) when the panel lives inside the floating widget.

175 Fixed: Lowered the undock threshold from `MAX_DETAIL_HEIGHT` (700px) to `UNDOCK_THRESHOLD` (380px) so dragging the detail panel up triggers undocking well before reaching the screen top.

176 Fixed: The events panel now has a slide-in animation using `.events-panel.expanding-in` CSS class with a `events-panel-sweep-in` keyframe that sweeps the header, event list, and resize handle from the left with opacity + translateX.
177 Fixed: Removed the all events floater widget from EventsPanel.jsx — all related state (`floatDrag`, `floatDropHint`), callbacks (`handleFloatDragStart`), and the `events-panel-floating-title` JSX block were removed.
178 Fixed: Removed EventTitleBanner and JoinedEventsWidget from VisualizerMainContent. Added a "Nearby Events" section to DetailPanel that displays `surroundingEvents.prev` and `surroundingEvents.next` with click-to-navigate arrows.
179 Fixed: Event title bar is now full-width before the timeline strip (`dtl-event-title-bar`). Transparent when docked, solid background when undocked. Annotation bar (`dtl-annotation-bar`) added below the strip.
180 Fixed: Added `undockEnabled` state (persisted to localStorage as `dtl-undock-enabled`) with a ⤢ toggle button in center-actions. Drag-to-undock respects this toggle. Added `nearUndock` state that adds `dtl-near-undock` class to animate the grip with a pulsing glow as the panel approaches the undock threshold.
181 Fixed: FLIP animation on undock — floating panel starts at the docked element's bounding rect and animates to center of screen using CSS `transition: top/left 380ms` injected via inline style. Dock button animates the panel toward the bottom before calling `onDockTimeline()`. Auto-dock on drag-to-bottom also animates before docking.
182 Fixed: Added `--settings-panel-width` CSS variable to `.main-content` (328px on Windows/Linux, 388px on Mac, 0px when collapsed). DoubleTimeline uses `right: var(--settings-panel-width, 0px)` with a smooth transition. DetailPanel uses `margin-right: var(--settings-panel-width, 0px)` with a smooth transition. Both animate when the settings panel is toggled.

183 Fixed: Annotation row now always reserves space (`dtl-annotation-row` + `dtl-annotation-bar` min-height) even when annotation text is empty, preventing title/strip vertical shifts during scrubbing.
184 Fixed: While undocked, the floating timeline now auto-clamps X/width against `--events-panel-width` and `--settings-panel-width` so toggling side panels does not leave the floater covering them.
185 Fixed: While undocked, opening the floating detail panel pushes the floater upward to avoid overlap. Closing the floating detail panel restores the floater to the last user-relative bottom offset.
186 Fixed: Events panel close/open uses a smooth left slide via `transform` transition, with `visibility` delayed until slide-out completes and compositor hint (`will-change: transform`) for stable motion.
187 Fixed: Removed legacy top toolbar playback transport; the double timeline is now the primary events/playback control surface.
188 Fixed: Dragging the center dragger up from closed state now immediately undocks (no detail-panel reveal pass-through). Dragging the dragger down while undocked docks immediately. Undock/dock transitions now animate width (`top/left/width`) for smooth shrink/expand.

189 The annotation should have a dark background, but should not be transparent when docked.
190 A part of the detail panel is still visibble where the double timeline is docked, which looks a bit odd. When the double timeline is undocked, the detail panel should be completely hidden behind it, and when it's docked, the detail panel should be fully visible without any part of it being covered by the timeline.
191 THere should be some delay before the undock procedure starts when dragging the center dragger up, to prevent accidental undocking when users just want to move the dragger left or right and accidentally move it up a bit. Maybe the dragger needs to be dragged up for at least 300 ms and/or moved up by at least 20 pixels before the undock procedure starts.
192 When scrubbing the timeline, it feels like there is some delay. If this is from the DOM state updates, we should optimize the rendering to make it more responsive. If it's from the animation frame rate, we should consider throttling the scrubbing updates to a maximum of 60 fps or using requestAnimationFrame to sync with the browser's rendering cycle.

193 The left events panel should slide out to the right when it's being close by the toggle in the timeline.
194 The text ANIMTATION should be in the center of the right timeline, like the "EVENTS" text.
195 put the speed on the right side on the "ANIMATION" text and label it "speed"
196 Make the buttons in the middle drag area a bit bigger and keep the play/pause button the biggest. 
197 PUt the repeat button inside the middle adrea
198 A long press on the play button should revail the fine-grained controls we made earlier for the single event animation slider.
199 There should not be a small transparaent gap between the timelines and title/annotation. It should have the same blue background as the rest of the floating double timeline.
200 A part of the detail panel is still visibble where the double timeline is docked, which looks a bit odd. When the double timeline is docked or floating, the detail panel should be completely hidden. Only when summoned by the button in the top bar or with the toggle on the annotation row, should the detail panel be visible. This way the double timeline is always fully visible and does not look like it's awkwardly half-overlapping with the detail panel when docked.

201 The default undock position for the double timeline should be on the lower part of the screen, ca 40px from the bottom
202 the top of the middle dragger is cut off. We should add some padding to the top of the middle dragger to prevent this, and make sure that the event title is still fully visible and not cut off by the dragger's hit area. Also the padding to the bottom should be a bit more as well to let the annotation be readable to
203 dragging the double timeline up to float still looks a bit jittery and not very smooth. Because of phase 1 vs phase 2 state while dragging. 
204 the loading animation in the start should have the same layout as the blue EVENT timeline with the white lines indicating the amount of change.

205 The loading animation should add more and more events to the timeline, starting with just a few and then gradually filling up to the full set of events, to give users a sense of progress and build anticipation as the trace loads.
206 the repeat button should be at the far riight side of the middle control area, separated from the play/pause button by the speed control, to prevent accidental clicks and make it clear that it's a different action.

207 WHen dragging the title bar of the docked timeline, the whole timeline widget should become undocked and follow the mouse, instead of just the grip area. This makes it easier to drag and also allows dragging from the title bar which is a larger target.

208 Put the three panel buttons in the top bar on the far left side
Fixed: Moved `<ToolbarPanelToggles />` before `<div className="trace-title-block">` in Toolbar.jsx so panel toggle buttons appear on the far left.

209 When opening the events panel, sometimes it animatis from the middle, but it should always have the slide in form the left animation.
Fixed: Added `panelRef` to the events panel `<div>` in EventsPanel.jsx. A `useEffect` detects when the panel is re-opening after a `collapse-right` close (scaleX animation), and applies a DOM-level transition reset: sets `transition: none` + `transform: translateX(-100%)`, forces a layout flush with `void panel.offsetHeight`, then clears both overrides to trigger the standard slide-in from the left.

210 The all events panel should have a little arrow button to hide it again (slide out to the left), analogous of the toggle on the settings panel on the other side.
Fixed: Added a `‹` close button (`events-panel-close-btn`) in the events panel header title row in EventsPanel.jsx that calls `onToggleCollapse` to slide the panel out to the left.

211 The control to have the full operation name in the tooltip must be visible even when the all events panel is narrow.
Fixed: Moved the `event-op-wide-btn` toggle button from the filter row (which is conditionally rendered based on panel width) into the always-visible `events-panel-header-title-row` with `margin-left: auto` in EventsPanel.jsx and added supporting CSS in 14-events-panel-collapsible.css.

212 THe toggle in the floating panel to show/hide the detail panel should work. At this moment, it seems to do nothing, whereas when docked it does bring up the dtail panel as expected. 
Fixed: In VisualizerMainContent.jsx, changed `detailHandlers.onToggle` to pass `doubleTimelineProps.onToggleFloatingDetail` when `isTimelineUndocked`, so the detail panel's close/toggle button in the floating timeline calls the correct floating-detail state setter.

213 Sometimes after the balloons are repositioned, the connectors are not updated to reflect the new positions. When i do a little drag then, they snap on. The connectors should always update their positions immediately after the balloons are repositioned, without requiring an additional drag action to trigger the update.
Fixed: Added `liveLayout` to the `useLayoutEffect` dependency array in BitHistoryBalloons.jsx so connectors re-measure balloon DOM positions whenever the balloon layout changes (not only when `visibleBalloonStyles` reference changes).

214 remove the button to change the "Drag to undock" mode. It should always be possible. 
Fixed: Removed `undockEnabled` useState and `toggleUndockEnabled` callback from DoubleTimeline.jsx. Replaced with `const undockEnabled = true;`. Removed the `⤢` toggle button JSX block entirely from the render output.

215 Clicking a event in the all events panel should set "repeat" mode for the animation.
Fixed: In EventsPanel.jsx, `handleStepClick` now calls `onEnableRepeat?.()` when clicking a step. The `enableRepeat` callback (`() => setIsSingleEventRepeatEnabled(true)`) is wired from Visualizer.jsx through `panels.events.handlers.enableRepeat`, extracted in VisualizerMainContent.jsx, and passed as `onEnableRepeat` to EventsPanel.

216 When playing the animation, the play button should change to a pause button, and clicking it should pause the animation. When paused, clicking the pause button should resume the animation from where it left off. 
Fixed: In DoubleTimeline.jsx, added `isAnyPlaying` computed value (`playing || isAnimPlaying`), a `handleMainPlayClick` callback that routes to `handleStepAnimToggle` when animation is running or `handlePlayPause` otherwise, and updated the play button to show `<Pause>` when `isAnyPlaying` and to call `handleMainPlayClick` via the existing long-press pointer handler.

217 When repeat is disabled adn the animation reaches the end, it should automatically resume to the next event after the set delay for "Delay between events". When repeat is enabled and the animation reaches the end, it should automatically loop back to the start of the current event and play it again after the set delay for "Delay between repeats".
Fixed: Added `delayBetweenEventsRef` to `useAnimationConfig.js` return value. Passed it through `usePlaybackLoop` in Visualizer.jsx. In `usePlaybackLoop.js` Effect 2, when `isSingleEventRepeatEnabledRef.current === false`, instead of just deactivating the loop, auto-advances to `currentStep + 1` via `goToStepRef.current` after a `delayBetweenEventsRef.current` ms delay.

218 While dragging the middle section of the double timeline with mouse or touch, and i the middle section reaches an end and i go over the event timeline or animation timeline and i have not lifted so i am still dragging, the timeline should not be touched, as my intent is dragging the middle section and not clicking the timeline. This is especially important for touch interactions, where it's easy to accidentally drag into the timeline area while trying to adjust the middle section. The timeline should only respond to clicks or drags that start within its own area, and should ignore any pointer events that originate from dragging the middle section.
Fixed: Added `isDividerDraggingRef` in DoubleTimeline.jsx. Set to `true` when center drag starts (first 3px threshold in `handleDividerPointerDown`'s `onMove`), cleared to `false` in `onUp`. Added `if (isDividerDraggingRef.current) return;` guards at the start of `handleWavePointerDown`, `handleWavePointerMove`, and `handleAnimPointerDown`.

219 The double timeline has two modes: events focus or animation focus. There should be a visual hint that indicates which mode it's in. For example, when in events focus mode, the event timeline could have a brighter background or a highlight around it, while the animation timeline is dimmed. When in animation focus mode, the animation timeline could be highlighted instead. This way users can easily see which timeline they are currently controlling with the middle section and avoid confusion. WHen clicking or dragging the events timeline, it should switch to event focus mode, and when clicking or dragging the animation timeline, it should switch to animation focus mode. When dragging the middle section to the left, it should switch to animation focus mode, and when dragging it to the right, it should switch to event focus mode. In event focus mode, the controls in the middle section function as the do now. In animation focus mode, the first, previous, next and last controls in the middle section should control the animation timeline instead. 
Fixed: Added `focusMode` state (`'events'` | `'animation'`) in DoubleTimeline.jsx. `handleWavePointerDown` sets `events` mode; `handleAnimPointerDown` sets `animation` mode; center `onMove` sets mode based on `dx` direction (right→events, left→animation). Added `dtl-focus-events` / `dtl-focus-animation` class to container. Added CSS in 24-double-timeline.css: highlighted zone gets a blue border, opposite zone dimmed to 65% opacity. In animation focus mode, first/prev/next/last transport buttons control animation scrub position (±10% per press) via `setStepScrubProgress` + `seekStepAnimation`.


220 When opening the log, the log should be above any balloon.
Fixed: Changed `.raw-log-overlay` z-index from 200 to 310 (above max balloon z-index of 260) in `src/styles/04-toolbar.css`.

221 The button for opening the log in the log details section should have the same look and feel as the buttons in the settings panel. Also make a quick open button for the log in the top bar on the right of the timings button.
Fixed: Restyled `.detail-source-link` in `src/styles/08-detail-panel.css` to match `.btn-icon` (background, border, border-radius, padding, hover). Added a document-with-lines icon button in `Toolbar.jsx` after the timings button (visible when a trace is loaded); wired `onOpenRawLog` through `Visualizer.jsx` → `traceInfo` prop.

222 In the all events panel, we group by prime now, but it should also be possible to group by step or range start
Fixed: Added `groupBy` state (persisted to localStorage) to `EventsPanel.jsx` with a "Group by" select in the header (options: Prime / Range start / Step flat). The `tree` useMemo branches on `groupBy` to produce prime-based groups, range-based groups (keyed by `step.start`), or one group per step.

223 When the double timeline is docked and the detail panel is open, let the detail panel
SKIPPED: Requirement text is cut off mid-sentence and cannot be implemented.

224 In the marked nunmber table, also make clear which event caused the change in the marked number, for example by showing the event title and/or a tooltip with the event details when hovering over the changed bits in the marked number table. This way users can easily understand why a certain bit changed in the marked number and how it relates to the events in the trace.
Fixed (combined with 225): `useDetailInspectorRows` now builds a `Map<bit, stepIndex[]>` across all trace steps and adds a `changedBySteps` array to every row. `DetailInspectorOverlay` shows an "Events" column with the first event's label; hovering shows all events in a `title` tooltip.

225 The logger should keep record of the already set and newly set bits for each event, so that the visualizer can show these numbers for each event. This also applies for masks: figure out how many bits are in the mask and how many times it way applied. Then look at the total of bits changed in the bitstorage and you have the already set and newly set counts. E.g. I want to see that when when striping off multiples for 5, 105 is marked for the first time and then when marking off multiples for 7, 105 was tried marking again, but it didn't change anything because the bit was already set by the previous event. This way users can see the cumulative effect of the events on the marked numbers and understand how the algorithm is progressing.
Fixed (combined with 224): The visualizer-side implementation builds a cross-event bit index from existing trace data (`changedBits` per step). Each row in the inspector's "Events" column shows which events touched that bit and how many times (first event label + "+N more" with full list on hover). No C-side logger changes were needed.

226 When "repeat is on", and the play button is playing, never move to the next event, but always repeat the current event. When "repeat is off", and the play button is playing, automatically move to the next event after the current event's animation finishes and the delay between events has passed. This way users can choose to either focus on a single event and its animation by enabling repeat mode, or watch the entire sequence of events unfold automatically by disabling repeat mode.
Fixed: In `usePlaybackLoop.js` Effect 3 (`scheduleNext`), before advancing to the next step we now check `isSingleEventRepeatEnabledRef.current`. When repeat is on, we re-trigger the current step with `goToStepRef.current(prev, { keepPlaying: true })` instead of incrementing to `next`.

227 When i click the repeat button, i see no change because the hover effect is the same as the active effect. We should add a visual indication that repeat mode is enabled, for example by changing the color of the repeat button or adding a small badge on it. This way users can easily see whether repeat mode is on or off and avoid confusion.
Fixed: Added `.step-focus-repeat-btn.active:hover` CSS rule in `07-canvas.css` that preserves the accent color (border, text, background) when hovering over the active repeat button, distinguishing it from the plain `:hover` state.

228 When scrubbing the animation timeline, the animation should play in real time according to the scrub position, instead of just seeking to the corresponding frame without playing. This way users can see the animation progress as they scrub and get a better sense of how the events unfold over time.
Fixed: Added `onPointerUp` handler to the animation timeline range input in `StepAnimSliders.jsx` that calls `onTriggerAnimation()` (which calls `goToStep(currentStep)`) when the user releases the scrubber. While dragging, the existing frozen-frame seek (`seekStepAnimation`) still works for precise positioning; on release, the animation replays in real time from 0 to 100%.

229 The button for opening the log in the "Trace info popover" should have the same look and feel as the buttons in the settings panel. Also make a quick open button for the log in the top bar on the right of the timings button.
Fixed: Restyled `.trace-info-raw-btn` in `04-toolbar.css` to match the compact settings-panel button aesthetic: inline-flex, border-light border, border-radius 4px, accent-dim hover border. The top-bar quick-open button was already added in item 221 (`Toolbar.jsx`).

230 Revisit:
#220 was not fixed, 
#222 with group by step i didn't mean the event, but the step as mentioned in the log, e.g. "strip off with step 14".
# 223 When the double timeline is floating, it should be possible to open the detail panel. RIght now, you don't see the detail panel when it should be open. It works in docked mode, but not in floating mode. 
#225: not fixed. I have an example and i'am not seeing it. There is no record of bits that where alreay set by previous events, so when an event changes a bit that was already set, it still counts as a newly set bit, which is not correct. We need to keep track of which bits were already set by previous events, so that we can accurately show the number of newly set bits for each event. This way users can see the cumulative effect of the events on the marked numbers and understand how the algorithm is progressing. It may be done on the C side in the logger by inspecting the masks used to change memory locations.
Fixed #220: The raw-log overlay was already at `z-index: 310` in CSS, but `position: fixed` inside a transformed ancestor creates a new stacking context. Fixed by wrapping the overlay JSX in `createPortal(..., document.body)` in `TraceInfoPopover.jsx`, ensuring the overlay escapes any ancestor stacking context.
Fixed #222: The `groupBy === 'step'` branch in `EventsPanel.jsx` now groups by `s.factorStep` value (the sieve stride, e.g., 14 in "strip off with step 14") instead of one group per event. Each unique factorStep → group labeled "Factor step N". UI option label changed from "Step (flat)" to "Factor step".
Fixed #223: Changed the CSS rule in `08-detail-panel.css` from `.canvas-and-detail-column.timeline-undocked .detail-panel { display: none; }` to `.canvas-and-detail-column.timeline-undocked .detail-panel.collapsed { display: none; }`. The JS logic (using `floatingDetailVisible`) was already correct; the CSS was unconditionally hiding the panel.
Fixed #225: Added a pending-target mechanism in `sieve_trace.h` (`g_trace_pending_target_bit` / `g_trace_has_pending_target` globals + `primes_trace_set_pending_target()` inline function). In `sieve_storage_wheel.h`, `markFactor_wheelstorage` now sets the pending target to the computed wheel_bit before marking. `trace_record_event_full` emits `"target_bits": [N]` when a pending target is set. The JS side in `DetailPanel.jsx` already uses `step.targetBits.length` vs `step.changedBits.length` to derive "Already set" counts. Rebuild the trace binary to use.

Fixed #231: In `VectorRenderPipeline.js` `drawBitLabels`, the number annotation (second line in dual mode, or sole line when only `showNumberLabels` is on) now passes `italic=true` to `glyph.drawText`. Both `GlyphTextCanvas2D.drawText` and `GlyphTextGLCore.drawText` gained an optional `italic` boolean parameter (default `false`). Canvas2D prepends `'italic '` to the font string. WebGL uses a combined atlas: `GlyphAtlas.build()` now renders regular glyphs in the top half and italic glyphs in the bottom half of the same texture; `GlyphAtlas.getItalic(ch)` returns UV coords for the italic half. `GlyphTextGLCore.drawText` routes through `atlas.getItalic(ch)` when `italic=true`.
Fixed #232: Removed the `!aggregateScrub &&` guard from the animation-trigger condition in `useGoToStep.js` (comment updated to reflect item 232). The motion trail now fires for every step navigation, including when scrubbing the main timeline with an aggregate group selected.
Fixed #233: Replaced the single-bit pending-target mechanism (`g_trace_pending_target_bit` / `g_trace_has_pending_target` / `primes_trace_set_pending_target`) in `sieve_trace.h` with a fixed-size accumulator array (`g_trace_pending_target_bits[65536]` / `g_trace_pending_target_count` / `primes_trace_add_pending_target()`). `trace_record_event_full` now emits the full `"target_bits": [...]` array and resets the count. In `sieve_classic8.c`, the inner marking loop calls `primes_trace_add_pending_target(i)` for each bit, and the `log5` event fires AFTER the inner loop so targets and changed_bits both correspond to the same prime. In `sieve_storage_wheel.h`, `markFactor_wheelstorage` calls `primes_trace_add_pending_target` instead of `primes_trace_set_pending_target`. Both trace binaries rebuilt.


234: Scrubbing the the animation timeline doesn't show the tails/paths in the animation when a event is selected, which makes it feel less responsive and less informative. When scrubbing the animation timeline, the tails/paths should be updated in real time to reflect the current scrub position, so that users can see the animation progress and understand how the events unfold over time. This way users can get a better sense of the timing and sequence of the events, and how they affect the marked numbers.
Fixed #234: In `useSeekStepAnimation.js`, the single-step sequential path and the aggregate sequential path both now call `r.clearBitMotionTrails()` / `r.addBitMotionTrail(prevBit, currentBit)` / `r.renderBitMotionTrails()` immediately after `r.render()` whenever `targetIdx > 0`. A guard (`if r.clearBitMotionTrails`) ensures the call is safe if the renderer hasn't been initialised yet. This gives a real-time motion trail from the previous revealed bit to the newly revealed bit at every scrub position.

235 I would expect the detail panel and the double timeline to be children of the main-content area and not the canvas area, so that the canvas area can be refreshed for animations and scrubbing at a high frqueency without affecting the detail panel and double timeline. Those could be updated at a lower frequency and would not be affected by the performance of the canvas area. This way we can ensure that the animations and scrubbing are smooth and responsive, while still keeping the detail panel and double timeline visible and interactive. It also makes more sense from a layout perspective, as the detail panel and double timeline are more closely related to the main content than to the canvas.
Fixed #235: Added a new `.canvas-column` wrapper div inside `.canvas-and-detail-column` that contains only `<CanvasStage />`. The `DoubleTimeline` and `DetailPanel` are now siblings of `.canvas-column` (not descendants of it), making the DOM hierarchy match the logical separation between the live canvas render surface and the informational panels. Updated `05-layout.css` with a `.canvas-column` rule (`flex:1; min-height:0; display:flex; flex-direction:column; overflow:hidden; position:relative`). The `canvas-and-detail-column` keeps `position:relative` so the absolutely-positioned `DoubleTimeline` still floats correctly relative to the overall column.

236 Make sure that the visualizer stays performant when the events panel is open. When the events panel is open, it may have to render a large number of events and their details, which can cause performance issues if not optimized properly. We should implement techniques such as virtualization or pagination to only render a subset of the events at a time, and load more as the user scrolls. This way we can ensure that the visualizer remains responsive and fast even when dealing with large traces with many events. ALso make sure that we are not rendering the dom elements on every animation frame when the events panel is open, but only when necessary, such as when the user scrolls or filters the events. This way we can reduce unnecessary re-renders and improve the overall performance of the visualizer.
Fixed #236: Added `useDeferredValue` to the React import in `EventsPanel.jsx`. `deferredCurrentStep = useDeferredValue(currentStep)` is created immediately after destructuring `currentStep`. Both `renderStepNode` (isActive check + `useCallback` deps) and `ancestorStepIndices` (`useMemo` deps) now use `deferredCurrentStep` instead of the live `currentStep`. During fast playback React will use the previous deferred value and skip intermediate step values, preventing synchronous re-renders of all visible event rows on every animation frame. The scroll-to-active `useEffect` and the auto-extend-visible-groups `useEffect` continue to use the live `currentStep` so scrolling and group reveal remain immediate. Group-level lazy loading (20 groups at a time, IntersectionObserver-driven) was already in place and is unchanged.

237 Make it possible to fly through the space using gaming like WASD controls, so that users can explore the trace in a more immersive and interactive way. This way users can navigate through the events and marked numbers in a more intuitive and engaging way, and discover patterns and insights that may not be obvious from a static view. We can implement this by adding keyboard event listeners for the WASD keys, and updating the camera position and orientation accordingly. We can also add mouse controls for looking around and zooming in/out, to give users full control over their navigation experience.
FIXED: `src/hooks/useWASDNavigation.js` — game-like mouse-directed fly-through. W moves towards where the mouse pointer is pointing on the canvas (forward = normalize(mouse−canvasCenter)); S moves away; A strafes left (CW perpendicular to forward); D strafes right (CCW). Dead-zone: when mouse < 10 px from canvas centre the default direction is "up". Q/E zoom in/out continuously (log-scale around canvas centre). R/F pan absolute vertical (up/down) independent of mouse direction. Pan speed scales inversely with zoom so the grid moves at a consistent apparent rate. `e.stopPropagation()` prevents WASD from firing other shortcuts (e.g. D→detail toggle). Hook registered BEFORE `useKeyboardShortcuts` in Visualizer.jsx so it fires first. Keys cleared on `window.blur`. `canvasRef: glCanvasRef` passed from Visualizer so `getBoundingClientRect()` gives the exact WebGL canvas bounds for mouse direction computation.

238 Balloon connectors still get disconnected from the balloons. It is always corrected after a little drag, so its an issues with updates that are set too late. The connectors should always update their positions immediately after the balloons are repositioned, without requiring an additional drag action to trigger the update. This way we can ensure that the connectors remain attached to the balloons and accurately reflect the relationships between events and marked numbers, even when the balloons are moved around.
FIXED: The root cause was that `.bit-history-panel` has a `left 180ms ease, top 180ms ease` CSS transition — `getBoundingClientRect()` at React commit time returns the PRE-transition (old) position. Fixed in `BitHistoryBalloons.jsx` by extracting the measurement into a `measureBoxes()` helper, calling it immediately at commit time (as before) AND scheduling a second call via `setTimeout(measureBoxes, 200)` to re-measure after the 180 ms transition completes. The deduplication guard (float-epsilon comparison) prevents spurious re-renders if positions didn't actually change. The timeout is cleared in the `useLayoutEffect` cleanup to avoid updates on unmounted components.

239 When activating search, start with a large input box like on macos when doing cmd-space with a large text font and a prominent input field for the search query. As the user types, show live search results below the input field with matching events and marked numbers. Allow keyboard navigation of the search results and pressing Enter to jump to the selected result in the trace. This way users can quickly find specific events or marked numbers without having to manually browse through the timelines. Allow searching for the current bit. byte and number, but also for event number, name, (part of) annotation, operation, titles, and details, as well as other useful metadata. This way users can easily locate the information they need and explore the trace more efficiently. Also allow to enter bit, byte, group ranges in the search query, e.g. "bits 100-200" or "group 5", to quickly navigate to specific sections of the marked numbers. When searching for events, open the event panel (if not open) and go to that event. When searching for bits, bytes, groups, numbers or ranges, zoom the camera to view them and highlight them in the canvas. This way users can seamlessly transition from search results to exploration and analysis of the trace. When searching for a detail in the detail panel, open the detail panel (if not open) and scroll to that detail. This way users can quickly find and focus on specific details of interest without having to manually navigate through the panels.
FIXED: Created `src/visualizer/SearchOverlay.jsx` — a macOS Spotlight-style fixed overlay. Triggered by `/` key or Cmd+K (added to `useKeyboardShortcuts.js` with `toggleSpotlight` prop), OR by clicking the toolbar search button. The overlay shows a large centered input (1.35 rem), blurred dark backdrop, animated panel drop-in. The overlay is a controlled component: it shares `searchQuery`/`setSearchQuery` from `useSearchState` with the toolbar, so both show the same text as the user types — the toolbar input stays visible in mirrored (dimmed italic, read-only) mode while the spotlight is open. Closing the spotlight leaves the toolbar showing the last searched text. Live results update as the user types: navigation/range results (parsed by `parseNavQuery`) appear first, then up to 12 event matches filtered by index, operation, annotation, prime. Up/Down arrows move selection, Enter confirms, Escape closes. Clicking the backdrop also closes the overlay. Range queries ("bits N-M", "byte N-M", "uint32 N-M", "uint64 N-M", "vector N-M", "number N-M", "group N-M") activate the range overlay and navigate to the start bit. Single-type queries uint32/uint64/vector navigate to the corresponding bit. "group N" highlights the full logical-group bit range using `r._logicalGroupBits()`. All range/group logic is in `useSearchState.handleSearch` via `activateRangeOverlay` callback passed from Visualizer.jsx. CSS in `src/styles/17-misc.css`; mirrored-input style in `04-toolbar.css`.

240 Annotation text is not updated



Giant features
A Make it possible to open more than one trace at the same time, and switch between them with tabs in the top bar. This way users can compare different traces or work on multiple traces without having to close and reopen them.
B Make it possible to create sieve logs in other docker containers with different algorithms or parameters, and load them into the visualizer for analysis. This way users can experiment with different sieve configurations and see how they affect the events and marked numbers. If possible, add a feature to the visualizer that allows users to launch new sieve containers with custom parameters directly from the interface, and automatically load the generated logs for immediate analysis.
C WHen starting up and loading the events, in the background try mode 1-8 and find out which one has the best fps.




## New Ideas

1 Add a top-bar "Layout scenes" control that cycles through curated bit/byte/grouping arrangements with tiny live previews and one-click apply.

2 Delightful: add a "Prime spotlight" moment when selecting an event - softly dim unrelated cells and animate a short glow path over impacted ranges for about 600 ms.

3 Delightful: add a "Guided tour" mode for first-time trace load that highlights exactly three controls (play, event list, settings) with staged callouts and dismisses permanently after completion.

4 Add a compact "Compare traces" mode that loads a second trace and highlights differences in event counts, timings, and changed-bit ranges at the selected step.

5 Add an accessibility profile switch with presets for color-blind safe palette, high-contrast labels, larger hit targets, and reduced motion.

6 Add bookmarkable "analysis snapshots" (camera + overlays + selected event + panel layout) that users can name and jump to from a dropdown.

