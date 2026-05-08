import { useCallback } from 'react';
import { buildCombinedSelectionOverlay as buildCombinedSelectionOverlayPure } from '../lib/selectionOverlay';

export function useSelectionOverlay({ steps }) {
  const buildCombinedSelectionOverlay = useCallback((selection) => {
    return buildCombinedSelectionOverlayPure(selection, steps);
  }, [steps]);

  return { buildCombinedSelectionOverlay };
}