import { useCallback } from 'react';

export function useStopPlayback({ setPlaying, playTimeoutRef, playTimerRef }) {
  const stopPlayback = useCallback(() => {
    setPlaying(false);
    if (playTimeoutRef.current) {
      clearTimeout(playTimeoutRef.current);
      playTimeoutRef.current = null;
    }
    if (playTimerRef.current) {
      clearInterval(playTimerRef.current);
      playTimerRef.current = null;
    }
  }, [setPlaying, playTimeoutRef, playTimerRef]);

  return { stopPlayback };
}