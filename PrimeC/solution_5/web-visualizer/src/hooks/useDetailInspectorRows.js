import { useMemo } from 'react';
import { bitToNumber, describeWheelBit } from '../SieveRenderer';

/**
 * Computes the rows shown in the detail inspector overlay from the current
 * step's changed bits, and filters them by the search query.
 *
 * @param {object} params
 * @param {object|null} params.currentStepData    - Current step data (may include changedBits)
 * @param {object}      params.layoutSettings     - Layout settings (vectorMode, vectorGroup, etc.)
 * @param {string}      params.storageModel       - Storage model ('half' | 'wheel' | etc.)
 * @param {object|null} params.wheelDefinition    - Wheel definition object or null
 * @param {number}      params.cachelineSize      - Cache line size in bytes
 * @param {string}      params.detailInspectorQuery - Filter query string
 * @param {string}      [params.detailInspectorMode] - Mode: 'bits'|'numbers'|'targeted'|'alreadySet'|'newlySet'
 * @param {Array}       [params.steps]            - All trace steps (items 224+225: for bit→event index)
 * @returns {{ detailInspectorRows, filteredDetailInspectorRows }}
 */
export function useDetailInspectorRows({
  currentStepData,
  layoutSettings,
  storageModel,
  wheelDefinition,
  cachelineSize,
  detailInspectorQuery,
  detailInspectorMode,  // item 446: 'bits'|'numbers'|'targeted'|'alreadySet'|'newlySet'
  steps,
}) {
  // items 224+225: build a Map<bit, stepIndex[]> across ALL steps so we know which events
  // changed each bit (not just the current step).
  const bitChangedByIndex = useMemo(() => {
    if (!steps || steps.length === 0) return new Map();
    const map = new Map();
    for (let idx = 0; idx < steps.length; idx++) {
      const changedBits = steps[idx]?.changedBits;
      if (!changedBits) continue;
      for (const bit of changedBits) {
        if (!map.has(bit)) map.set(bit, []);
        map.get(bit).push(idx);
      }
    }
    return map;
  }, [steps]);

  const detailInspectorRows = useMemo(() => {
    if (!currentStepData) return [];
    // item 446: choose bit source based on mode
    let bits;
    if (detailInspectorMode === 'targeted') {
      const tBits = currentStepData.targetBits;
      if (!tBits || tBits.length === 0) return [];
      bits = Array.from(tBits).sort((a, b) => a - b);
    } else if (detailInspectorMode === 'alreadySet') {
      const tBits = currentStepData.targetBits;
      if (!tBits || tBits.length === 0) return [];
      const changedSet = new Set(currentStepData.changedBits);
      bits = Array.from(tBits).filter((b) => !changedSet.has(b)).sort((a, b) => a - b);
    } else {
      // 'bits', 'newlySet', 'numbers' all use changedBits
      if (!currentStepData.changedBits || currentStepData.changedBits.length === 0) return [];
      bits = Array.from(currentStepData.changedBits).sort((a, b) => a - b);
    }
    const groupBits = layoutSettings.vectorMode === 'custom'
      ? Math.max(1, parseInt(layoutSettings.customGroupBits || 1, 10) || 1)
      : Math.max(1, (layoutSettings.vectorGroup || 1) * 64);
    return bits.map((bit) => {
      const wheelBit = (storageModel || 'half') === 'wheel' ? describeWheelBit(bit, wheelDefinition) : null;
      const mappedNumber = wheelBit ? wheelBit.number : bitToNumber(bit, storageModel || 'half', wheelDefinition);
      const byte = Math.floor(bit / 8);
      const uint64 = Math.floor(bit / 64);
      const group = Math.floor(bit / groupBits);
      // items 224+225: which steps have changed this bit?
      const changedBySteps = bitChangedByIndex.get(bit) ?? [];
      return {
        bit,
        number: mappedNumber == null ? 'unmapped' : mappedNumber,
        wheelPeriod: wheelBit?.period ?? null,
        relativeBit: wheelBit?.relativeBit ?? null,
        relativeNumber: wheelBit?.relativeNumber ?? null,
        byte,
        uint64,
        group,
        cacheline: Math.floor(bit / Math.max(8, cachelineSize * 8)),
        changedBySteps,  // items 224+225: all step indices that changed this bit
      };
    });
  }, [currentStepData, detailInspectorMode, layoutSettings.vectorMode, layoutSettings.customGroupBits, layoutSettings.vectorGroup, storageModel, wheelDefinition, cachelineSize, bitChangedByIndex]);  // item 446: detailInspectorMode added

  const filteredDetailInspectorRows = useMemo(() => {
    const q = detailInspectorQuery.trim().toLowerCase();
    if (!q) return detailInspectorRows;
    return detailInspectorRows.filter((row) => {
      // items 224+225: also search by event annotation/operation
      const eventText = (row.changedBySteps || [])
        .map(idx => `${steps?.[idx]?.annotation ?? ''} ${steps?.[idx]?.operation ?? ''}`)
        .join(' ');
      const haystack = `${row.bit} ${row.number} ${row.wheelPeriod ?? ''} ${row.relativeBit ?? ''} ${row.relativeNumber ?? ''} ${row.byte} ${row.uint64} ${row.group} ${row.cacheline} ${eventText}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [detailInspectorRows, detailInspectorQuery, steps]);

  return { detailInspectorRows, filteredDetailInspectorRows };
}
