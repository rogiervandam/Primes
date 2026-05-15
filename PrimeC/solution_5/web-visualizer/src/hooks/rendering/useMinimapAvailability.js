import { useCallback, useRef } from 'react';

export function useMinimapAvailability({
  rendererRef,
  containerRef,
  isMinimapVisible,
  setIsMinimapAvailable,
}) {
  // item 255: use a ref so updateMinimapAvailability stays stable when minimap toggles.
  const isMinimapVisibleRef = useRef(isMinimapVisible);
  isMinimapVisibleRef.current = isMinimapVisible;

  const updateMinimapAvailability = useCallback(() => {
    const r = rendererRef.current;
    if (!r) return;
    const viewportW = r.viewportW || (containerRef.current?.clientWidth ?? 0);
    const viewportH = r.viewportH || (containerRef.current?.clientHeight ?? 0);
    const fullyVisible = viewportW > 0 && viewportH > 0 ? r.isContentFullyVisible(viewportW, viewportH) : false;
    const available = isMinimapVisibleRef.current !== false && !fullyVisible;
    r.minimapEnabled = available;
    setIsMinimapAvailable(available);
    if (!available) r.minimapRenderer._rect = null;
  }, [rendererRef, containerRef, setIsMinimapAvailable]); // isMinimapVisible read via ref (item 255)

  return { updateMinimapAvailability };
}