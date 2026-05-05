import { useCallback } from 'react';

export function usePausableDelay({ globalPausedRef, seqTimerRef }) {
  const waitForDelay = useCallback((ms) => {
    if (ms <= 0) return Promise.resolve();
    return new Promise((resolve) => {
      let remaining = ms;
      let prev = performance.now();
      const tick = (now) => {
        const dt = now - prev;
        prev = now;
        if (!globalPausedRef.current) remaining -= dt;
        if (remaining <= 0) {
          seqTimerRef.current = null;
          resolve();
          return;
        }
        seqTimerRef.current = requestAnimationFrame(tick);
      };
      seqTimerRef.current = requestAnimationFrame(tick);
    });
  }, [globalPausedRef, seqTimerRef]);

  return { waitForDelay };
}