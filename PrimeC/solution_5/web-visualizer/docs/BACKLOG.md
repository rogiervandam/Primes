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
221 The button for opening the log in the log details section should have the same look and feel as the buttons in the settings panel. Also make a quick open button for the log in the top bar on the right of the timings button.
222 In the all events panel, we group by prime now, but it should also be possible to group by step or range start
223 When the double timeline is docked and the detail panel is open, let the detail panel
224 In the marked nunmber table, also make clear which event caused the change in the marked number, for example by showing the event title and/or a tooltip with the event details when hovering over the changed bits in the marked number table. This way users can easily understand why a certain bit changed in the marked number and how it relates to the events in the trace.
225 The logger should keep record of the already set and newly set bits for each event, so that the visualizer can show these numbers for each event. This also applies for masks: figure out how many bits are in the mask and how many times it way applied. Then look at the total of bits changed in the bitstorage and you have the already set and newly set counts. E.g. I want to see that when when striping off multiples for 5, 105 is marked for the first time and then when marking off multiples for 7, 105 was tried marking again, but it didn't change anything because the bit was already set by the previous event. This way users can see the cumulative effect of the events on the marked numbers and understand how the algorithm is progressing.
226 When "repeat is on", and the play button is playing, never move to the next event, but always repeat the current event. When "repeat is off", and the play button is playing, automatically move to the next event after the current event's animation finishes and the delay between events has passed. This way users can choose to either focus on a single event and its animation by enabling repeat mode, or watch the entire sequence of events unfold automatically by disabling repeat mode.

## New Ideas

1 Add a top-bar "Layout scenes" control that cycles through curated bit/byte/grouping arrangements with tiny live previews and one-click apply.

2 Delightful: add a "Prime spotlight" moment when selecting an event - softly dim unrelated cells and animate a short glow path over impacted ranges for about 600 ms.

3 Delightful: add a "Guided tour" mode for first-time trace load that highlights exactly three controls (play, event list, settings) with staged callouts and dismisses permanently after completion.

4 Add a compact "Compare traces" mode that loads a second trace and highlights differences in event counts, timings, and changed-bit ranges at the selected step.

5 Add an accessibility profile switch with presets for color-blind safe palette, high-contrast labels, larger hit targets, and reduced motion.

6 Add bookmarkable "analysis snapshots" (camera + overlays + selected event + panel layout) that users can name and jump to from a dropdown.

