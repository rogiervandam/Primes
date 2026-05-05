import { useCallback } from 'react';

export function useDetailPanelStateSync({
  detailOpenRef,
  setDetailOpen,
  detailHeightRef,
  setDetailHeight,
}) {
  const updateDetailOpen = useCallback((val) => {
    const next = typeof val === 'function' ? val(detailOpenRef.current) : val;
    detailOpenRef.current = next;
    setDetailOpen(next);
  }, [detailOpenRef, setDetailOpen]);

  const updateDetailHeight = useCallback((val) => {
    detailHeightRef.current = val;
    setDetailHeight(val);
  }, [detailHeightRef, setDetailHeight]);

  return { updateDetailOpen, updateDetailHeight };
}