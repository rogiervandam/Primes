import { useCallback } from 'react';

export function useViewportAnimationCancel({ viewportAnimRef }) {
  const cancelViewportAnimation = useCallback(() => {
    if (viewportAnimRef.current) {
      cancelAnimationFrame(viewportAnimRef.current);
      viewportAnimRef.current = null;
    }
  }, [viewportAnimRef]);

  return { cancelViewportAnimation };
}