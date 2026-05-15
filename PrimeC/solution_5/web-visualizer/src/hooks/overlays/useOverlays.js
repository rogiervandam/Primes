/**
 * useOverlays — owns canvas-overlay toggle state.
 *
 * Owns:
 *  - isHeatMapEnabled / cachelineAnnotation
 *  - isPrimeOverlayEnabled
 *  - isRangeOverlayEnabled / rangeOverlayStart / rangeOverlayEnd / rangeOverlayUnit
 *  - isMultiplesOverlayEnabled / multiplesOverlayPrime
 *  - cachelineSize / cachePreset
 */
import { useState } from 'react';

export function useOverlays() {
  const [isHeatMapEnabled, setIsHeatMapEnabled] = useState(false);
  // 'none' | 'hits' | 'age' | 'both'
  const [cachelineAnnotation, setCachelineAnnotation] = useState('none');
  const [isPrimeOverlayEnabled, setIsPrimeOverlayEnabled] = useState(false);
  const [isRangeOverlayEnabled, setIsRangeOverlayEnabled] = useState(false);
  const [rangeOverlayStart, setRangeOverlayStart] = useState(0);
  const [rangeOverlayEnd, setRangeOverlayEnd] = useState(0);
  // 'bits' | 'bytes' | 'groups' | 'numbers' — display/input unit for the range overlay
  const [rangeOverlayUnit, setRangeOverlayUnit] = useState('bits');
  const [isMultiplesOverlayEnabled, setIsMultiplesOverlayEnabled] = useState(false);
  const [multiplesOverlayPrime, setMultiplesOverlayPrime] = useState(3);
  const [multiplesOverlayMode, setMultiplesOverlayMode] = useState('number');  // item 425: 'number' | 'bit'
  // item 426: bits grid view — {changed, targeted, alreadySet, newlySet} boolean flags (multi-select)
  const [bitsGridView, setBitsGridView] = useState({});
  const [cachelineSize, setCachelineSize] = useState(64);
  const [cachePreset, setCachePreset] = useState('fixed');

  return {
    isHeatMapEnabled, setIsHeatMapEnabled,
    cachelineAnnotation, setCachelineAnnotation,
    isPrimeOverlayEnabled, setIsPrimeOverlayEnabled,
    isRangeOverlayEnabled, setIsRangeOverlayEnabled,
    rangeOverlayStart, setRangeOverlayStart,
    rangeOverlayEnd, setRangeOverlayEnd,
    rangeOverlayUnit, setRangeOverlayUnit,
    isMultiplesOverlayEnabled, setIsMultiplesOverlayEnabled,
    multiplesOverlayPrime, setMultiplesOverlayPrime,
    multiplesOverlayMode, setMultiplesOverlayMode,  // item 425
    bitsGridView, setBitsGridView,  // item 426
    cachelineSize, setCachelineSize,
    cachePreset, setCachePreset,
  };
}
