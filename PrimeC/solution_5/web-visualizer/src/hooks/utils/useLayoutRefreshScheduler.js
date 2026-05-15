import { useCallback } from 'react';

export function useLayoutRefreshScheduler({
  layoutRefreshTimeoutRef,
  layoutRefreshRaf1Ref,
  layoutRefreshRaf2Ref,
}) {
  const clearScheduledLayoutRefresh = useCallback(() => {
    if (layoutRefreshTimeoutRef.current != null) {
      clearTimeout(layoutRefreshTimeoutRef.current);
      layoutRefreshTimeoutRef.current = null;
    }
    if (layoutRefreshRaf1Ref.current != null) {
      cancelAnimationFrame(layoutRefreshRaf1Ref.current);
      layoutRefreshRaf1Ref.current = null;
    }
    if (layoutRefreshRaf2Ref.current != null) {
      cancelAnimationFrame(layoutRefreshRaf2Ref.current);
      layoutRefreshRaf2Ref.current = null;
    }
  }, [layoutRefreshTimeoutRef, layoutRefreshRaf1Ref, layoutRefreshRaf2Ref]);

  const schedulePostLayoutRefresh = useCallback((anchor = null) => {
    void anchor;
    layoutRefreshRaf1Ref.current = requestAnimationFrame(() => {
      layoutRefreshRaf2Ref.current = requestAnimationFrame(() => {
      });
    });
    layoutRefreshTimeoutRef.current = setTimeout(() => {
    }, 210);
  }, [layoutRefreshTimeoutRef, layoutRefreshRaf1Ref, layoutRefreshRaf2Ref]);

  return { clearScheduledLayoutRefresh, schedulePostLayoutRefresh };
}