import { useCallback } from 'react';
import { waitForDelay as waitForDelayHelper } from '../lib/animationHelpers';

export function usePausableDelay({ globalPausedRef, seqTimerRef }) {
  const waitForDelay = useCallback((ms) => (
    waitForDelayHelper(ms, { globalPausedRef, seqTimerRef })
  ), [globalPausedRef, seqTimerRef]);

  return { waitForDelay };
}