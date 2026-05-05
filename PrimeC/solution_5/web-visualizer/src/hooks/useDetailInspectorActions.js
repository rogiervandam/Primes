import { useCallback } from 'react';

export function useDetailInspectorActions({
  setDetailInspectorMode,
  setDetailInspectorQuery,
  setDetailInspectorOpen,
}) {
  const openDetailInspector = useCallback((mode = 'bits') => {
    setDetailInspectorMode(mode === 'numbers' ? 'numbers' : 'bits');
    setDetailInspectorQuery('');
    setDetailInspectorOpen(true);
  }, [setDetailInspectorMode, setDetailInspectorQuery, setDetailInspectorOpen]);

  return { openDetailInspector };
}