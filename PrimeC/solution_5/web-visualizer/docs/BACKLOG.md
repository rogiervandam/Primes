# Backlog

Use this as the short product backlog. For maintenance strategy and completed
refactor history, read `docs/AI_MAINTENANCE.md`.


240 When a event has nothing to show:
- if playing without repeat, skip it and just wait the delay between events before going to the next event. In the mean time, show a quick fade-in/fade-out on the animation timeline to indicate that an event occurred but had no animation.
- if playing with repeat, just show the animation timeline with the fade-in/fade-out in 2 seconds. 
- in both cases, instead of the text "ANIMATION SPEED <x>%" show the text "NO CHANGES - NO ANIMATION" in the animation timeline, to indicate that this event had no changes and no animation, so users understand why there is no animation and are not confused by the lack of visual feedback.

295 The events panel should close with a slide-out animation to the left, instead of just disappearing. This way users can have a smoother and more visually appealing experience when toggling the events panel, and it can also help them maintain their spatial orientation in the interface. We can implement this by adding a CSS transition to the events panel's position or transform property, so that when it is toggled, it animates from its current position to the hidden position off-screen to the left. We can also add a fade-out effect to make it look more polished.

296 The middle section of the double timeline should have a more glassy, lickable feel and design. This way users can have a more enjoyable and immersive experience when interacting with the timeline, and it can also enhance the overall aesthetic of the interface. We can achieve this by using a combination of semi-transparent backgrounds, subtle gradients, and soft shadows to create a sense of depth and tactility. We can also add some interactive elements, such as hover effects or click animations, to make it feel more responsive and engaging.

297 When opening the events panel, the double timeline doesn't smoothly transition to narrower, but seems to do it in 2 snaps. Also the detail panel doesn't smoothly adjust. We can improve this by implementing a smooth transition for the timeline's and detail panels width when the events panel is toggled. This way, users will experience a more fluid and visually appealing interface when opening or closing the events panel. 

298 When closing the settings panel, the double timeline transitions different and faster, going under the settings panel before the settings panel slides out. 

299 When the detail panel is open and the settings panel is opened, the bottom half of the settings panel is cut off. Make the settings panel full screen height in all cases.

300 The selectors in the top half of the events panel are too cluttered. Redesign them to be more compact and organized.

301 In the detail panel, have the nearby events section in the far left and hide it when the events panel is open. Think about a way to nicely solve that the events panel is openend/closed and at the same time the nearby events section is hidden/shown. What animation to use? Or maybe have the nearby events section have the same size as the detail panel, so it defacto becomes the events panel. The nearby events section must use all the vertical space available to show as many nearby events as possible, and also include the current event between them, with its title but with a different markup to differentiate it from the other events.

302 When going from one event to the next without scrubbing, have a nice short fade-out and fade-in animation of the title and annotation, and if opened the detail panel as well. 



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

