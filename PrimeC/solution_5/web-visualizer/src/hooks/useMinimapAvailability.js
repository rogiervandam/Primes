import { useCallback } from 'react';

export function useMinimapAvailability({
  rendererRef,
  containerRef,
  showMinimap,
  setMinimapAvailable,
}) {
  const updateMinimapAvailability = useCallback(() => {
    const r = rendererRef.current;
    if (!r) return;
    const viewportW = r.viewportW || (containerRef.current?.clientWidth ?? 0);
    const viewportH = r.viewportH || (containerRef.current?.clientHeight ?? 0);
    const fullyVisible = viewportW > 0 && viewportH > 0 ? r.isContentFullyVisible(viewportW, viewportH) : false;
    const available = showMinimap !== false && !fullyVisible;
    r.minimapEnabled = available;
    setMinimapAvailable(available);
    if (!available) r.minimapRenderer._rect = null;
  }, [rendererRef, containerRef, showMinimap, setMinimapAvailable]);

  return { updateMinimapAvailability };
}