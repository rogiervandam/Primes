import { useCallback } from 'react';

export function useMinimapAvailability({
  rendererRef,
  containerRef,
  isMinimapVisible,
  setIsMinimapAvailable,
}) {
  const updateMinimapAvailability = useCallback(() => {
    const r = rendererRef.current;
    if (!r) return;
    const viewportW = r.viewportW || (containerRef.current?.clientWidth ?? 0);
    const viewportH = r.viewportH || (containerRef.current?.clientHeight ?? 0);
    const fullyVisible = viewportW > 0 && viewportH > 0 ? r.isContentFullyVisible(viewportW, viewportH) : false;
    const available = isMinimapVisible !== false && !fullyVisible;
    r.minimapEnabled = available;
    setIsMinimapAvailable(available);
    if (!available) r.minimapRenderer._rect = null;
  }, [rendererRef, containerRef, isMinimapVisible, setIsMinimapAvailable]);

  return { updateMinimapAvailability };
}