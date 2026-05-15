import { useCallback } from 'react';

export function useStopPlayback({ setPlaying, playTimeoutRef, repeatDelayTimeoutRef, playTimerRef }) {
  const stopPlayback = useCallback(() => {
    setPlaying(false);
    if (playTimeoutRef.current) {
      clearTimeout(playTimeoutRef.current);
      playTimeoutRef.current = null;
    }
    if (repeatDelayTimeoutRef?.current) {
      clearTimeout(repeatDelayTimeoutRef.current);
      repeatDelayTimeoutRef.current = null;
    }
    if (playTimerRef.current) {
      clearInterval(playTimerRef.current);
      playTimerRef.current = null;
    }
  }, [setPlaying, playTimeoutRef, repeatDelayTimeoutRef, playTimerRef]);

  return { stopPlayback };
}