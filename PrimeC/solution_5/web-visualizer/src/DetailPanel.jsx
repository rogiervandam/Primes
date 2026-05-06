import React, { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import { BIT_LAYOUTS, BYTE_LAYOUTS, bitToNumber } from './SieveRenderer';
import { formatNs } from './TimingPanel';
import { useDragResize } from './hooks/interactions';

const GRID3X3_MAP = [0, 1, 2, 3, 5, 6, 7, 8];

function layoutPos(layout, index) {
  if (layout.grid3x3) {
    const cell = GRID3X3_MAP[index];
    return { col: cell % 3, row: Math.floor(cell / 3) };
  }
  return { col: index % layout.cols, row: Math.floor(index / layout.cols) };
}

/**
 * Collapsible detail panel with adjustable height.
 */
export default function DetailPanel({
  step,
  stepIndex,
  open,
  onToggle,
  height,
  onHeightChange,
  width,
  onWidthChange,
  playing,
  stepStats,
  storageModel,
  wheelDefinition,
  bitLayout = '4x2',
  byteLayout = '4x2',
  benchmarkTimingData,
  onInspectChangedBits,
  onInspectMarkedNumbers,
  eventTitleVisible,
  onShowEventTitle,
  eventAnimSliders,
  onOpenRawLog,
  sourceLineNumber,
  hasRawSource = false,
  allEventsTransport,
}) {
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
    if (!step || !Number.isFinite(step.maskWordBits) || step.maskWordBits <= 0) return null;

    const slotBits = Array.isArray(step.maskSlotBits)
      ? step.maskSlotBits
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
      if (!step.maskWriteOrderWords || step.maskWriteOrderWords.length === 0) return [];
      const items = [];
      for (let index = 0; index < step.maskWriteOrderWords.length; index++) {
        const word = Number(step.maskWriteOrderWords[index]);
        const slot = Number(step.maskWriteOrderSlots?.[index] ?? 0);
        if (!Number.isFinite(word) || word < 0) continue;
        items.push(`w${word}:${slot + 1}`);
      }
      return items;
    })();

    return {
      wordBits: step.maskWordBits,
      slotBits,
      slotText: slotBits.length > 0 ? slotBits.map((entry) => entry.text).join(' | ') : '-',
      routeText: writeEntries.length > 0
        ? (writeEntries.length > 18
          ? `${writeEntries.slice(0, 18).join(', ')} … (+${writeEntries.length - 18} more)`
          : writeEntries.join(', '))
        : '-',
    };
  }, [step]);

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
  const prevOpenRef = useRef(open);
  useEffect(() => {
    const prev = prevOpenRef.current;
    prevOpenRef.current = open;
    if (!prev && open) {
      // Opening: animate in
      setBodyAnimClass('expanding-in');
      const t = setTimeout(() => setBodyAnimClass(''), 450);
      return () => clearTimeout(t);
    } else if (prev && !open) {
      // Closing: animate out then hide
      setBodyAnimClass('collapsing-out');
      setIsBodyAnimatingOut(true);
      const t = setTimeout(() => { setIsBodyAnimatingOut(false); setBodyAnimClass(''); }, 450);
      return () => clearTimeout(t);
    }
  }, [open]);

  if (!step) return null;

  const panelTitle = [
    step.prime != null ? `Prime ${step.prime}` : null,
    `Event ${step.stepId ?? stepIndex}`,
    step.operation || null,
    step.numChanged > 0 ? `+${step.numChanged} bits` : null,
  ].filter(Boolean).join(' | ');

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
        : hasRawSource && step?.annotation
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
  const bitsFacts = [
    { label: 'Bits changed', value: step.numChanged ?? 0 },
    { label: 'Newly set', value: stepStats?.newlySet ?? '—' },
    { label: 'Already set', value: stepStats?.reSet ?? '—' },
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

  const maskPreviewContent = maskPreview ? (
    <div className="mask-preview-list">
      {maskPreview.slots.map((slot) => (
        <div key={slot.slotIndex} className={`mask-preview-slot slot-${slot.slotIndex % 2}`}>
          <div className="mask-preview-slot-label">Mask {slot.slotIndex + 1}</div>
          <div
            className="mask-preview-word"
            style={{ width: `${maskPreview.previewWidth}px`, height: `${maskPreview.previewHeight}px` }}
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
      ))}
    </div>
  ) : <span className="detail-empty">-</span>;

  const maskMetaLayout = maskPreview && maskPreview.previewHeight > 84 ? 'side' : 'stacked';

  return (
    <div className={`detail-panel ${open ? 'open' : 'collapsed'}`}>
      {open && !playing && <div className="detail-panel-resize" onMouseDown={handleHeightDrag} />}
      <div className="detail-panel-toggle" onClick={onToggle}>
        {(!eventTitleVisible || true) && (
          <button
            className="detail-panel-show-banner-btn"
            onClick={(e) => { e.stopPropagation(); onShowEventTitle && onShowEventTitle(); if (open) onToggle(); }}
            title="Show event title"
          >▲</button>
        )}
        <div className="detail-panel-title">
          <span className="detail-panel-title-main">{panelTitle}</span>
          {step.annotation && <span className="detail-panel-annotation">{step.annotation}</span>}
        </div>
        <span className="detail-panel-arrow">{open ? '▼' : '▲'}</span>
      </div>

      {(allEventsTransport || (!eventTitleVisible && eventAnimSliders)) && (
        <div className="detail-panel-dock-row">
          {allEventsTransport && (
            <div className="detail-panel-all-events-transport">
              {allEventsTransport}
            </div>
          )}
          {!eventTitleVisible && eventAnimSliders && (
            <div className="detail-panel-event-sliders">
              {eventAnimSliders}
            </div>
          )}
        </div>
      )}

      {(open || isBodyAnimatingOut) && (
        <div className={`detail-panel-body detail-panel-body-compact${bodyAnimClass ? ` body-${bodyAnimClass}` : ''}`} style={{
          ...(playing ? { height: `${height || 200}px` } : { maxHeight: `${height || 200}px` }),
          ...(width > 0 ? { minWidth: `${width}px`, overflowX: 'auto' } : {}),
        }}>
          <div className="detail-sections">
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

                {bitsFacts.map((stat) => (
                  <div key={stat.label} className="detail-row">
                    <span className="detail-row-label">{stat.label}</span>
                    <span className="detail-row-value detail-row-value-num">{stat.value}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="detail-section-card" style={{ gridColumn: 'span 2' }}>
              <div className="detail-section-title">Mask pattern &amp; preview</div>
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

          </div>
        </div>
      )}
      {open && <div className="detail-panel-width-handle" onMouseDown={handleWidthDrag} />}
    </div>
  );
}
