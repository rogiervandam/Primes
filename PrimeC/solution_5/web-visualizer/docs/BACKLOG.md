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

172 Should be able to drag the undocked timeline panel by its title bar, annotations and detail panel as well, not just the grip area. This makes it easier to move the panel around without having to precisely target the grip, especially on smaller screens or when the content is large.







## New Ideas

1 Add a top-bar "Layout scenes" control that cycles through curated bit/byte/grouping arrangements with tiny live previews and one-click apply.

2 Delightful: add a "Prime spotlight" moment when selecting an event - softly dim unrelated cells and animate a short glow path over impacted ranges for about 600 ms.

3 Delightful: add a "Guided tour" mode for first-time trace load that highlights exactly three controls (play, event list, settings) with staged callouts and dismisses permanently after completion.

4 Add a compact "Compare traces" mode that loads a second trace and highlights differences in event counts, timings, and changed-bit ranges at the selected step.

5 Add an accessibility profile switch with presets for color-blind safe palette, high-contrast labels, larger hit targets, and reduced motion.

6 Add bookmarkable "analysis snapshots" (camera + overlays + selected event + panel layout) that users can name and jump to from a dropdown.

