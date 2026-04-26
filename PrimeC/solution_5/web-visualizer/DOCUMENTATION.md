# Sieve Visualizer — Technical Documentation

## Table of Contents

1. [Event Timeline](#event-timeline)
2. [Animation Speed Controls](#animation-speed-controls)
3. [Timing Plan Algorithm](#timing-plan-algorithm)
4. [Per-bit Interval with Pinned Bits (Slow-Down)](#per-bit-interval-with-pinned-bits)
5. [Timeline Slider Implementation](#timeline-slider-implementation)
6. [Pinned Bit Balloons](#pinned-bit-balloons)
7. [Balloon Layout Algorithm](#balloon-layout-algorithm)

---

## Event Timeline

The event timeline is the scrub slider inside the per-event widget (labelled **Timeline** in the UI). It shows what fraction of the current event's animation has played and lets the user scrub to any position.

### State and refs

| Symbol | Type | Purpose |
|---|---|---|
| `stepScrubProgress` | `useState(0)` | 0–100 integer displayed in the slider and label |
| `stepScrubProgressRef` | `useRef(setStepScrubProgress)` | Stable ref so animation closures can call `setStepScrubProgress` without stale captures |
| `stepAnimRunning` | `useState(false)` | True while a bit-reveal or mask-stamp animation is in flight |
| `seqSliderRafRef` | `useRef(null)` | rAF id for the continuous 60 fps slider update loop during sequential reveals |
| `seqTimerRef` | `useRef(null)` | `setTimeout` id for the current bit-reveal tick |

### Slider update during sequential reveal

When a sequential (or bounce) animation runs, a **requestAnimationFrame loop** updates the slider independently of the bit-reveal timer:

```
seqTiming.startMs   ← set synchronously before the first setTimeout(revealNext)
estimatedRevealMs   = totalRevealSteps × effectiveBitInterval
estimatedTotalMs    = estimatedRevealMs + delayMs   (= reveal phase + inter-cycle pause)

each rAF frame:
  elapsed     = performance.now() − seqTiming.startMs + resumeOffset
  uiProgress  = clamp(elapsed / estimatedTotalMs, 0, 1)
  slider      = round(uiProgress × 100)
```

The slider maps over the **full cycle** (`estimatedTotalMs`) so that events with very few changed bits (even 1) show visible, smooth movement. For example, with 1 bit at the default 20 ms/bit interval and a 500 ms repeat delay, the full cycle is 520 ms — enough for smooth 0→100 % progress over ~31 rAF frames.

`seqTiming.startMs` is set **synchronously in the Promise executor** (just before `setTimeout(revealNext, …)`), so by the time the first rAF callback fires the start time is already valid. This avoids the slider freezing during the initial bit-reveal timeout.

### Resume offset

When the user resumes from a scrubbed position, the rAF loop pre-offsets the start time so the slider begins at the correct fraction:

```
resumeTimeFraction  = requestedStart / totalRevealSteps
resumeOffset        = resumeTimeFraction × estimatedTotalMs
```

### Slider update during mask-stamp animation

The mask-stamp animation runs a separate rAF loop inside `runMaskStampAnimation`. Each tick computes `t = virtualMs / duration` (where `virtualMs` advances proportionally to `bitIntervalMs`) and calls `stepScrubProgressRef.current(round(t × 100))` directly. No separate rAF is needed.

### Scrubbing (seeking)

`seekStepAnimation(progress: 0..1)` handles manual scrubbing:

1. Calls `stopPlayback()` and `stopSeqAnim()` to cancel any running animation.
2. Sets `animationReplayPaused = true`.
3. For **bit mode**: rolls back `bitState` to the state just before the current step, then applies bits `[0 .. floor(progress × bitCount)]`. Renders the frozen partial state.
4. For **mask/combined mode**: renders the mask-stamp animation frozen at `progress` via `runMaskStampAnimation({ startProgress: progress, … })`.

---

## Animation Speed Controls

Speed is exposed to the user as a logarithmic slider (0–100) that maps to a `bitAnimInterval` in milliseconds. Faster = lower interval.

### Global interval

`bitAnimInterval` (state, default **20 ms**) controls the per-bit delay in sequential mode. It is mirrored into `currentAnimIntervalRef` via a `useEffect` so animation callbacks always read the latest value without re-creating closures.

### Slower / Faster buttons

The toolbar `−` and `+` buttons multiply `bitAnimInterval` by a fixed factor. The event widget **Speed** slider maps:

```
sliderValue (0..100) → bitAnimInterval via logarithmic interpolation:
  log_max  = log(500)   // 500 ms at slider 0
  log_min  = log(5)     // 5 ms at slider 100
  interval = exp(log_max − (sliderValue / 100) × (log_max − log_min))
```

This keeps the mid-point of the slider near 50 ms rather than cramming all "useful" range into the top 10 %.

### Playback speed (`playSpeed`)

When the top-bar play button is active, `playSpeed` (default **500 ms**) sets the target cycle duration for each step. `triggerAnimation` receives `playbackDurationMs = playSpeed` and computes:

```
requestedAnimationDuration = max(120, playSpeed − delayMs)
```

The timing plan then spreads the bit reveals over `requestedAnimationDuration`.

---

## Timing Plan Algorithm

`getAnimationTimingPlan(bitCount, options)` returns an object `{ startInterval, endInterval, accelerateAfter, totalDuration, exponential? }` or `null`.

The plan is only computed when `options.adaptiveDuration = true`.

### Inputs

| Input | Description |
|---|---|
| `bitCount` | Number of bits being revealed |
| `options.durationMs` | Explicit requested duration (overrides everything else) |
| `options.preferredIntervalMs` | Preferred per-bit interval (falls back to `currentAnimIntervalRef`) |
| `options.maxDurationEnabled` | Whether the max-duration cap is active |
| `options.maxDurationMs` | Cap in ms (default 8 000 ms, range 2 000–30 000) |
| `options.pinnedBitIndices` | Array of pinned bit positions; extends `maxTotal` by 2 000 ms per pin |

### Logic

```
preferredTotal = bitCount × preferredInterval
minTotal       = adaptiveDuration ? max(900, min(2400, configuredMax × 0.35)) : 2800
maxTotal       = configuredMax + pinnedBitCount × 2000

if (explicit durationMs):
    interval = max(5, durationMs / bitCount)
    → constant plan at that interval

if (preferredTotal ≤ minTotal):
    interval = minTotal / bitCount
    → constant plan, slower than preferred to reach minTotal

if (preferredTotal ≤ maxTotal):
    → constant plan at preferredInterval

else (preferredTotal > maxTotal):
    → exponential acceleration plan:
        accelerateAfter = 0.24..0.72   (proportion of bits at startInterval)
        front = floor(bitCount × accelerateAfter) bits at startInterval
        tail  = remaining bits interpolated from startInterval → endInterval
        endInterval ≈ startInterval × 0.18 (minimum 3 ms)
```

The final estimated duration is clamped to `[minTotal, maxTotal]`.

### `getAnimationBitInterval`

Returns the effective per-bit interval for the **first** bit of the plan (`plan.startInterval`). This is what `estimatedRevealMs` uses: it represents a conservative upper bound for multi-bit events (where later bits accelerate) but is exact for single-bit events.

---

## Per-bit Interval with Pinned Bits

`getCurrentLoopInterval(fallback, options, progress, focusBit)` computes the actual `setTimeout` delay for **each individual bit reveal tick**. When pinned bits are present it slows down the animation near them so the user can watch those specific positions.

### Algorithm

```
baseInterval  = plan ? plan.startInterval (or exponential interpolation at progress)
              : currentAnimIntervalRef

if no pinned bits:
    return baseInterval

groupBits     = options.groupBits ?? 64
focusGroup    = floor(focusBit / groupBits)

for each pinnedBit:
    pinnedGroup = floor(pinnedBit / groupBits)
    dist        = |focusGroup − pinnedGroup|
    slowFactor  = dist=0 → 1.70
                  dist=1 → 1.35
                  dist=2 → 1.18
                  dist≥3 → 1.00   (no effect)

return baseInterval × max(slowFactor across all pins)
```

The slowing only applies while the animation focus is within 2 groups of a pinned bit. Groups are aligned 64-bit words by default, matching the sieve's vectorised processing units.

**Effect on animation cap**: `maxTotal` is extended by `pinnedBitCount × 2000 ms` in `getAnimationTimingPlan` so the slowdown doesn't cut the animation short before all pinned regions have been traversed slowly.

---

## Timeline Slider Implementation

### Play/pause button logic

The event widget has a single play/pause button. Its displayed icon follows:

```
show Pause icon  when:  stepAnimRunning
                     OR (!animationReplayPaused && !playing && selectedSteps.size === 0)
                        ↑ auto-replay loop is active (between iterations)

show Play icon   otherwise (animation is explicitly paused)
```

This prevents the icon toggling rapidly between iterations of the auto-replay loop (which briefly sets `stepAnimRunning = false` between one cycle completing and the next starting).

### Auto-replay loop (per-step, not global play)

When a single step is selected and global play is not active, `pausedStepAnimLoop` (a `useEffect`) continuously repeats the step animation:

1. Calls `triggerAnimation(changed, { adaptiveDuration: false, startIndex, startProgress })`.
2. `await`s completion.
3. Schedules the next iteration via `setTimeout(loop, 0)` (which respects `waitForDelay(delayMs)` inside `triggerAnimation`).
4. Stops if `animationReplayPaused`, `playing`, or `selectedSteps.size > 0` becomes true.

Clicking pause calls `freezeAnimationNow()` which:
- Cancels the seq timer (`seqTimerRef`).
- Cancels the slider rAF (`seqSliderRafRef`).
- Cancels any ripple/viewport animations.
- Calls `setAnimationReplayPaused(true)`, parking the loop.
- Renders one final frozen frame.

---

## Pinned Bit Balloons

Clicking a bit on the grid **toggles** a pinned balloon for that bit. Clicking an empty area clears all pins. Double-clicking a bit replaces all existing pins with just that one bit.

### Data model

```
pinnedBitIndices: number[]   // bit indices (0-based) with locked-open balloons
hoveredBitInfo:   { bitIndex } | null   // transient hover balloon
```

A hover balloon is suppressed when its bit is already pinned.

### Balloon content

Each balloon (`bit-history-panel`) shows:

- **Bit index** and the corresponding **candidate number** it represents (via `bitToNumber(idx, sieveMetadata)`).
- Index breakdown: byte offset, bit-in-byte; uint32 word, bit-in-word; uint64 qword; cache-line number.
- **Full history**: a table of every step that has modified this bit (step index, operation, prime factor). Clicking a history row selects that step.

### Geometry — `getBitBalloonGeometry(bitIndex)`

Converts the bit's canvas position to viewport coordinates:

```
canvasPos       = renderer.bitIndexToCanvas(bitIndex)   // canvas pixel coords
anchorX/Y       = containerRect.topLeft + canvasPos − canvasPanOffset
bitHalf         = max(2.5, pixelSize × zoom × 0.52)     // half-size of the bit cell

// Horizontal clamp: stays between the step panel edge and the settings sidebar
sideInsetLeft  = stepsPanelCollapsed ? 80 : panelWidth + 32
sideInsetRight = settingsCollapsed ? 48 : 360
clampedLeft    = clamp(anchorX, sideInsetLeft + 170, innerWidth − sideInsetRight − 170)

// Vertical clamp: stays below the toolbar and above the detail panel
detailPad      = detailOpen ? detailHeight + 22 : 56
clampedTop     = clamp(anchorY − 12, 96, innerHeight − detailPad)

anchorInsideGrid = anchorX and anchorY are within the container rect (with 4 px margin)
```

If `anchorInsideGrid = false` (the bit has been panned off-screen), the balloon is hidden via the `clipped` CSS class.

---

## Balloon Layout Algorithm

`getVisibleBalloonStyles(items)` computes non-overlapping positions for **all** active balloons simultaneously. It runs every time the balloon layout tick increments (scheduled via `scheduleBalloonRelayout()` which debounces to one rAF per frame).

### Inputs

`items` is a sorted array of `{ kind: 'pinned'|'hover', bitIndex }`, sorted top-to-bottom by anchor Y then anchor X.

### Algorithm

```
approxWidth  = 320 px
approxHeight = 238 px
margin       = 18 px

overlayRects = getBoundingClientRect() of:
    .toolbar, .step-panel:not(.collapsed),
    .settings-sidebar:not(.collapsed),
    .detail-panel.open, .timing-panel

toolbarBottom = max bottom edge of all rects touching top ≤ 4 px

placed = []   // already-placed boxes this pass

for each item (in top-to-bottom order):
    geom = getBitBalloonGeometry(item.bitIndex)

    candidates = [
        { anchorX,        anchorY − 12 },          // directly above
        { anchorX − 180,  anchorY − 22 },           // upper-left
        { anchorX + 180,  anchorY − 22 },           // upper-right
        { anchorX,        anchorY − 56 },           // further up
        { anchorX − 220,  anchorY − 64 },           // far upper-left
        { anchorX + 220,  anchorY − 64 },           // far upper-right
    ]

    chosen = first candidate whose bounding box does NOT overlap any:
        - box in `placed` (with 18 px margin)
    
    if no candidate fits:
        direction = alternating ±1 based on placed.length
        chosen = { anchorX + direction × (120 + placed.length × 18),
                   anchorY − 68 − placed.length × 10 }

    clamp chosen.left to [panelEdge + 200, innerWidth − sidebarEdge − 170]
    clamp chosen.top  to [max(96, toolbarBottom + approxHeight + 8), ∞]

    visibility check:
        overlaps  = chosen box intersects any overlayRect by > 12 px on both axes
        offscreen = box extends > 4 px outside the viewport
        hidden    = overlaps || offscreen || anchorInsideGrid === false

    record box in `placed`
    result[key] = { visible, panelStyle: { left: chosen.left, top: chosen.top } }
```

A CSS transition on `.bit-history-panel` (`opacity`, `transform`) animates the hide/show so balloons that need to be repositioned fade out and in rather than jumping.

### Balloon relayout triggers

`scheduleBalloonRelayout()` is called on:
- Window resize.
- Zoom or pan of the canvas.
- Open/close of any panel (steps panel, settings sidebar, detail panel).
- Any change to `pinnedBitIndices`.
