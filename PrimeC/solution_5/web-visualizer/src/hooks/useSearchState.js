import { useState, useCallback, useEffect } from 'react';
import { bitToNumber, numberToBit } from '../renderer/SieveRenderer.js';

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
 * @returns {{ searchQuery, setSearchQuery, searchResult, isSearchOpen, setIsSearchOpen, handleSearch }}
 */
export function useSearchState({ rendererRef, navigateToBit, storageModel, wheelDefinition, getMinimapDetailH, activateRangeOverlay }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handleSearch = useCallback((query) => {
    const r = rendererRef.current;
    if (!r || !query.trim()) {
      setSearchResult(null);
      r?.clearSearchHighlight();
      r?.render();
      if (r) r.renderMinimap(r.canvasWidth, r.canvasHeight || 0, getMinimapDetailH());
      return;
    }

    const q = query.trim().toLowerCase();
    let bitIdx = -1;
    let targetKind = 'bit';
    let highlightIndex = -1;

    // ── Range query: "bits N-M", "byte N-M", "uint32 N-M", "group N-M", etc. ─
    const rangeRe = /^(bits?|bytes?|uint32|uint64|vector|numbers?|num|group)?\s*(\d+)\s*[-–]\s*(\d+)$/;
    const rm = q.match(rangeRe);
    if (rm) {
      const rtype = rm[1] ? rm[1].replace(/s$/, '') : 'bit'; // normalise plural
      const from  = parseInt(rm[2], 10);
      const to    = parseInt(rm[3], 10);
      const lo    = Math.min(from, to);
      const hi    = Math.max(from, to);
      let startBit, endBit;

      switch (rtype) {
        case 'bit':    startBit = lo;       endBit = hi;                                 break;
        case 'byte':   startBit = lo * 8;   endBit = (hi + 1) * 8   - 1;               break;
        case 'uint32': startBit = lo * 32;  endBit = (hi + 1) * 32  - 1;               break;
        case 'uint64': startBit = lo * 64;  endBit = (hi + 1) * 64  - 1;               break;
        case 'vector': startBit = lo * 64 * (r.vectorGroup || 1); endBit = (hi + 1) * 64 * (r.vectorGroup || 1) - 1; break;
        case 'number': case 'num': {
          const sb = numberToBit(lo, storageModel, wheelDefinition);
          const eb = numberToBit(hi, storageModel, wheelDefinition);
          if (sb < 0 || eb < 0) {
            r.clearSearchHighlight(); r.render();
            r.renderMinimap(r.canvasWidth, r.canvasHeight || 0, getMinimapDetailH());
            setSearchResult('Not representable in this storage model'); return;
          }
          startBit = Math.min(sb, eb); endBit = Math.max(sb, eb); break;
        }
        case 'group': {
          const gb = r._logicalGroupBits?.() || 64;
          startBit = lo * gb; endBit = (hi + 1) * gb - 1; break;
        }
        default: startBit = lo; endBit = hi;
      }

      startBit = Math.max(0, startBit);
      endBit   = Math.min(r.bitCount - 1, endBit);
      if (startBit > endBit || startBit >= r.bitCount) {
        r.clearSearchHighlight(); r.render();
        r.renderMinimap(r.canvasWidth, r.canvasHeight || 0, getMinimapDetailH());
        setSearchResult(`Out of range (0–${r.bitCount - 1})`); return;
      }

      r.clearSearchHighlight(); r.render();
      r.renderMinimap(r.canvasWidth, r.canvasHeight || 0, getMinimapDetailH());
      activateRangeOverlay?.(startBit, endBit);
      setSearchResult(`Bits ${startBit}–${endBit}`);
      return;
    }

    // ── Single group query: "group N" ─────────────────────────────────────
    const groupM = q.match(/^group\s+(\d+)$/);
    if (groupM) {
      const g  = parseInt(groupM[1], 10);
      const gb = r._logicalGroupBits?.() || 64;
      const startBit = Math.max(0, g * gb);
      const endBit   = Math.min(r.bitCount - 1, (g + 1) * gb - 1);
      if (startBit >= r.bitCount) {
        r.clearSearchHighlight(); r.render();
        r.renderMinimap(r.canvasWidth, r.canvasHeight || 0, getMinimapDetailH());
        setSearchResult(`Out of range (0–${Math.floor((r.bitCount - 1) / gb)})`); return;
      }
      r.clearSearchHighlight(); r.render();
      r.renderMinimap(r.canvasWidth, r.canvasHeight || 0, getMinimapDetailH());
      activateRangeOverlay?.(startBit, endBit);
      setSearchResult(`Group ${g}: bits ${startBit}–${endBit}`);
      return;
    }

    // Parse: "bit N", "byte N", "uint32 N", "uint64 N", "vector N", "number N", or just a plain number
    const m = q.match(/^(bit|byte|uint32|uint64|vector|number|num|#)?\s*(\d+)$/);
    if (!m) {
      r.clearSearchHighlight();
      r.render();
      r.renderMinimap(r.canvasWidth, r.canvasHeight || 0, getMinimapDetailH());
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
          r.renderMinimap(r.canvasWidth, r.canvasHeight || 0, getMinimapDetailH());
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
      r.renderMinimap(r.canvasWidth, r.canvasHeight || 0, getMinimapDetailH());
      setSearchResult(`Out of range (0–${r.bitCount - 1})`);
      return;
    }

    const num = bitToNumber(bitIdx, storageModel, wheelDefinition);
    r.setSearchHighlight(targetKind, highlightIndex, bitIdx);
    navigateToBit(bitIdx, targetKind);
    r.render();
    r.renderMinimap(r.canvasWidth, r.canvasHeight || 0, getMinimapDetailH());
    setSearchResult(`Bit ${bitIdx} -> Number ${num == null ? 'unmapped' : num}`);
  }, [rendererRef, navigateToBit, storageModel, wheelDefinition, getMinimapDetailH, activateRangeOverlay]);

  // Clear search highlight when the search box is closed
  useEffect(() => {
    const r = rendererRef.current;
    if (!r || isSearchOpen) return;
    r.clearSearchHighlight();
    r.render();
    r.renderMinimap(r.canvasWidth, r.canvasHeight || 0, getMinimapDetailH());
    setSearchResult(null);
  }, [rendererRef, isSearchOpen, getMinimapDetailH]);

  return { searchQuery, setSearchQuery, searchResult, isSearchOpen, setIsSearchOpen, handleSearch };
}
