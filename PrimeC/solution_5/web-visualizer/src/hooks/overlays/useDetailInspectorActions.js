import { useCallback } from 'react';

export function useDetailInspectorActions({
  setDetailInspectorMode,
  setDetailInspectorQuery,
  setIsDetailInspectorOpen,
}) {
  const openDetailInspector = useCallback((mode = 'bits') => {
    // item 446: support targeted/alreadySet/newlySet modes in addition to bits/numbers
    const VALID_MODES = ['bits', 'numbers', 'targeted', 'alreadySet', 'newlySet'];
    setDetailInspectorMode(VALID_MODES.includes(mode) ? mode : 'bits');
    setDetailInspectorQuery('');
    setIsDetailInspectorOpen(true);
  }, [setDetailInspectorMode, setDetailInspectorQuery, setIsDetailInspectorOpen]);

  return { openDetailInspector };
}