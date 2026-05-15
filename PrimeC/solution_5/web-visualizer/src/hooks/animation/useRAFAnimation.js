import { useRef, useState, useCallback } from 'react';

/**
 * useRAFAnimation — a reusable requestAnimationFrame tween loop.
 *
 * The caller receives `{ value, start, cancel }`:
 *   - `value`  (number, 0..1) — current animation progress, driven by RAF.
 *   - `start({ from, to, duration, onDone? })` — begin or restart an animation.
 *   - `cancel()` — immediately stop the running animation (value stays put).
 *
 * The value exposed is a *React state*, so the component re-renders on
 * each frame while the animation is running.
 *
 * @returns {{ value: number, start: Function, cancel: Function }}
 */
export function useRAFAnimation() {
  const rafRef = useRef(null);
  const posRef = useRef(0);
  const [value, setValue] = useState(0);

  const cancel = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  /**
   * @param {object} options
   * @param {number} [options.from]      Start value (default: current value).
   * @param {number} [options.to=1]      End value.
   * @param {number} [options.duration]  Duration in ms (required).
   * @param {Function} [options.onDone]  Called when the animation completes.
   */
  const start = useCallback(({ from, to = 1, duration, onDone } = {}) => {
    cancel();

    const startVal = from !== undefined ? from : posRef.current;
    const endVal = to;
    const remaining = endVal > startVal
      ? (1 - (startVal - Math.min(startVal, endVal)) / Math.abs(endVal - startVal || 1)) * duration
      : duration;
    const effectiveDuration = Math.max(1, remaining);
    const startTime = performance.now();

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / effectiveDuration);
      const current = startVal + (endVal - startVal) * progress;
      posRef.current = current;
      setValue(current);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        posRef.current = endVal;
        setValue(endVal);
        rafRef.current = null;
        if (onDone) onDone();
      }
    };

    rafRef.current = requestAnimationFrame(animate);
  }, [cancel]);

  return { value, start, cancel };
}
