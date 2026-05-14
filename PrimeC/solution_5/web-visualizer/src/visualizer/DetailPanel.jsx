import React, { useMemo, useCallback, useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { BIT_LAYOUTS, BYTE_LAYOUTS, bitToNumber } from '../SieveRenderer';
import { formatNs } from './TimingPanel';
import { useDragResize } from '../hooks/interactions';
import { usePlaybackContext } from '../contexts/PlaybackContext';
import { usePanelLayoutContext } from '../contexts/PanelLayoutContext';

const GRID3X3_MAP = [0, 1, 2, 3, 5, 6, 7, 8];

// item 350: parse annotation text for inspectable unit (same patterns as EventsPanel)
function parseInspectableUnitFromAnnotation(annotation) {
  const text = String(annotation || '');
  const patterns = [
    { type: 'cacheline', regex: /\bcache(?:\s*line|line)\s*#?\s*(\d+)\b/i },
    { type: 'byte',      regex: /\bbyte\s*#?\s*(\d+)\b/i },
    { type: 'group',     regex: /\bgroup\s*#?\s*(\d+)\b/i },
    { type: 'uint32',    regex: /\buint32\s*#?\s*(\d+)\b/i },
    { type: 'uint64',    regex: /\buint64\s*#?\s*(\d+)\b/i },
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern.regex);
    if (match) return { type: pattern.type, index: Number(match[1]) };
  }
  return null;
}

function layoutPos(layout, index) {
  if (layout.grid3x3) {
    const cell = GRID3X3_MAP[index];
    return { col: cell % 3, row: Math.floor(cell / 3) };
  }
  return { col: index % layout.cols, row: Math.floor(index / layout.cols) };
}

/**
 * Collapsible detail panel with adjustable height.
 * 
 * Phase 5 Refactoring: Accepts organized prop objects instead of 25+ scattered props.
 * 
 * @param {object}   props
 * @param {object}   props.detailState              - Panel state (step, stepIndex, open, height, width, playing, stepStats, bitLayout, byteLayout, eventTitleVisible, sourceLineNumber, hasRawSource)
 * @param {object}   props.detailConfig             - Panel config (storageModel, wheelDefinition, benchmarkTimingData, allEventsTransport)
 * @param {object}   props.detailHandlers           - Panel handlers (onToggle, onHeightChange, onWidthChange, onInspectChangedBits, onInspectMarkedNumbers, onShowEventTitle, onHideEventTitle, onOpenRawLog)
 * 
 */
export default function DetailPanel({
  detailState = {},
  detailConfig = {},
  detailHandlers = {},
}) {
  const {
    step,
    stepIndex,
    open,
    height,
    width,
    playing,
    stepStats,
    bitLayout = '4x2',
    byteLayout = '4x2',
    eventTitleVisible,
    sourceLineNumber,
    hasRawSource = false,
    aggMaskStepIndex = 0,
    // item 155: hide header when dragged all the way down
    isHeaderHidden = false,
    // item 157: floating panel
    isFloating = false,
    // item 162: show-state for all-events floater
    isAllEventsInDetailPanel = false,
  } = detailState;

  const {
    storageModel,
    wheelDefinition,
    benchmarkTimingData,
    allEventsTransport,
    surroundingEvents,   /* item 178: nearby events section */
  } = detailConfig;

  const {
    onToggle,
    onHeightChange,
    onWidthChange,
    onInspectChangedBits,
    onInspectMarkedNumbers,
    onShowEventTitle,
    onHideEventTitle,
    onOpenRawLog,
    onAggMaskStepChange,
    // item 350: open group inspector from detail panel (no balloons needed)
    onInspectAnnotationUnit,
    // item 162: separate toggle button for all-events floater
    onToggleAllEventsFloater,
    // item 157: dock floating panel back to the bottom
    onDockDetailPanel,
    // item 426: bits grid view — highlight set of bits in the main grid
    bitsGridView = {},
    onBitsGridViewChange,
    // item 446: open modal to inspect bits by category
    onInspectBitCategory,
  } = detailHandlers;

  // item 178: goToStep from playback context for nearby-events navigation
  const { goToStep } = usePlaybackContext();

  // item 162: dock row shows floater when isAllEventsInDetailPanel=true
  const showAllEventsInPanel = isAllEventsInDetailPanel && !!allEventsTransport;
  const hasDockContent = showAllEventsInPanel;
  // Benchmark timing row matching the current step's operation (if any)
  const benchmarkOpTiming = useMemo(() => {
    if (!step || !benchmarkTimingData || !Array.isArray(benchmarkTimingData.timings)) return null;
    const op = step.operation;
    if (!op) return null;
    const match = benchmarkTimingData.timings.find((t) => String(t.function || '').trim() === op);
    if (!match) return null;
    return {
      avgPerPassNs: (Number(match.avg_time_per_pass_s) || 0) * 1e9,
      avgPerCallNs: (Number(match.avg_time_per_call_s) || 0) * 1e9,
      totalNs: (Number(match.total_time_s) || 0) * 1e9,
      hits: Number(match.hits) || 0,
    };
  }, [step, benchmarkTimingData]);
  // item 446: helper to compute compact range text from a list of bit indices
  const computeRanges = (bits) => {
    if (!bits || bits.length === 0) return null;
    const sorted = Array.from(bits).sort((a, b) => a - b);
    const ranges = [];
    let start = sorted[0], end = sorted[0];
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === end + 1) {
        end = sorted[i];
      } else {
        ranges.push(start === end ? `${start}` : `${start}–${end}`);
        start = end = sorted[i];
      }
    }
    ranges.push(start === end ? `${start}` : `${start}–${end}`);
    if (ranges.length > 5) {
      return { text: ranges.slice(0, 5).join(', '), more: ranges.length - 5 };
    }
    return { text: ranges.join(', '), more: 0 };
  };

  // Compact representation of changed bit ranges
  const bitRanges = useMemo(() => {
    if (!step || step.changedBits.length === 0) return '';
    const bits = Array.from(step.changedBits).sort((a, b) => a - b);
    const ranges = [];
    let start = bits[0], end = bits[0];
    for (let i = 1; i < bits.length; i++) {
      if (bits[i] === end + 1) {
        end = bits[i];
      } else {
        ranges.push(start === end ? `${start}` : `${start}–${end}`);
        start = end = bits[i];
      }
    }
    ranges.push(start === end ? `${start}` : `${start}–${end}`);
    // Limit display to a few items — click the button to see all
    if (ranges.length > 5) {
      return { text: ranges.slice(0, 5).join(', '), more: ranges.length - 5 };
    }
    return { text: ranges.join(', '), more: 0 };
  }, [step]);

  // item 446: compact range text for targeted / already-set bit categories
  const targetBitsRanges = useMemo(() => computeRanges(step?.targetBits), [step]);
  const alreadySetBitsRanges = useMemo(() => {
    if (!step?.targetBits?.length) return null;
    const changedSet = new Set(step.changedBits);
    return computeRanges(step.targetBits.filter((b) => !changedSet.has(b)));
  }, [step]);

  // Convert changed bits to number representation
  const numberSummary = useMemo(() => {
    if (!step || step.changedBits.length === 0) return '';
    const bits = Array.from(step.changedBits).sort((a, b) => a - b);
    const model = storageModel || 'half';
    const nums = bits.slice(0, 5).map((bit) => {
      const number = bitToNumber(bit, model, wheelDefinition);
      return number == null ? 'unmapped' : number;
    });
    const more = bits.length - 5;
    return { text: nums.join(', '), more: more > 0 ? more : 0 };
  }, [step, storageModel, wheelDefinition]);

  const maskType = useMemo(() => {
    if (!step) return null;
    const wordBits = step.maskWordBits;
    if (!Number.isFinite(wordBits) || wordBits <= 0) return null;
    const slotCount = step.patternSlotCount;
    if (Number.isFinite(slotCount) && slotCount > 0) {
      return `uint${wordBits}v${slotCount}`;
    }
    return `uint${wordBits}`;
  }, [step]);

  const maskSummary = useMemo(() => {
    // For aggregated events with multiple per-event masks, use the active step's mask data.
    const aggMaskSteps = step?.aggMaskSteps;
    const activeMaskStep = aggMaskSteps && aggMaskSteps.length > 0
      ? (aggMaskSteps[aggMaskStepIndex] ?? aggMaskSteps[0])
      : step;

    if (!activeMaskStep || !Number.isFinite(activeMaskStep.maskWordBits) || activeMaskStep.maskWordBits <= 0) return null;

    const rawSlotBits = Array.isArray(activeMaskStep.maskSlotBits) && activeMaskStep.maskSlotBits.length > 0
      ? activeMaskStep.maskSlotBits
      : (Array.isArray(activeMaskStep.patternSlotBits) ? activeMaskStep.patternSlotBits : []);

    const slotBits = Array.isArray(rawSlotBits)
      ? rawSlotBits
          .map((bits, slotIndex) => {
            const values = Array.from(bits || []).map((value) => Number(value)).filter((value) => Number.isFinite(value));
            if (values.length === 0) return null;
            return {
              slotIndex,
              values,
              text: `mask ${slotIndex + 1}: ${values.join(', ')}`,
            };
          })
          .filter(Boolean)
      : [];

    const writeEntries = (() => {
      if (!activeMaskStep.maskWriteOrderWords || activeMaskStep.maskWriteOrderWords.length === 0) return [];
      const items = [];
      for (let index = 0; index < activeMaskStep.maskWriteOrderWords.length; index++) {
        const word = Number(activeMaskStep.maskWriteOrderWords[index]);
        const slot = Number(activeMaskStep.maskWriteOrderSlots?.[index] ?? 0);
        if (!Number.isFinite(word) || word < 0) continue;
        items.push(`w${word}:${slot + 1}`);
      }
      return items;
    })();

    return {
      wordBits: activeMaskStep.maskWordBits,
      slotBits,
      slotText: slotBits.length > 0 ? slotBits.map((entry) => entry.text).join(' | ') : '-',
      routeText: writeEntries.length > 0
        ? (writeEntries.length > 18
          ? `${writeEntries.slice(0, 18).join(', ')} … (+${writeEntries.length - 18} more)`
          : writeEntries.join(', '))
        : '-',
      activeMaskStep,
    };
  }, [step, aggMaskStepIndex, bitLayout]);

  const maskPreview = useMemo(() => {
    if (!maskSummary) return null;

    const bitDef = BIT_LAYOUTS[bitLayout] || BIT_LAYOUTS['4x2'];
    const byteDef = BYTE_LAYOUTS[byteLayout] || BYTE_LAYOUTS['4x2'];
    const totalBits = Math.max(1, maskSummary.wordBits);
    const activeBytes = Math.max(1, Math.ceil(totalBits / 8));
    const bitSize = 8;
    const bitGap = 1;
    const byteGap = 4;
    const bytePad = 4;
    const bitCols = bitDef.grid3x3 ? 3 : bitDef.cols;
    const bitRows = bitDef.grid3x3 ? 3 : bitDef.rows;
    const byteWidth = bitCols * bitSize + Math.max(0, bitCols - 1) * bitGap;
    const byteHeight = bitRows * bitSize + Math.max(0, bitRows - 1) * bitGap;

    let minByteCol = Number.POSITIVE_INFINITY;
    let maxByteCol = Number.NEGATIVE_INFINITY;
    let minByteRow = Number.POSITIVE_INFINITY;
    let maxByteRow = Number.NEGATIVE_INFINITY;
    const bytePositions = [];

    for (let byteIndex = 0; byteIndex < activeBytes; byteIndex++) {
      const pos = layoutPos(byteDef, byteIndex);
      bytePositions.push(pos);
      minByteCol = Math.min(minByteCol, pos.col);
      maxByteCol = Math.max(maxByteCol, pos.col);
      minByteRow = Math.min(minByteRow, pos.row);
      maxByteRow = Math.max(maxByteRow, pos.row);
    }

    const previewWidth = (maxByteCol - minByteCol + 1) * byteWidth + Math.max(0, maxByteCol - minByteCol) * byteGap + bytePad * 2;
    const previewHeight = (maxByteRow - minByteRow + 1) * byteHeight + Math.max(0, maxByteRow - minByteRow) * byteGap + bytePad * 2;

    const slots = maskSummary.slotBits.map((slot) => ({
      slotIndex: slot.slotIndex,
      activeBits: new Set(slot.values || []),
    }));

    if (slots.length === 0) return null;

    return {
      slots,
      totalBits,
      activeBytes,
      bitDef,
      byteDef,
      bitSize,
      bitGap,
      byteGap,
      bytePad,
      byteWidth,
      byteHeight,
      bytePositions,
      minByteCol,
      minByteRow,
      previewWidth,
      previewHeight,
    };
  }, [maskSummary, bitLayout, byteLayout]);

  // Height drag handler
  const handleHeightDrag = useDragResize({
    onMove: useCallback((_dx, dy) => {
      onHeightChange(Math.max(180, Math.min(700, (height || 200) - dy)));
    }, [height, onHeightChange]),
  });

  // Width drag handler (drag right edge)
  const handleWidthDrag = useDragResize({
    onMove: useCallback((dx) => {
      onWidthChange(Math.max(0, (width || 0) + dx));
    }, [width, onWidthChange]),
  });

  const [bodyAnimClass, setBodyAnimClass] = useState('');
  const [isBodyAnimatingOut, setIsBodyAnimatingOut] = useState(false);
  const [maskPopoverOpen, setMaskPopoverOpen] = useState(false);
  // item 301: show nearby-events sidebar only when events panel is collapsed
  // item 349: toggleEventsPanel for the nearby button that slides the events panel in from the left
  const { isEventsPanelCollapsed, toggleEventsPanel } = usePanelLayoutContext();
  const prevOpenRef = useRef(open);
  useLayoutEffect(() => {
    const prev = prevOpenRef.current;
    prevOpenRef.current = open;
    if (!prev && open) {
      // Opening: animate in
      setBodyAnimClass('expanding-in');
      const t = setTimeout(() => setBodyAnimClass(''), 350);
      return () => clearTimeout(t);
    } else if (prev && !open) {
      // Closing: animate out then hide (set animating-out before browser paints so body stays visible)
      setIsBodyAnimatingOut(true);
      setBodyAnimClass('collapsing-out');
      const t = setTimeout(() => { setIsBodyAnimatingOut(false); setBodyAnimClass(''); }, 300);
      return () => clearTimeout(t);
    }
  }, [open]);

  if (!step) return null;

  // Compact "Operation" section — identity of the step
  const operationFacts = [
    {
      label: 'Prime',
      content: step.prime != null ? <span className="detail-tag prime-tag">{step.prime}</span> : <span className="detail-empty">—</span>,
    },
    {
      label: 'Operation',
      content: step.operation ? <span className="detail-tag op-tag">{step.operation}</span> : <span className="detail-empty">—</span>,
    },
  ];

  // "Range" section — geometric facts (Pattern moved to mask preview)
  const rangeFacts = [
    {
      label: 'Range',
      content: step.start != null && step.stop != null
        ? <span className="detail-tag block-tag">[{step.start} – {step.stop}]</span>
        : <span className="detail-empty">—</span>,
    },
    {
      label: 'Range kind',
      content: step.rangeKind
        ? <span className="detail-tag block-tag">{step.rangeKind}</span>
        : <span className="detail-empty">—</span>,
    },
    {
      label: 'Step size',
      content: step.factorStep != null ? <span className="detail-tag step-tag">{step.factorStep}</span> : <span className="detail-empty">—</span>,
    },
    {
      label: 'Source',
      content: sourceLineNumber != null
        ? (
          <button
            type="button"
            className="detail-source-link"
            onClick={() => onOpenRawLog?.(sourceLineNumber)}
            title="Open raw log at this line"
          >
            line {sourceLineNumber + 1}
          </button>
        )
        : hasRawSource
        ? (
          <button
            type="button"
            className="detail-source-link detail-source-link--pending"
            onClick={() => onOpenRawLog?.(null)}
            title="Load raw log and navigate to this event's source line"
          >
            view source
          </button>
        )
        : <span className="detail-empty">—</span>,
    },
  ];

  // Pattern fact — shown in the mask preview section
  const patternFact = {
    label: 'Mask pattern',
    content: step.patternDescription
      ? <span className="dt-mono">{step.patternDescription}</span>
      : (step.patternKind ? <span className="detail-tag block-tag">{step.patternKind}</span> : <span className="detail-empty">—</span>),
  };

  // "Bits" section — counts
  // Compute already-set vs newly-set from mask data (no C tracer changes needed):
  //   totalAttempted = sum of slot bits per stamp; alreadySet = totalAttempted - changedBits.length
  // Falls back to step.targetBits vs step.changedBits for non-mask events that log target_bits.
  const traceSetStats = useMemo(() => {
    if (!step) return null;
    const newlySet = step.numChanged ?? step.changedBits?.length ?? 0;
    // Mask-based: derive totalAttempted from mask stamps
    if (step.maskWriteOrderWords?.length > 0 && Array.isArray(step.maskSlotBits) && step.maskSlotBits.length > 0) {
      let totalAttempted = 0;
      for (let i = 0; i < step.maskWriteOrderWords.length; i++) {
        const slotIdx = step.maskWriteOrderSlots?.[i] ?? 0;
        totalAttempted += (step.maskSlotBits[slotIdx]?.length ?? 0);
      }
      if (totalAttempted > 0) {
        return { totalAttempted, newlySet, alreadySet: Math.max(0, totalAttempted - newlySet) };
      }
    }
    // Non-mask: use targetBits when available and greater than changedBits
    if (step.targetBits?.length > 0 && step.targetBits.length > newlySet) {
      return { totalAttempted: step.targetBits.length, newlySet, alreadySet: step.targetBits.length - newlySet };
    }
    return null;
  }, [step]);

  const bitsFacts = [
    // item 446: 'Bits targeted' first (swapped from 'Bits changed')
    {
      label: 'Bits targeted',
      value: traceSetStats?.totalAttempted ?? '—',
      gridViewMode: 'targeted',
      // item 446: only show inspect when count is real (traceSetStats available)
      bitsRanges: traceSetStats ? targetBitsRanges : null,
      inspectMode: 'targeted',
    },
    {
      label: 'Bits changed',
      value: step.numChanged ?? 0,
      gridViewMode: 'changed',
      bitsRanges: bitRanges || null,
      inspectMode: 'bits',
    },
    {
      label: 'Already set',
      value: traceSetStats?.alreadySet ?? stepStats?.reSet ?? '—',
      gridViewMode: 'alreadySet',
      // item 446: only show inspect when count is real
      bitsRanges: traceSetStats ? alreadySetBitsRanges : null,
      inspectMode: 'alreadySet',
    },
    {
      label: 'Newly set',
      value: traceSetStats?.newlySet ?? stepStats?.newlySet ?? '—',
      gridViewMode: 'newlySet',
      bitsRanges: bitRanges || null,
      inspectMode: 'newlySet',
    },
    { label: 'Tried >1x', value: stepStats?.duplicateTargets ?? '—' },
    { label: 'Total set', value: stepStats?.totalSet ?? '—' },
  ];

  // "Timings" section — step elapsed + matching benchmark timing where available
  const timingFacts = [
    {
      label: 'Step elapsed',
      content: step.elapsedNs != null
        ? <span className="detail-tag timing-tag" title={`${step.elapsedNs.toFixed(0)}ns`}>{formatNs(step.elapsedNs, 2)}</span>
        : <span className="detail-empty">—</span>,
    },
    {
      label: 'Bench avg/pass',
      content: benchmarkOpTiming && benchmarkOpTiming.avgPerPassNs > 0
        ? <span className="detail-tag timing-tag" title={`benchmark: ${benchmarkOpTiming.hits.toLocaleString()} hits total`}>{formatNs(benchmarkOpTiming.avgPerPassNs, 2)}</span>
        : <span className="detail-empty">—</span>,
    },
    {
      label: 'Bench avg/call',
      content: benchmarkOpTiming && benchmarkOpTiming.avgPerCallNs > 0
        ? <span className="detail-tag timing-tag">{formatNs(benchmarkOpTiming.avgPerCallNs, 2)}</span>
        : <span className="detail-empty">—</span>,
    },
    {
      label: 'Bench total',
      content: benchmarkOpTiming && benchmarkOpTiming.totalNs > 0
        ? <span className="detail-tag timing-tag">{formatNs(benchmarkOpTiming.totalNs, 2)}</span>
        : <span className="detail-empty">—</span>,
    },
  ];

  const maskFacts = [
    {
      label: 'Mask width',
      content: maskSummary ? <span className="detail-tag block-tag">{maskSummary.wordBits} bits</span> : <span className="detail-empty">-</span>,
    },
    {
      label: 'Mask bits',
      content: maskSummary ? <span className="dt-mono">{maskSummary.slotText}</span> : <span className="detail-empty">-</span>,
    },
    {
      label: 'Mask route',
      content: maskSummary ? <span className="dt-mono">{maskSummary.routeText}</span> : <span className="detail-empty">-</span>,
    },
  ];

  const annotationFacts = [
    // item 350: inspect unit button — allows opening the group inspector from the detail panel
    ...(() => {
      const inspectable = step.annotation ? parseInspectableUnitFromAnnotation(step.annotation) : null;
      if (!inspectable || !onInspectAnnotationUnit) return [];
      return [{
        label: `Inspect ${inspectable.type}`,
        content: (
          <button
            className="detail-inspect-btn"
            onClick={() => onInspectAnnotationUnit({ type: inspectable.type, index: inspectable.index })}
            title={`Open ${inspectable.type} #${inspectable.index} inspector`}
          >
            <span className="dt-mono">{inspectable.type} #{inspectable.index} ↗</span>
          </button>
        ),
      }];
    })(),
    {
      label: 'Numbers marked',
      content: step.numChanged > 0 ? (
        <button className="detail-inspect-btn" onClick={() => onInspectMarkedNumbers && onInspectMarkedNumbers()} title="Inspect all marked numbers in a searchable list">
          <span className="dt-mono">{numberSummary.text}</span>
          {numberSummary.more > 0 && <span className="detail-inspect-hint">+{numberSummary.more} more ↗</span>}
        </button>
      ) : <span className="detail-empty">-</span>,
    },
    {
      label: 'Bit ranges',
      content: step.numChanged > 0 ? (
        <button className="detail-inspect-btn" onClick={() => onInspectChangedBits && onInspectChangedBits()} title="Inspect all changed bits in a searchable list">
          <span className="dt-mono">{bitRanges.text}</span>
          {bitRanges.more > 0 && <span className="detail-inspect-hint">+{bitRanges.more} more ↗</span>}
        </button>
      ) : <span className="detail-empty">-</span>,
    },
  ];

  // Helper: render a mask bit-grid at a given bitSize scale
  function renderMaskGrid(slot, mp, scaledBitSize) {
    const sbs = scaledBitSize;
    const sg = Math.max(1, Math.round(mp.bitGap * sbs / mp.bitSize));
    const sbg = Math.max(2, Math.round(mp.byteGap * sbs / mp.bitSize));
    const spad = Math.max(2, Math.round(mp.bytePad * sbs / mp.bitSize));
    const sbw = mp.bitDef.grid3x3 ? 3 : mp.bitDef.cols;
    const sbh = mp.bitDef.grid3x3 ? 3 : mp.bitDef.rows;
    const byteW = sbw * sbs + Math.max(0, sbw - 1) * sg;
    const byteH = sbh * sbs + Math.max(0, sbh - 1) * sg;
    const colSpan = mp.bytePositions.length > 0 ? (Math.max(...mp.bytePositions.map(p => p.col)) - mp.minByteCol + 1) : 1;
    const rowSpan = mp.bytePositions.length > 0 ? (Math.max(...mp.bytePositions.map(p => p.row)) - mp.minByteRow + 1) : 1;
    const gridW = colSpan * byteW + Math.max(0, colSpan - 1) * sbg + spad * 2;
    const gridH = rowSpan * byteH + Math.max(0, rowSpan - 1) * sbg + spad * 2;
    return (
      <div style={{ position: 'relative', width: `${gridW}px`, height: `${gridH}px`, border: '1px solid var(--border-light)', borderRadius: '8px', background: 'color-mix(in srgb, var(--bg) 82%, transparent)' }}>
        {Array.from({ length: mp.activeBytes }, (_, byteIndex) => {
          const bytePos = mp.bytePositions[byteIndex];
          const byteLeft = spad + (bytePos.col - mp.minByteCol) * (byteW + sbg);
          const byteTop = spad + (bytePos.row - mp.minByteRow) * (byteH + sbg);
          return (
            <div key={byteIndex} style={{ position: 'absolute', left: `${byteLeft}px`, top: `${byteTop}px`, width: `${byteW}px`, height: `${byteH}px`, border: '1px solid var(--border-light)', borderRadius: '4px', background: 'color-mix(in srgb, var(--bg-surface) 92%, transparent)' }}>
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

  // Scale preview to fit in a small fixed area; clicking expands to a popover
  const MAX_PREVIEW_W = 160;
  const MAX_PREVIEW_H = 130;
  const maskPreviewScale = maskPreview
    ? Math.min(MAX_PREVIEW_W / maskPreview.previewWidth, MAX_PREVIEW_H / maskPreview.previewHeight, 2.0)
    : 1;

  const maskPreviewContent = maskPreview ? (
    <>
      <div className="mask-preview-list">
        {maskPreview.slots.map((slot) => (
          <div key={slot.slotIndex} className={`mask-preview-slot slot-${slot.slotIndex % 2}`}>
            <div className="mask-preview-slot-label">Mask {slot.slotIndex + 1}</div>
            {/* Scaled scaler wrapper — click to open full mask popover */}
            <div
              className="mask-preview-scaler"
              style={{
                width: `${Math.ceil(maskPreview.previewWidth * maskPreviewScale)}px`,
                height: `${Math.ceil(maskPreview.previewHeight * maskPreviewScale)}px`,
                overflow: 'hidden',
                position: 'relative',
                cursor: 'zoom-in',
              }}
              onClick={() => setMaskPopoverOpen(true)}
              title="Click to zoom in"
            >
              <div
                className="mask-preview-word"
                style={{
                  width: `${maskPreview.previewWidth}px`,
                  height: `${maskPreview.previewHeight}px`,
                  transform: `scale(${maskPreviewScale})`,
                  transformOrigin: 'top left',
                  pointerEvents: 'none',
                }}
              >
                {Array.from({ length: maskPreview.activeBytes }, (_, byteIndex) => {
                  const bytePos = maskPreview.bytePositions[byteIndex];
                  const byteLeft = maskPreview.bytePad + (bytePos.col - maskPreview.minByteCol) * (maskPreview.byteWidth + maskPreview.byteGap);
                  const byteTop = maskPreview.bytePad + (bytePos.row - maskPreview.minByteRow) * (maskPreview.byteHeight + maskPreview.byteGap);
                  return (
                    <div
                      key={byteIndex}
                      className="mask-preview-byte"
                      style={{ left: `${byteLeft}px`, top: `${byteTop}px`, width: `${maskPreview.byteWidth}px`, height: `${maskPreview.byteHeight}px` }}
                    >
                      {Array.from({ length: 8 }, (_, bitIndex) => {
                        const absoluteBit = byteIndex * 8 + bitIndex;
                        if (absoluteBit >= maskPreview.totalBits) return null;
                        const bitPos = layoutPos(maskPreview.bitDef, bitIndex);
                        const bitLeft = bitPos.col * (maskPreview.bitSize + maskPreview.bitGap);
                        const bitTop = bitPos.row * (maskPreview.bitSize + maskPreview.bitGap);
                        const active = slot.activeBits.has(absoluteBit);
                        return (
                          <span
                            key={bitIndex}
                            className={`mask-preview-bit${active ? ' active' : ''}`}
                            style={{ left: `${bitLeft}px`, top: `${bitTop}px`, width: `${maskPreview.bitSize}px`, height: `${maskPreview.bitSize}px` }}
                            title={`Bit ${absoluteBit}`}
                          />
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
      {maskPopoverOpen && createPortal(
        <div
          className="mask-popover-backdrop"
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setMaskPopoverOpen(false)}
        >
          <div
            className="mask-popover"
            style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px', maxWidth: '90vw', maxHeight: '85vh', overflow: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--fg-bright)' }}>Mask Detail</span>
              <button
                type="button"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', fontSize: '16px', padding: '2px 6px', borderRadius: '4px' }}
                onClick={() => setMaskPopoverOpen(false)}
                title="Close"
              >✕</button>
            </div>
            {maskSummary?.slotText && maskSummary.slotText !== '-' && (
              <div style={{ marginBottom: '8px', fontSize: '11px', color: 'var(--fg-muted)' }}>
                <span style={{ fontWeight: 600 }}>Pattern: </span>
                <span style={{ fontFamily: 'monospace' }}>{maskSummary.slotText}</span>
              </div>
            )}
            {maskSummary?.routeText && maskSummary.routeText !== '-' && (
              <div style={{ marginBottom: '12px', fontSize: '11px', color: 'var(--fg-muted)' }}>
                <span style={{ fontWeight: 600 }}>Routes: </span>
                <span style={{ fontFamily: 'monospace' }}>{maskSummary.routeText}</span>
              </div>
            )}
            <div className="mask-preview-list" style={{ gap: '16px' }}>
              {maskPreview.slots.map((slot) => {
                const popScale = Math.min(300 / maskPreview.previewWidth, 260 / maskPreview.previewHeight, 4.0);
                const popBitSize = Math.round(maskPreview.bitSize * popScale);
                return (
                  <div key={slot.slotIndex} className={`mask-preview-slot slot-${slot.slotIndex % 2}`}>
                    <div className="mask-preview-slot-label">Mask {slot.slotIndex + 1}</div>
                    {renderMaskGrid(slot, maskPreview, popBitSize)}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      , document.body)}
    </>
  ) : <span className="detail-empty">-</span>;

  const maskMetaLayout = maskPreview && maskPreview.previewHeight > 84 ? 'side' : 'stacked';

  return (
    <div className={`detail-panel ${open ? 'open' : 'collapsed'}${isHeaderHidden ? ' header-hidden' : ''}${isFloating ? ' floating' : ''}`}>
      {open && !playing && <div className="detail-panel-resize" onMouseDown={handleHeightDrag} />}
        <div className="detail-panel-toggle">
        {/* item 353: unified toggle arrow on the left — opens/closes the detail panel */}
        {/*onToggle && (
          <button
            className={`detail-panel-close-btn panel-toggle-arrow${open ? ' is-open' : ''}`}
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            title={open ? 'Hide detail panel' : 'Show detail panel'}
            aria-label={open ? 'Hide detail panel' : 'Show detail panel'}
          >{open ? '∧' : '∨'}</button>
        )*/}
        {/* item 162: dock row — shows floater and/or slider based on independent toggle states */}
        {/*hasDockContent && (
          <div className="detail-panel-dock-row">
            {showAllEventsInPanel && allEventsTransport && (
              <div
                className="detail-panel-all-events-transport"
                onClick={(e) => e.stopPropagation()}dd
                onMouseDown={(e) => e.stopPropagation()}
              >
                {allEventsTransport}
              </div>
            )}
          </div>
        )*/}
        {/* item 162: left toggle = all-events floater */}
        <div className="detail-panel-widget-toggles">
          {onToggleAllEventsFloater && (
            <button
              className={`detail-panel-widget-btn${showAllEventsInPanel ? ' detail-panel-widget-btn--active' : ''}`}
              onClick={(e) => { e.stopPropagation(); onToggleAllEventsFloater(); }}
              title={showAllEventsInPanel ? 'Hide all-events transport' : 'Show all-events transport'}
            >≡</button>
          )}
        </div>
        {/* item 157: dock button — only shown when floating */}
        {isFloating && onDockDetailPanel && (
          <button
            className="detail-panel-dock-btn"
            onClick={(e) => { e.stopPropagation(); onDockDetailPanel(); }}
            title="Dock panel back to bottom"
          >↓</button>
        )}
      </div>

      {(open || isBodyAnimatingOut) && (
        <div className={`detail-panel-body detail-panel-body-compact${bodyAnimClass ? ` body-${bodyAnimClass}` : ''}`} style={{
          maxHeight: `${height || 200}px`,
          ...(width > 0 ? { minWidth: `${width}px`, overflowX: 'auto' } : {}),
        }}>
          {/* item 301: nearby events sidebar — only shown when events panel is collapsed */}

          <div key={stepIndex} className="detail-sections">
              {isEventsPanelCollapsed && surroundingEvents && (surroundingEvents.prev?.length > 0 || surroundingEvents.next?.length > 0) && (
                <section className="detail-section-card" style={{ gridColumn: 'span 1' }}>
                  <div className="detail-nearby-sidebar">
                    {/* item 349: right-arrow button left of NEARBY heading toggles events panel (normal left-slide) */}
                    <div className="detail-nearby-sidebar-header">
                      {/* item 353: panel-toggle-arrow gives unified design */}
                      <div className="detail-nearby-sidebar-title">Nearby</div>
                    </div>
                    <div className="detail-nearby-list">
                      {surroundingEvents.prev?.map((e) => (
                        <div key={e.idx} className="detail-nearby-row detail-nearby-prev" onClick={() => goToStep?.(e.idx)} title={`Go to event ${e.eventId}`}>
                          <span className="detail-nearby-dir">↑</span>
                          <span className="detail-nearby-id">#{e.eventId}</span>
                          <span className="detail-nearby-op">{e.op}</span>
                          {e.bits > 0 && <span className="detail-nearby-bits">+{e.bits}</span>}
                        </div>
                      ))}
                      <div className="detail-nearby-row detail-nearby-current">
                        <span className="detail-nearby-dir">→</span>
                        <span className="detail-nearby-id">#{step.eventId ?? stepIndex}</span>
                        <span className="detail-nearby-op">{step.operation}</span>
                      </div>
                      {surroundingEvents.next?.map((e) => (
                        <div key={e.idx} className="detail-nearby-row detail-nearby-next" onClick={() => goToStep?.(e.idx)} title={`Go to event ${e.eventId}`}>
                          <span className="detail-nearby-dir">↓</span>
                          <span className="detail-nearby-id">#{e.eventId}</span>
                          <span className="detail-nearby-op">{e.op}</span>
                          {e.bits > 0 && <span className="detail-nearby-bits">+{e.bits}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
              </section>
              )}

            <section className="detail-section-card">
              <div className="detail-section-title">Operation &amp; Range</div>
              <div className="detail-section-rows">
                {[...operationFacts, ...rangeFacts].map((row) => (
                  <div key={row.label} className="detail-row">
                    <span className="detail-row-label">{row.label}</span>
                    <span className="detail-row-value">{row.content}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="detail-section-card">
              <div className="detail-section-title">Bits</div>
              <div className="detail-section-rows">
                {annotationFacts.map((row) => (
                  <div key={row.label} className="detail-row detail-row-sub">
                    <span className="detail-row-label">{row.label}</span>
                    <span className="detail-row-value">{row.content}</span>
                  </div>
                ))}

                {bitsFacts.map((stat) => {
                  const isGridViewRow = !!stat.gridViewMode;
                  const isActive = isGridViewRow && !!bitsGridView?.[stat.gridViewMode];
                  const GV_COLORS = { changed: '#f59e0b', targeted: '#3b82f6', alreadySet: '#4ade80', newlySet: '#fbbf24' };
                  const handleClick = isGridViewRow && onBitsGridViewChange
                    ? () => onBitsGridViewChange({ ...bitsGridView, [stat.gridViewMode]: !bitsGridView?.[stat.gridViewMode] })
                    : null;
                  // item 446: compact range + inspect button for the 4 bit-category rows
                  const hasInspect = !!stat.inspectMode && !!stat.bitsRanges && !!onInspectBitCategory;
                  return (
                    <div
                      key={stat.label}
                      className={`detail-row${isGridViewRow ? ' detail-row-gridview' : ''}${isActive ? ' detail-row-gridview--active' : ''}`}
                      onClick={handleClick || undefined}
                      style={isGridViewRow
                        ? { cursor: handleClick ? 'pointer' : undefined, '--gv-accent': GV_COLORS[stat.gridViewMode] }
                        : handleClick ? { cursor: 'pointer' } : undefined}
                      title={isGridViewRow ? (isActive ? 'Click to toggle off this grid view' : `Toggle ${stat.label.toLowerCase()} highlight in grid`) : undefined}
                    >
                      <span className="detail-row-label">{stat.label}</span>
                      <span
                        className="detail-row-value detail-row-value-num"
                        style={hasInspect ? { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', overflow: 'hidden', maxWidth: '100%' } : undefined}
                      >
                        <span>{stat.value}</span>
                        {hasInspect && (
                          <button
                            className="detail-inspect-btn detail-inspect-btn--inline"
                            onClick={(e) => { e.stopPropagation(); onInspectBitCategory(stat.inspectMode); }}
                            title={`Inspect ${stat.label.toLowerCase()} in a searchable list`}
                          >
                            <span className="dt-mono">{stat.bitsRanges.text}</span>
                            {stat.bitsRanges.more > 0 && <span className="detail-inspect-hint">+{stat.bitsRanges.more} more ↗</span>}
                          </button>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="detail-section-card" style={{ gridColumn: 'span 2' }}>
              <div className="detail-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Mask pattern &amp; preview</span>
                {step.aggMaskSteps && step.aggMaskSteps.length > 1 && onAggMaskStepChange && (
                  <span className="agg-mask-nav" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
                    <button
                      className="agg-mask-nav-btn"
                      disabled={aggMaskStepIndex <= 0}
                      onClick={() => onAggMaskStepChange(aggMaskStepIndex - 1)}
                      title="Previous mask"
                      style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '3px', cursor: aggMaskStepIndex <= 0 ? 'default' : 'pointer', padding: '1px 5px', color: 'var(--fg-muted)', opacity: aggMaskStepIndex <= 0 ? 0.35 : 1 }}
                    >‹</button>
                    <span style={{ color: 'var(--fg-muted)', fontSize: '10px' }}>
                      Event {aggMaskStepIndex + 1} / {step.aggMaskSteps.length}
                    </span>
                    <button
                      className="agg-mask-nav-btn"
                      disabled={aggMaskStepIndex >= step.aggMaskSteps.length - 1}
                      onClick={() => onAggMaskStepChange(aggMaskStepIndex + 1)}
                      title="Next mask"
                      style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '3px', cursor: aggMaskStepIndex >= step.aggMaskSteps.length - 1 ? 'default' : 'pointer', padding: '1px 5px', color: 'var(--fg-muted)', opacity: aggMaskStepIndex >= step.aggMaskSteps.length - 1 ? 0.35 : 1 }}
                    >›</button>
                  </span>
                )}
              </div>
              <div className="mask-section-body">
                <div className="mask-section-preview">
                  {maskPreviewContent}
                </div>
                <div className="mask-section-meta">
                  <div className="detail-row">
                    <span className="detail-row-label">Mask type</span>
                    <span className="detail-row-value">
                      {maskType
                        ? <span className="detail-tag block-tag">{maskType}</span>
                        : <span className="detail-empty">—</span>}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-row-label">{patternFact.label}</span>
                    <span className="detail-row-value">{patternFact.content}</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="detail-section-card">
              <div className="detail-section-title">Timings</div>
              <div className="detail-section-rows">
                {timingFacts.map((row) => (
                  <div key={row.label} className="detail-row">
                    <span className="detail-row-label">{row.label}</span>
                    <span className="detail-row-value">{row.content}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* item 178 / 301: Nearby events moved to detail-nearby-sidebar (shown when events panel is collapsed) */}

          </div>
        </div>
      )}
      {open && <div className="detail-panel-width-handle" onMouseDown={handleWidthDrag} />}
    </div>
  );
}
