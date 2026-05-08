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
 * @returns {{ detailInspectorRows, filteredDetailInspectorRows }}
 */
export function useDetailInspectorRows({
  currentStepData,
  layoutSettings,
  storageModel,
  wheelDefinition,
  cachelineSize,
  detailInspectorQuery,
}) {
  const detailInspectorRows = useMemo(() => {
    if (!currentStepData || !currentStepData.changedBits || currentStepData.changedBits.length === 0) return [];
    const bits = Array.from(currentStepData.changedBits).sort((a, b) => a - b);
    const groupBits = layoutSettings.vectorMode === 'custom'
      ? Math.max(1, parseInt(layoutSettings.customGroupBits || 1, 10) || 1)
      : Math.max(1, (layoutSettings.vectorGroup || 1) * 64);
    return bits.map((bit) => {
      const wheelBit = (storageModel || 'half') === 'wheel' ? describeWheelBit(bit, wheelDefinition) : null;
      const mappedNumber = wheelBit ? wheelBit.number : bitToNumber(bit, storageModel || 'half', wheelDefinition);
      const byte = Math.floor(bit / 8);
      const uint64 = Math.floor(bit / 64);
      const group = Math.floor(bit / groupBits);
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
      };
    });
  }, [currentStepData, layoutSettings.vectorMode, layoutSettings.customGroupBits, layoutSettings.vectorGroup, storageModel, wheelDefinition, cachelineSize]);

  const filteredDetailInspectorRows = useMemo(() => {
    const q = detailInspectorQuery.trim().toLowerCase();
    if (!q) return detailInspectorRows;
    return detailInspectorRows.filter((row) => {
      const haystack = `${row.bit} ${row.number} ${row.wheelPeriod ?? ''} ${row.relativeBit ?? ''} ${row.relativeNumber ?? ''} ${row.byte} ${row.uint64} ${row.group} ${row.cacheline}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [detailInspectorRows, detailInspectorQuery]);

  return { detailInspectorRows, filteredDetailInspectorRows };
}
