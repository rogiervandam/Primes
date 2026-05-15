import { useRef } from 'react';

/**
 * usePlaybackClock — owns the three refs that govern global playback
 * timing across the visualizer:
 *
 *   - `globalPausedRef`    Set by either the toolbar pause or the
 *                          banner pause. The reveal loop, mask
 *                          animation, `waitForDelay`, and the trace-
 *                          level scheduleNext all poll this and freeze
 *                          in place when true. Setting back to false
 *                          transparently resumes everything from where
 *                          it stopped.
 *
 *   - `seekGenRef`         Monotonically-increasing counter bumped by
 *                          `seekStepAnimation` every time the user
 *                          scrubs the timeline. `triggerAnimation`
 *                          captures the current value at entry and
 *                          aborts (without overwriting the canvas) if
 *                          the value changed by the time a new RAF tick
 *                          fires — i.e. the user scrubbed while the
 *                          animation was in flight.
 *
 *   - `animBusyUntilRef`   `performance.now()` deadline before which
 *                          the auto-play scheduler refuses to start the
 *                          next event. Keeps fast-mode from clobbering
 *                          a still-running animation.
 *
 * The hook intentionally returns the ref objects (not their `.current`
 * values) so that consumers continue to mutate `.current` directly —
 * exactly the same usage pattern as before this hook existed. There is
 * no behavioural change; this is purely a structural extraction so the
 * refs can be discovered and documented in one place.
 */
export function usePlaybackClock() {
  const globalPausedRef = useRef(false);
  const seekGenRef = useRef(0);
  const animBusyUntilRef = useRef(0);
  return { globalPausedRef, seekGenRef, animBusyUntilRef };
}

export default usePlaybackClock;
