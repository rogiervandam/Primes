import { useCallback } from 'react';

export function useDetailPanelStateSync({
  isDetailOpenRef,
  setIsDetailOpen,
  setIsDetailHeaderHidden,
  detailHeightRef,
  setDetailHeight,
}) {
  const updateDetailOpen = useCallback((val) => {
    const next = typeof val === 'function' ? val(isDetailOpenRef.current) : val;
    isDetailOpenRef.current = next;
    // item 200: always reveal the header when the panel opens (header can get
    // hidden after a drag-close; without this reset it would stay hidden)
    if (next) setIsDetailHeaderHidden(false);
    setIsDetailOpen(next);
  }, [isDetailOpenRef, setIsDetailOpen, setIsDetailHeaderHidden]);

  const updateDetailHeight = useCallback((val) => {
    detailHeightRef.current = val;
    setDetailHeight(val);
  }, [detailHeightRef, setDetailHeight]);

  return { updateDetailOpen, updateDetailHeight };
}