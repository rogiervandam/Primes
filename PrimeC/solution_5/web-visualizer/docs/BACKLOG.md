# Backlog

Use this as the short product backlog. For maintenance strategy and completed
refactor history, read `docs/AI_MAINTENANCE.md`.

400 ✅ On startup don't show the double timeline until after the 2d-3d transform
401 ✅ The inspector for byte/group/cacheline doesn't work realiably when i click the grid. It seems to be off by one or two cells, and sometimes it doesn't show up at all. This makes it hard to analyze the events and marked numbers accurately. I need to investigate why this is happening and fix the issue as soon as possible.
402 ✅ on the settings - colors tab, the buttons to adjust the color stick to the bottom when scrolling the pane.
403 ✅ On startup/reload in mode 5-8, i sometimes get the message: "WebGL2 with OffscreenCanvas is required for rendering", whilke it is available.
404 ✅ Move the sources for panels into the visualizer folder, and import them from the right place. 
405 ✅ Make a testcase to run after every change for console errors on startup and when loading a trace, to catch any issues with the rendering or data processing early on. This way we can ensure that the visualizer is working correctly and providing a good user experience.
406 ✅ Update the AI-MAINTENANCE.md document with the latest refactor history and maintenance strategy. Remove any outdated information and add any new insights or best practices that we have learned during the refactor process. This way we can keep the document up-to-date and useful for future maintenance and development of the visualizer.
407 ✅ Change the icons on the toggles for panels on the double timeline floater to the same icons as the ones in the top bar, to create a more consistent and intuitive user interface. This way users can easily recognize the purpose of each toggle and understand how to use them to show or hide the different panels on the double timeline.

408 ✅ DONE Split the sieveRenderer.js into multiple files based on the different rendering modes (1-4, 5-8, etc.) and the different components (canvas, inspector, etc.). This way we can organize the code better and make it easier to maintain and extend in the future. We can also reduce the size of each file and improve readability by separating the concerns and responsibilities of each part of the rendering logic. When possible, put simple function on one line: e.g. 
_byteGapX() {  return this.layoutMetrics.byteGapX(); } to reduce the overall line count and make it easier to scan the code for important logic.

409 ✅ DONE The operation names in the events panel are hard to read. Use a darker color for the background of the text and a brighter color for the text itself, to improve the contrast and readability. This way users can easily identify the different operations and understand what is happening in each event without straining their eyes or getting confused by the colors.

410 ✅ DONE In the grid view - range, allow the user to choose between a range of numbers, bits, byte, groups, etc. This way users can analyze the events and marked numbers at different levels of granularity and see how they relate to each other. For example, they can switch to byte view to see how the bits are grouped together and how the events affect the bytes, or they can switch to group view to see how the bytes are grouped together and how the events affect the groups. This way users can gain a deeper understanding of the data and make more informed decisions based on their analysis.

411 ✅ DONE The parser and internals should make a distinction between Number ranges and Bit ranges: assume ranges mention bit indices. When byte is mentioned, it should be treated as a range of 8 bits starting at the byte index * 8. When word or vector is mentioned, search for mentions of uint16/32/64 and treat those as ranges of 16/32/64 bits starting at the index * (bits per unit). Or when mention of uint16v2/4/8 or uint32v2/4/8 or uint64v2/4/8, treat those as ranges of 16*2/4/8 or 32*2/4/8 or 64*2/4/8 bits starting at the index * (bits per unit * vector length). This way we can support more complex annotations and have a more consistent interpretation of ranges. When the spec mentions "numbers" or "factors" and the log annotation doesn't specify bits or bytes, we can take the mentioned range as a number range and try to infer the bit range from the context (e.g. if the event is "read 4 numbers" and the annotation says "offset 16, length 4", we can infer that it's probably 4 bytes starting at bit 128, so bits 128-159). This will require some changes to the parser and how it represents events and annotations internally, but it will make the system more flexible and powerful in handling different types of logs and annotations.

412 ✅ DONE The zone background  doesn't seem to work and the zone opacity only influances a small area on the far left and right of the timelines. 

413 ✅ DONE The toggle for the detail panel on the double timeline floater should also have a panel icon like on the top bar.

414 The annotation for an aggregate should also include the annotation text for the first event in the aggregate, to provide more context and information about the events that are grouped together. This way users can understand the significance of the aggregate and what it represents without having to look at each individual event. For example, if the first event in the aggregate is "read 4 numbers" with an annotation "offset 16, length 4", we can include that annotation in the aggregate annotation as well, so it would say something like "Aggregate of 4 events: read 4 numbers (offset 16, length 4)". This will make it easier for users to analyze the aggregates and understand their meaning and relevance to their analysis.

415 The detail panel should note if the range is about bits, byte, groups (specify kind) or numbers. 

416 When range grid view is on and seleting an event, multiple events or playing through events, the grad should display the range on the grid. The reset button for the range in the settings - layout panel should be a toggle between "user input" or "auto set". When set to "user input", the range should be set to the user input and not change when selecting events or playing through events. When set to "auto set", the range should automatically update to the range of the selected event or the current event when playing through events. This way users can choose whether they want to manually control the range or have it automatically adjust based on their interactions with the events.

417 ✅ The minimap isn't visible

418 When searching and entering a number that isn't mapped to a bit, the search should show a message like "number X is not mapped; nearest bit is Y" and offer to highlight that bit. This way users can still find relevant information even if they don't know the exact mapping of numbers to bits, and it can help them understand the relationships between numbers and bits in the context of the events and annotations.

419 The double timeline in floating has hard to read titles and annotations in light mode on the dark color presets. Make the color for these texts part of the user adjustable timeline colors and of the color presets, to ensure that they are always readable and fit well with the overall color scheme. Each color preset should have a version for light and dark mode, to ensure that the text is always readable and the visualizer is accessible to users with different preferences and needs. This way users can choose the color scheme that works best for them without sacrificing readability or usability.

420 In double timeline float mode, the toggle for the detail panel should als be visible and useable. 

421 The color of the timelines should not completely vanish when inactive, but just fade out a little bit to indicate that they are inactive but still visible. This way users can still see the timelines and their context even when they are not active, and it can help them understand the overall structure and flow of the events and annotations.

422 When de detail panel and events panel are open, i can't click on events that are on the same height as the details panel.

423 The double timeline when floating should not be in front of the detail panel, but above it. Reposition it when detail panel is openend. When the detail panel is open and the double timeline is dragged down into the detail panel, start the docking there.

424 The dragger for repeat mode is missing. There should be a dragger on the animation timeline to set the point at which the animation should loop back to the start. The dragger should be below the animation timeline scrubber. It should have an icon for "repeat" and should be toggleable between "repeat" and "no repeat". When in "repeat" mode, the animation should loop back to the point set by the dragger when it reaches the end (after the "delay between repeats" as set in the animation settings). When in repeat mode, the large play button in the dragger get a little repeat mode icon attached as well in the upper right of the circle. When in "no repeat" mode, the animation should stop at the end, wait for the "delay between events" and go to the next event. This way users can easily control whether they want the animation to loop or not, and they can set the loop point to focus on a specific part of the timeline.



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

