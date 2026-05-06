import { useCallback } from 'react';

export function useDetailInspectorActions({
  setDetailInspectorMode,
  setDetailInspectorQuery,
  setIsDetailInspectorOpen,
}) {
  const openDetailInspector = useCallback((mode = 'bits') => {
    setDetailInspectorMode(mode === 'numbers' ? 'numbers' : 'bits');
    setDetailInspectorQuery('');
    setIsDetailInspectorOpen(true);
  }, [setDetailInspectorMode, setDetailInspectorQuery, setIsDetailInspectorOpen]);

  return { openDetailInspector };
}