# Backlog

Use this as the short product backlog. For maintenance strategy and completed
refactor history, read `docs/AI_MAINTENANCE.md`.




✅ 449 The animation playhead must always have a higher z-index than the repeat handle(s). When they overlap and i click, it should land on the playhead.

✅ 450 When i click an event, it should not start playing when if we were not playing.

✅ 453 When in repeat mode i see the fade-out twice. Must only be once, during the animation repeat delay. When repeating, make sure you don't apply the delay between events.

✅ 454 Sometimes when i click play, i see progress go to the playhead and then they go to 0%. When the user sets the playhead and then hits play, continue from that point. WHen the user scrubbs the playhead, make sure to always indicate the progress from 0% to that point.

✅ 455 The animation zone (click or drag area) tooltip says "Click or drag to see animation progress".

456 In the detail panel, bits section: the list of bit numbers and "more" should never be so wide that it comes over the count on the right. Show only 2-3 numbers and then more.



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

