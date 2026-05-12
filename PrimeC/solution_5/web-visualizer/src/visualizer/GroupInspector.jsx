import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { BIT_LAYOUTS, BYTE_LAYOUTS } from '../SieveRenderer';

const GRID3X3_MAP = [0, 1, 2, 3, 5, 6, 7, 8];

function layoutPos(layout, index) {
  if (layout.grid3x3) {
    const cell = GRID3X3_MAP[index];
    return { col: cell % 3, row: Math.floor(cell / 3) };
  }
  return { col: index % layout.cols, row: Math.floor(index / layout.cols) };
}

/**
 * Returns the inclusive bit range [start, end] for a given unit type + index.
 * Returns null if cachelineSize is not available for cacheline type.
 */
function unitBitRange(unit, cachelineSize, effectiveGroupBits) {
  switch (unit.type) {
    case 'byte':
      return { start: unit.index * 8, end: unit.index * 8 + 7, size: 8 };
    case 'group': {
      const bitsPerGroup = Math.max(1, Number(effectiveGroupBits) || 64);
      return { start: unit.index * bitsPerGroup, end: unit.index * bitsPerGroup + bitsPerGroup - 1, size: bitsPerGroup };
    }
    case 'uint32':
      return { start: unit.index * 32, end: unit.index * 32 + 31, size: 32 };
    case 'uint64':
      return { start: unit.index * 64, end: unit.index * 64 + 63, size: 64 };
    case 'cacheline': {
      const bitsPerCL = (cachelineSize || 64) * 8;
      return { start: unit.index * bitsPerCL, end: unit.index * bitsPerCL + bitsPerCL - 1, size: bitsPerCL };
    }
    default:
      return null;
  }
}

function unitLabel(unit) {
  switch (unit.type) {
    case 'byte': return `Byte #${unit.index}`;
    case 'group': return `Group #${unit.index}`;
    case 'uint32': return `uint32 #${unit.index}`;
    case 'uint64': return `uint64 #${unit.index}`;
    case 'cacheline': return `Cache line #${unit.index}`;
    default: return `${unit.type} #${unit.index}`;
  }
}

function getRawSlotBits(step) {
  if (Array.isArray(step?.maskSlotBits) && step.maskSlotBits.length > 0) return step.maskSlotBits;
  if (Array.isArray(step?.patternSlotBits)) return step.patternSlotBits;
  return [];
}

function getMaskSteps(step) {
  return Array.isArray(step?.aggMaskSteps) && step.aggMaskSteps.length > 0
    ? step.aggMaskSteps
    : [step];
}

/**
 * Build a maskSummary (same structure as DetailPanel) from a step's mask data.
 */
function buildMaskSummary(step, label = null) {
  if (!step || !Number.isFinite(step.maskWordBits) || step.maskWordBits <= 0) return null;

  const rawSlotBits = getRawSlotBits(step);

  const slotBits = Array.isArray(rawSlotBits)
    ? rawSlotBits
        .map((bits, slotIndex) => {
          const values = Array.from(bits || []).map((v) => Number(v)).filter((v) => Number.isFinite(v));
          if (values.length === 0) return null;
          return { slotIndex, values };
        })
        .filter(Boolean)
    : [];

  if (slotBits.length === 0) return null;

  return { wordBits: step.maskWordBits, slotBits, label };
}

function buildMaskSummaries(step) {
  return getMaskSteps(step)
    .map((maskStep, index) => buildMaskSummary(maskStep, getMaskSteps(step).length > 1 ? `Mask set ${index + 1}` : null))
    .filter(Boolean);
}

