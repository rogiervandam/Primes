import { useCallback } from 'react';

export function useMinimapDetailHeight({ isDetailOpenRef, detailHeightRef }) {
  const getMinimapDetailH = useCallback(() => {
    let total = 0;
    const panelEl = document.querySelector('.detail-panel');
    if (panelEl) {
      const rect = panelEl.getBoundingClientRect();
      if (rect.height > 0) total = Math.round(rect.height);
    } else {
      total = isDetailOpenRef.current ? detailHeightRef.current : 36;
    }
    // item 472b: when the double timeline is docked it sits just above the
    // detail panel, so the minimap must also clear it.
    // The class `dtl-timeline-undocked` is present when the strip is floating
    // (in which case it does not consume bottom space).
    const dtlEl = document.querySelector('.double-timeline:not(.dtl-timeline-undocked)');
    if (dtlEl) {
      const dtlRect = dtlEl.getBoundingClientRect();
      if (dtlRect.height > 0) total += Math.round(dtlRect.height);
    }
    return total;
  }, [isDetailOpenRef, detailHeightRef]);

  return { getMinimapDetailH };
}