# Backlog

Use this as the short product backlog. For maintenance strategy and completed
refactor history, read `docs/AI_MAINTENANCE.md`.




✅ 449 The animation playhead must always have a higher z-index than the repeat handle(s). When they overlap and i click, it should land on the playhead.

✅ 450 When i click an event, it should not start playing when if we were not playing.

✅ 453 When in repeat mode i see the fade-out twice. Must only be once, during the animation repeat delay. When repeating, make sure you don't apply the delay between events.

✅ 454 Sometimes when i click play, i see progress go to the playhead and then they go to 0%. When the user sets the playhead and then hits play, continue from that point. WHen the user scrubbs the playhead, make sure to always indicate the progress from 0% to that point.

✅ 455 The animation zone (click or drag area) tooltip says "Click or drag to see animation progress".

✅ 456 In the detail panel, bits section: the list of bit numbers and "more" should never be so wide that it comes over the count on the right. Show only 2-3 numbers and then more.

457 DONE ✅: When changing events, don't do a fade in/out of the detail panel.

458 DONE ✅: When playing or going to next/previous event with the < or > buttons or keys, scroll title current and annotation on the double timeline away in the appropriate direction and introduce the new ones with a scroll from the opposite direction. So when going to the next event, scroll the old title and annotation to the left and bring in the new title and annotation from the right. When going to the previous event, scroll the old title and annotation to the right and bring in the new title and annotation from the left. It's like a ticker. The speed should be taken from the |delay between events| setting, so when the user increases the delay, the scroll animation should slow down accordingly.

459 DONE ✅: The logic for the play button is still not correct. It should be:
- there are two modes: events or single event (repeat mode). And two states: playing or paused.
- when in events mode and paused, the central dragger should have the plan icon. Clicking play should start playing from the animation playhead position in the current event.
- when in events mode and playing, the central dragger should have the pause icon. Clicking pause should pause the animation and keep the animation playhead at the current position.
- when in single event (repeat) mode and paused, the central dragger should have the play icon with the repeat icon. Clicking play should start playing from the animation playhead position in the current event
- when in single event (repeat) mode and playing, the central dragger should have the pause icon with the repeat icon. Clicking pause should pause the animation and keep the animation playhead at the current position.
- in either mode (events or single events), the progress on the animation timeline should be visible: the space between 0% or the repeat start point (if active) and the animation playhead should be filled with a color to indicate how much progress has been made in the current animation cycle. This color must be significantly by brighter than 
the timeline background color, so it's clearly visible. TTherefore, the timeline color is always a bit dimmed. 
- when playing in repeat mode and the animation playhead reaches the end of the repeat range, the animation playhead should stop. The left-right fade-out animation begins during the repeat delay, and after the repeat delay, the animation playhead should jump back to the repeat start point and the fade-in animation should begin. 
- when playing in events mode and the animation playhead reaches the end of the current event, the animation playhead should stop. The left-right fade-out animation begins during the delay between events, the titles and annotation scroll out to the left and the new in from the right, and after the delay between events, the animation playhead should jump to 0% and start playing the next event. 
- when in repeat mode and the user toggles repeat mode off while playing, when the repeat handles should disapper and when the animation playhead reaches the end, it should apply the logic when playing in events mode: the playhead should stop, the fade-out animation should begin, and after the delay between events, the playhead should jump to 0% and start playing the next event.
- when in repeat mode and the user toggles repeat mode off while paused, the repeat handles should disappear and the animation playhead should remain in place.
- when in events mode and the user toggles repeat mode on while playing, the repeat handles should appear and the animation playhead should stop when reaching the repeat end point. The fade-out animation should begin, and after the repeat delay, the playhead should jump back to the repeat start point.

460 DONE ✅: when in repeat mode and playing and i click another event, the current animation should pause. We should switch to the newly selected event (events panel, detail panel, title and annotation in double timeline, etc), the repaet begin/end should be joined into a single repeat handle at the 100% progress point and the animation playhead should jump to the start (0% progress) of the new event and start playing immediately in repeat mode. When in repeat mode and paused and i click another event, we should switch to the new event but the animation playhead should not start playing immediately, it should remain paused at the start of the new event. The repaet begin/end should be joined into a single repeat handle at the 100% progress point

461 Make the timeline colors (events, animation) more dimmed and make the inactive timeline have more color, so that the progress on the animation timeline and events timeline  is more visible. 

462 The "Zone opacity" setting should influence the opaticy of the entire double timeline widget, docked or not, including the title, the timelines and the annotation. 

463 if the window is small and the detail panel is forced into more vertical rows, the masks are cut off halfway. Make sure that the masks are fully visible, by making them smaller (keep them proportional x/y).

464 When animation is off, don't show any animation artifacts, also when scrubbing the animation timeline. When animation is off, the animation playhead should not be visible and there should be no fade-in/fade-out of the detail panel when changing events. Show the text "ANIMATION OFF" in the middle of the animation timeline when animation is off. When the user clicks on the text "ANIMATION OFF", turn animation on and start playing the current event from the beginning.




Giant features
A Make it possible to open more than one trace at the same time, and switch between them with tabs in the top bar. This way users can compare different traces or work on multiple traces without having to close and reopen them.
B Make it possible to create sieve logs in other docker containers with different algorithms or parameters, and load them into the visualizer for analysis. This way users can experiment with different sieve configurations and see how they affect the events and marked numbers. If possible, add a feature to the visualizer that allows users to launch new sieve containers with custom parameters directly from the interface, and automatically load the generated logs for immediate analysis.
C WHen starting up and loading the events, in the background try mode 1-8 and find out which one has the best fps.
D 




## New Ideas

1 Add a top-bar "Layout scenes" control that cycles through curated bit/byte/grouping arrangements with tiny live previews and one-click apply.

2 Delightful: add a "Prime spotlight" moment when selecting an event - softly dim unrelated cells and animate a short glow path over impacted ranges for about 600 ms.

3 Delightful: add a "Guided tour" mode for first-time trace load that highlights exactly three controls (play, event list, settings) with staged callouts and dismisses permanently after completion.

4 Add a compact "Compare traces" mode that loads a second trace and highlights differences in event counts, timings, and changed-bit ranges at the selected step.

5 Add an accessibility profile switch with presets for color-blind safe palette, high-contrast labels, larger hit targets, and reduced motion.

6 Add bookmarkable "analysis snapshots" (camera + overlays + selected event + panel layout) that users can name and jump to from a dropdown.

