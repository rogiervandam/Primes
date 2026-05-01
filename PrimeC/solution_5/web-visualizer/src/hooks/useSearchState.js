import { useState, useCallback, useEffect } from 'react';
import { bitToNumber, numberToBit } from '../SieveRenderer';

/**
 * Manages search-box state and the "navigate-to-bit" search handler.
 *
 * @param {object} opts
 * @param {React.MutableRefObject} opts.rendererRef  - ref to the live SieveRenderer
 * @param {function} opts.navigateToBit              - animated viewport fly-to
 * @param {string}   opts.storageModel               - current storage model key
 * @param {object}   opts.wheelDefinition            - optional wheel mapping metadata
 * @param {function} opts.getMinimapDetailH          - returns the current detail-panel height for minimap
 *
 * @returns {{ searchQuery, setSearchQuery, searchResult, searchOpen, setSearchOpen, handleSearch }}
 */
export function useSearchState({ rendererRef, navigateToBit, storageModel, wheelDefinition, getMinimapDetailH }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);

  const handleSearch = useCallback((query) => {
    const r = rendererRef.current;
    if (!r || !query.trim()) {
      setSearchResult(null);
      r?.clearSearchHighlight();
      r?.render();
      if (r) r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
      return;
    }

    const q = query.trim().toLowerCase();
    let bitIdx = -1;
    let targetKind = 'bit';
    let highlightIndex = -1;

    // Parse: "bit N", "byte N", "uint32 N", "uint64 N", "vector N", "number N", or just a plain number
    const m = q.match(/^(bit|byte|uint32|uint64|vector|number|num|#)?\s*(\d+)$/);
    if (!m) {
      r.clearSearchHighlight();
      r.render();
      r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
      setSearchResult('Invalid query');
      return;
    }

    const type = m[1] || '';
    const val = parseInt(m[2], 10);

    switch (type) {
      case 'bit':
        targetKind = 'bit';
        bitIdx = val;
        highlightIndex = val;
        break;
      case 'byte':
        targetKind = 'byte';
        bitIdx = val * 8;
        highlightIndex = val;
        break;
      case 'uint32':
        targetKind = 'uint32';
        bitIdx = val * 32;
        highlightIndex = val;
        break;
      case 'uint64':
        targetKind = 'uint64';
        bitIdx = val * 64;
        highlightIndex = val;
        break;
      case 'vector':
        targetKind = 'vector';
        bitIdx = val * 64 * r.vectorGroup;
        highlightIndex = val;
        break;
      case 'number': case 'num': case '#':
        targetKind = 'bit';
        bitIdx = numberToBit(val, storageModel, wheelDefinition);
        if (bitIdx < 0) {
          r.clearSearchHighlight();
          r.render();
          r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
          setSearchResult('Not representable in this storage model');
          return;
        }
        highlightIndex = bitIdx;
        break;
      default:
        // Plain number — treat as bit index
        targetKind = 'bit';
        bitIdx = val;
        highlightIndex = val;
    }

    if (bitIdx < 0 || bitIdx >= r.bitCount) {
      r.clearSearchHighlight();
      r.render();
      r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
      setSearchResult(`Out of range (0–${r.bitCount - 1})`);
      return;
    }

    const num = bitToNumber(bitIdx, storageModel, wheelDefinition);
    r.setSearchHighlight(targetKind, highlightIndex, bitIdx);
    navigateToBit(bitIdx, targetKind);
    r.render();
    r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
    setSearchResult(`Bit ${bitIdx} -> Number ${num == null ? 'unmapped' : num}`);
  }, [rendererRef, navigateToBit, storageModel, wheelDefinition, getMinimapDetailH]);

  // Clear search highlight when the search box is closed
  useEffect(() => {
    const r = rendererRef.current;
    if (!r || searchOpen) return;
    r.clearSearchHighlight();
    r.render();
    r.renderMinimap(r.canvasWidth, r.canvas.height / (window.devicePixelRatio || 1), getMinimapDetailH());
    setSearchResult(null);
  }, [rendererRef, searchOpen, getMinimapDetailH]);

  return { searchQuery, setSearchQuery, searchResult, searchOpen, setSearchOpen, handleSearch };
}
