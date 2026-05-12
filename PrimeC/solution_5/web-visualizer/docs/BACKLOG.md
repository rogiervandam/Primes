# Backlog

Use this as the short product backlog. For maintenance strategy and completed
refactor history, read `docs/AI_MAINTENANCE.md`.


240 When a event has nothing to show:
- if playing without repeat, skip it and just wait the delay between events before going to the next event. In the mean time, show a quick fade-in/fade-out on the animation timeline to indicate that an event occurred but had no animation.
- if playing with repeat, just show the animation timeline with the fade-in/fade-out in 2 seconds. 
- in both cases, instead of the text "ANIMATION SPEED <x>%" show the text "NO CHANGES - NO ANIMATION" in the animation timeline, to indicate that this event had no changes and no animation, so users understand why there is no animation and are not confused by the lack of visual feedback.

295 The events panel should close with a slide-out animation to the left, instead of just disappearing. This way users can have a smoother and more visually appealing experience when toggling the events panel, and it can also help them maintain their spatial orientation in the interface. We can implement this by adding a CSS transition to the events panel's position or transform property, so that when it is toggled, it animates from its current position to the hidden position off-screen to the left. We can also add a fade-out effect to make it look more polished.

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

