/**
 * useOverlays — owns canvas-overlay toggle state.
 *
 * Owns:
 *  - heatMapEnabled / cachelineAnnotation
 *  - primeOverlayEnabled
 *  - rangeOverlayEnabled / rangeOverlayStart / rangeOverlayEnd
 *  - multiplesOverlayEnabled / multiplesOverlayPrime
 *  - cachelineSize / cachePreset
 */
import { useState } from 'react';

export function useOverlays() {
  const [heatMapEnabled, setHeatMapEnabled] = useState(false);
  // 'none' | 'hits' | 'age' | 'both'
  const [cachelineAnnotation, setCachelineAnnotation] = useState('none');
  const [primeOverlayEnabled, setPrimeOverlayEnabled] = useState(false);
  const [rangeOverlayEnabled, setRangeOverlayEnabled] = useState(false);
  const [rangeOverlayStart, setRangeOverlayStart] = useState(0);
  const [rangeOverlayEnd, setRangeOverlayEnd] = useState(0);
  const [multiplesOverlayEnabled, setMultiplesOverlayEnabled] = useState(false);
  const [multiplesOverlayPrime, setMultiplesOverlayPrime] = useState(3);
  const [cachelineSize, setCachelineSize] = useState(64);
  const [cachePreset, setCachePreset] = useState('fixed');

  return {
    heatMapEnabled, setHeatMapEnabled,
    cachelineAnnotation, setCachelineAnnotation,
    primeOverlayEnabled, setPrimeOverlayEnabled,
    rangeOverlayEnabled, setRangeOverlayEnabled,
    rangeOverlayStart, setRangeOverlayStart,
    rangeOverlayEnd, setRangeOverlayEnd,
    multiplesOverlayEnabled, setMultiplesOverlayEnabled,
    multiplesOverlayPrime, setMultiplesOverlayPrime,
    cachelineSize, setCachelineSize,
    cachePreset, setCachePreset,
  };
}