function collectMaskTargetBits(step) {
  const touchedBits = new Set();

  for (const maskStep of getMaskSteps(step)) {
    const wordBits = Number(maskStep?.maskWordBits);
    const writeWords = maskStep?.maskWriteOrderWords;
    const writeSlots = maskStep?.maskWriteOrderSlots;
    const rawSlotBits = getRawSlotBits(maskStep);
    if (!Number.isFinite(wordBits) || wordBits <= 0 || !writeWords || writeWords.length === 0 || rawSlotBits.length === 0) {
      continue;
    }

    for (let index = 0; index < writeWords.length; index++) {
      const wordIndex = Number(writeWords[index]);
      const slotIndex = Number(writeSlots?.[index] ?? 0);
      const slotBits = rawSlotBits[slotIndex];
      if (!Number.isFinite(wordIndex) || wordIndex < 0 || !slotBits) continue;

      for (const offset of slotBits) {
        const bitOffset = Number(offset);
        if (!Number.isFinite(bitOffset) || bitOffset < 0) continue;
        touchedBits.add(wordIndex * wordBits + bitOffset);
      }
    }
  }

  return touchedBits;
}

function buildGridGeometry(totalBits, bitLayout, byteLayout, options = {}) {
  const bitDef = BIT_LAYOUTS[bitLayout] || BIT_LAYOUTS['4x2'];
  const byteDef = BYTE_LAYOUTS[byteLayout] || BYTE_LAYOUTS['4x2'];
  const safeBits = Math.max(1, totalBits);
  const activeBytes = Math.max(1, Math.ceil(safeBits / 8));
  const bitSize = options.bitSize ?? 10;
  const bitGap = options.bitGap ?? 2;
  const byteGap = options.byteGap ?? 6;
  const bytePad = options.bytePad ?? 4;
  const bitCols = bitDef.grid3x3 ? 3 : bitDef.cols;
  const bitRows = bitDef.grid3x3 ? 3 : bitDef.rows;
  const byteWidth = bitCols * bitSize + Math.max(0, bitCols - 1) * bitGap;
  const byteHeight = bitRows * bitSize + Math.max(0, bitRows - 1) * bitGap;

  let minByteCol = Infinity;
  let maxByteCol = -Infinity;
  let minByteRow = Infinity;
  let maxByteRow = -Infinity;
  const bytePositions = [];

  for (let index = 0; index < activeBytes; index++) {
    const pos = layoutPos(byteDef, index);
    bytePositions.push(pos);
    minByteCol = Math.min(minByteCol, pos.col);
    maxByteCol = Math.max(maxByteCol, pos.col);
    minByteRow = Math.min(minByteRow, pos.row);
    maxByteRow = Math.max(maxByteRow, pos.row);
  }

  const width = (maxByteCol - minByteCol + 1) * byteWidth + Math.max(0, maxByteCol - minByteCol) * byteGap + bytePad * 2;
  const height = (maxByteRow - minByteRow + 1) * byteHeight + Math.max(0, maxByteRow - minByteRow) * byteGap + bytePad * 2;

  return {
    totalBits: safeBits,
    activeBytes,
    bitDef,
    bytePositions,
    minByteCol,
    minByteRow,
    bitSize,
    bitGap,
    byteGap,
    bytePad,
    byteWidth,
    byteHeight,
    width,
    height,
  };
}

/**
 * Build a maskPreview geometry (same as DetailPanel.maskPreview) from a maskSummary + layouts.
 */
function buildMaskPreview(maskSummary, bitLayout, byteLayout) {
  if (!maskSummary) return null;
  const geometry = buildGridGeometry(maskSummary.wordBits, bitLayout, byteLayout, {
    bitSize: 8,
    bitGap: 1,
    byteGap: 4,
    bytePad: 4,
  });

  const slots = maskSummary.slotBits.map((slot) => ({
    slotIndex: slot.slotIndex,
    activeBits: new Set(slot.values || []),
  }));

  return {
    slots,
    ...geometry,
    previewWidth: geometry.width,
    previewHeight: geometry.height,
  };
}

