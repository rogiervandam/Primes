import { useCallback } from 'react';

export function useMinimapDetailHeight({ isDetailOpenRef, detailHeightRef }) {
  const getMinimapDetailH = useCallback(() => {
    const panelEl = document.querySelector('.detail-panel');
    if (panelEl) {
      const rect = panelEl.getBoundingClientRect();
      if (rect.height > 0) return Math.round(rect.height);
    }
    return isDetailOpenRef.current ? detailHeightRef.current : 36;
  }, [isDetailOpenRef, detailHeightRef]);

  return { getMinimapDetailH };
}