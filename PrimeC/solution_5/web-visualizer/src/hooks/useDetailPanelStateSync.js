import { useCallback } from 'react';

export function useDetailPanelStateSync({
  isDetailOpenRef,
  setIsDetailOpen,
  detailHeightRef,
  setDetailHeight,
}) {
  const updateDetailOpen = useCallback((val) => {
    const next = typeof val === 'function' ? val(isDetailOpenRef.current) : val;
    isDetailOpenRef.current = next;
    setIsDetailOpen(next);
  }, [isDetailOpenRef, setIsDetailOpen]);

  const updateDetailHeight = useCallback((val) => {
    detailHeightRef.current = val;
    setDetailHeight(val);
  }, [detailHeightRef, setDetailHeight]);

  return { updateDetailOpen, updateDetailHeight };
}