function UnitBitOverview({ bitIndices, bitStates, bitLayout, byteLayout }) {
  const overview = useMemo(() => buildGridGeometry(bitIndices.length, bitLayout, byteLayout, {
    bitSize: 12,
    bitGap: 2,
    byteGap: 8,
    bytePad: 4,
  }), [bitIndices.length, bitLayout, byteLayout]);

  return (
    <div
      className="gi-bit-overview-grid"
      style={{ width: `${overview.width}px`, height: `${overview.height}px` }}
    >
      {Array.from({ length: overview.activeBytes }, (_, byteIndex) => {
        const bytePos = overview.bytePositions[byteIndex];
        const byteLeft = overview.bytePad + (bytePos.col - overview.minByteCol) * (overview.byteWidth + overview.byteGap);
        const byteTop = overview.bytePad + (bytePos.row - overview.minByteRow) * (overview.byteHeight + overview.byteGap);
        return (
          <div
            key={byteIndex}
            className="gi-bit-byte"
            style={{
              left: `${byteLeft}px`,
              top: `${byteTop}px`,
              width: `${overview.byteWidth}px`,
              height: `${overview.byteHeight}px`,
            }}
          >
            {Array.from({ length: 8 }, (_, bitIndex) => {
              const absoluteBit = byteIndex * 8 + bitIndex;
              if (absoluteBit >= bitIndices.length) return null;
              const globalBit = bitIndices[absoluteBit];
              const bitPos = layoutPos(overview.bitDef, bitIndex);
              const state = bitStates[globalBit];
              return (
                <span
                  key={bitIndex}
                  className={`gi-bit-cell gi-bit-cell-grid${state === 'changed' ? ' gi-bit-changed' : state === 'targeted' ? ' gi-bit-targeted' : ' gi-bit-untouched'}`}
                  style={{
                    left: `${bitPos.col * (overview.bitSize + overview.bitGap)}px`,
                    top: `${bitPos.row * (overview.bitSize + overview.bitGap)}px`,
                    width: `${overview.bitSize}px`,
                    height: `${overview.bitSize}px`,
                  }}
                  title={`Bit ${globalBit}${state ? ` (${state})` : ' (untouched)'}`}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Renders a scaled mask bit grid for one slot (same style as DetailPanel).
 */
function MaskGrid({ slot, mp, scaledBitSize }) {
  const sbs = scaledBitSize;
  const sg = Math.max(1, Math.round(mp.bitGap * sbs / mp.bitSize));
  const sbg = Math.max(2, Math.round(mp.byteGap * sbs / mp.bitSize));
  const spad = Math.max(2, Math.round(mp.bytePad * sbs / mp.bitSize));
  const sbw = mp.bitDef.grid3x3 ? 3 : mp.bitDef.cols;
  const sbh = mp.bitDef.grid3x3 ? 3 : mp.bitDef.rows;
  const byteW = sbw * sbs + Math.max(0, sbw - 1) * sg;
  const byteH = sbh * sbs + Math.max(0, sbh - 1) * sg;
  const colSpan = mp.bytePositions.length > 0 ? (Math.max(...mp.bytePositions.map((p) => p.col)) - mp.minByteCol + 1) : 1;
  const rowSpan = mp.bytePositions.length > 0 ? (Math.max(...mp.bytePositions.map((p) => p.row)) - mp.minByteRow + 1) : 1;
  const gridW = colSpan * byteW + Math.max(0, colSpan - 1) * sbg + spad * 2;
  const gridH = rowSpan * byteH + Math.max(0, rowSpan - 1) * sbg + spad * 2;
  return (
    <div style={{ position: 'relative', width: `${gridW}px`, height: `${gridH}px`, border: '1px solid var(--border-light)', borderRadius: '6px', background: 'color-mix(in srgb, var(--bg) 82%, transparent)', flexShrink: 0 }}>
      {Array.from({ length: mp.activeBytes }, (_, byteIndex) => {
        const bytePos = mp.bytePositions[byteIndex];
        const byteLeft = spad + (bytePos.col - mp.minByteCol) * (byteW + sbg);
        const byteTop = spad + (bytePos.row - mp.minByteRow) * (byteH + sbg);
        return (
          <div key={byteIndex} style={{ position: 'absolute', left: `${byteLeft}px`, top: `${byteTop}px`, width: `${byteW}px`, height: `${byteH}px`, border: '1px solid var(--border-light)', borderRadius: '3px', background: 'color-mix(in srgb, var(--bg-surface) 92%, transparent)' }}>
            {Array.from({ length: 8 }, (_, bitIndex) => {
              const absoluteBit = byteIndex * 8 + bitIndex;
              if (absoluteBit >= mp.totalBits) return null;
              const bitPos = layoutPos(mp.bitDef, bitIndex);
              const bl = bitPos.col * (sbs + sg);
              const bt = bitPos.row * (sbs + sg);
              const active = slot.activeBits.has(absoluteBit);
              return (
                <span key={bitIndex} style={{ position: 'absolute', left: `${bl}px`, top: `${bt}px`, width: `${sbs}px`, height: `${sbs}px`, display: 'block', borderRadius: '2px', background: active ? (slot.slotIndex === 0 ? 'rgba(39,174,96,0.72)' : 'rgba(245,158,11,0.76)') : 'color-mix(in srgb, var(--bg-input) 88%, transparent)', boxShadow: 'inset 0 0 0 1px rgba(15,23,42,0.2)' }} title={`Bit ${absoluteBit}`} />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

/**
 * One row in the events list: shows event info + bits affected + optional mask.
 */
function EventRow({ stepIndex, step, changedInUnit, targetedInUnit, maskEntries, onGoToStep }) {
  const [zoomOpenIndex, setZoomOpenIndex] = useState(null);

  return (
    <div className="gi-event-row">
      <div className="gi-event-header">
        <span className="gi-event-index">Event {step?.originalIndex ?? stepIndex}</span>
        {step?.prime != null && <span className="gi-tag prime-tag">prime {step.prime}</span>}
        {step?.operation && <span className="gi-tag op-tag">{step.operation}</span>}
        <button
          className="gi-goto-btn"
          onClick={() => onGoToStep && onGoToStep(stepIndex)}
          title="Go to this event"
        >→</button>
      </div>
      {step?.annotation && (
        <div className="gi-event-annotation">{step.annotation}</div>
      )}
      <div className="gi-event-bits">
        {changedInUnit.length > 0 && (
          <span className="gi-bits-changed">Changed: {changedInUnit.slice(0, 10).join(', ')}{changedInUnit.length > 10 ? ` +${changedInUnit.length - 10}` : ''}</span>
        )}
        {targetedInUnit.length > 0 && (
          <span className="gi-bits-targeted">Targeted: {targetedInUnit.slice(0, 10).join(', ')}{targetedInUnit.length > 10 ? ` +${targetedInUnit.length - 10}` : ''}</span>
        )}
      </div>
      {maskEntries.length > 0 && maskEntries.map(({ maskPreview, maskSummary, label }, entryIndex) => {
        const MAX_W = 100;
        const MAX_H = 80;
        const scale = maskPreview
          ? Math.min(MAX_W / maskPreview.previewWidth, MAX_H / maskPreview.previewHeight, 1.5)
          : 1;

        if (!maskPreview || maskPreview.slots.length === 0) return null;

        return (
          <div key={`${stepIndex}-mask-${entryIndex}`} className="gi-mask-row" style={{ marginTop: entryIndex > 0 ? '8px' : undefined }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {label && <div className="gi-mask-slot-label" style={{ fontSize: '10px' }}>{label}</div>}
              <div className="gi-mask-slots">
                {maskPreview.slots.map((slot) => (
                  <div key={slot.slotIndex} className="gi-mask-slot-wrap">
                    <div className="gi-mask-slot-label">Mask {slot.slotIndex + 1}</div>
                    <div
                      className="gi-mask-scaler"
                      style={{ width: `${Math.ceil(maskPreview.previewWidth * scale)}px`, height: `${Math.ceil(maskPreview.previewHeight * scale)}px`, overflow: 'hidden', position: 'relative', cursor: 'zoom-in' }}
                      onClick={() => setZoomOpenIndex(entryIndex)}
                      title="Click to zoom in"
                    >
                      <div style={{ width: `${maskPreview.previewWidth}px`, height: `${maskPreview.previewHeight}px`, transform: `scale(${scale})`, transformOrigin: 'top left', pointerEvents: 'none' }}>
                        <MaskGrid slot={slot} mp={maskPreview} scaledBitSize={maskPreview.bitSize} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {maskSummary && (
              <div className="gi-mask-text">
                <span className="gi-mask-label">{maskSummary.wordBits}b:</span>
                {maskSummary.slotBits.map((s) => (
                  <span key={s.slotIndex} className="gi-mask-vals"> {s.values.join(', ')}</span>
                ))}
              </div>
            )}
          </div>
        );
      })}
      {zoomOpenIndex != null && maskEntries[zoomOpenIndex]?.maskPreview && createPortal(
        <div
          className="mask-popover-backdrop"
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setZoomOpenIndex(null)}
        >
          <div
            className="mask-popover"
            style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px', maxWidth: '90vw', maxHeight: '85vh', overflow: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--fg-bright)' }}>Mask — Event {step?.originalIndex ?? stepIndex}</span>
              <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', fontSize: '16px', padding: '2px 6px', borderRadius: '4px' }} onClick={() => setZoomOpenIndex(null)}>✕</button>
            </div>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              {maskEntries[zoomOpenIndex].maskSummary?.label && (
                <div style={{ width: '100%', fontSize: '11px', color: 'var(--fg-muted)' }}>{maskEntries[zoomOpenIndex].maskSummary.label}</div>
              )}
              {maskEntries[zoomOpenIndex].maskPreview.slots.map((slot) => (
                <div key={slot.slotIndex}>
                  <div style={{ fontSize: '11px', color: 'var(--fg-muted)', marginBottom: '6px' }}>Mask {slot.slotIndex + 1}</div>
                  <MaskGrid slot={slot} mp={maskEntries[zoomOpenIndex].maskPreview} scaledBitSize={14} />
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

/**
 * The byte/uint32/uint64/cacheline inspector panel.
 * Shows which events affected bits in the selected unit,
 * and renders their masks in the same visual style as the DetailPanel.
 *
 * Props:
 *   unit             — { type: 'byte'|'uint32'|'uint64'|'cacheline', index: number }
 *   steps            — all trace steps
 *   cachelineSize    — cacheline size in bytes (for 'cacheline' type)
 *   storageModel     — storage model name (for bit→number conversion)
 *   wheelDefinition  — wheel definition (for bit→number conversion)
 *   bitLayout        — bit layout name (e.g. '4x2')
 *   byteLayout       — byte layout name (e.g. '4x2')
 *   bitCount         — total bit count (for range clamping)
 *   currentStep      — currently active step index (for highlighting)
 *   onClose          — close callback
 *   onGoToStep       — (stepIndex) => void
 */
export default function GroupInspector({
  unit,
  steps,
  cachelineSize,
  effectiveGroupBits,
  storageModel,
  wheelDefinition,
  bitLayout = '4x2',
  byteLayout = '4x2',
  bitCount,
  currentStep,
  onClose,
  onGoToStep,
}) {
  const range = useMemo(() => {
    if (!unit) return null;
    return unitBitRange(unit, cachelineSize, effectiveGroupBits);
  }, [unit, cachelineSize, effectiveGroupBits]);

  // Find all events that touched (changed or targeted) at least one bit in the range.
  const matchingEvents = useMemo(() => {
    if (!range || !Array.isArray(steps)) return [];
    const { start, end } = range;

    return steps.reduce((acc, step, stepIndex) => {
      const changedInUnit = new Set();
      const targetedInUnit = new Set();

      if (Array.isArray(step.changedBits)) {
        for (const bit of step.changedBits) {
          if (bit >= start && bit <= end) changedInUnit.add(bit);
        }
      }
      if (Array.isArray(step.targetBits)) {
        for (const bit of step.targetBits) {
          if (bit >= start && bit <= end && !changedInUnit.has(bit)) {
            targetedInUnit.add(bit);
          }
        }
      }

      for (const bit of collectMaskTargetBits(step)) {
        if (bit >= start && bit <= end && !changedInUnit.has(bit)) {
          targetedInUnit.add(bit);
        }
      }

      if (changedInUnit.size > 0 || targetedInUnit.size > 0) {
        acc.push({
          stepIndex,
          step,
          changedInUnit: Array.from(changedInUnit).sort((a, b) => a - b),
          targetedInUnit: Array.from(targetedInUnit).sort((a, b) => a - b),
        });
      }
      return acc;
    }, []);
  }, [range, steps]);

  // Collect all bits in the unit that were ever changed/targeted.
  const unitBitStates = useMemo(() => {
    if (!range) return {};
    const states = {};
    for (const { changedInUnit, targetedInUnit } of matchingEvents) {
      for (const bit of changedInUnit) states[bit] = 'changed';
      for (const bit of targetedInUnit) {
        if (!states[bit]) states[bit] = 'targeted';
      }
    }
    return states;
  }, [range, matchingEvents]);

  if (!unit || !range) return null;

  const { start, end } = range;
  const clampedEnd = bitCount != null ? Math.min(end, bitCount - 1) : end;
  const bitIndices = Array.from({ length: clampedEnd - start + 1 }, (_, i) => start + i);
  const label = unitLabel(unit);

  return createPortal(
    <div
      className="gi-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div
        className="gi-panel"
        role="dialog"
        aria-modal="true"
        aria-label={`${label} Inspector`}
      >
        {/* Header */}
        <div className="gi-header">
          <div className="gi-title">
            <span className="gi-title-label">{label}</span>
            <span className="gi-title-range">Bits {start}–{clampedEnd}</span>
          </div>
          <button className="gi-close-btn" onClick={onClose} title="Close inspector">✕</button>
        </div>

        {/* Bit state overview */}
        <div className="gi-bit-overview">
          <div className="gi-bit-overview-label">Bit overview ({bitIndices.length} bits):</div>
          <UnitBitOverview
            bitIndices={bitIndices}
            bitStates={unitBitStates}
            bitLayout={bitLayout}
            byteLayout={byteLayout}
          />
          <div className="gi-bit-legend">
            <span className="gi-legend-item"><span className="gi-bit-cell gi-bit-changed" /> Changed</span>
            <span className="gi-legend-item"><span className="gi-bit-cell gi-bit-targeted" /> Targeted only</span>
            <span className="gi-legend-item"><span className="gi-bit-cell gi-bit-untouched" /> Untouched</span>
          </div>
        </div>

        {/* Events list */}
        <div className="gi-events-section">
          <div className="gi-events-section-label">
            Events that touched this {unit.type}:{' '}
            <span className="gi-events-count">{matchingEvents.length}</span>
          </div>

          {matchingEvents.length === 0 ? (
            <div className="gi-no-events">No events have touched this {unit.type}.</div>
          ) : (
            <div className="gi-events-list">
              {matchingEvents.map(({ stepIndex, step, changedInUnit, targetedInUnit }) => {
                const maskEntries = buildMaskSummaries(step)
                  .map((maskSummary) => ({
                    label: maskSummary.label,
                    maskSummary,
                    maskPreview: buildMaskPreview(maskSummary, bitLayout, byteLayout),
                  }))
                  .filter((entry) => entry.maskPreview);
                return (
                  <EventRow
                    key={stepIndex}
                    stepIndex={stepIndex}
                    step={step}
                    changedInUnit={changedInUnit}
                    targetedInUnit={targetedInUnit}
                    maskEntries={maskEntries}
                    onGoToStep={onGoToStep}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
