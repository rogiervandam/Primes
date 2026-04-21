import React, { useMemo, useCallback } from 'react';
import { bitToNumber } from './SieveRenderer';

/**
 * Collapsible detail panel with adjustable height.
 */
export default function DetailPanel({ step, stepIndex, open, onToggle, height, onHeightChange, width, onWidthChange, playing, stepStats, storageModel }) {
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
    // Limit display
    if (ranges.length > 20) {
      return ranges.slice(0, 20).join(', ') + ` … (+${ranges.length - 20} more ranges)`;
    }
    return ranges.join(', ');
  }, [step]);

  // Convert changed bits to number representation
  const numberSummary = useMemo(() => {
    if (!step || step.changedBits.length === 0) return '';
    const bits = Array.from(step.changedBits).sort((a, b) => a - b);
    const model = storageModel || 'half';
    const nums = bits.slice(0, 20).map(b => bitToNumber(b, model));
    let text = nums.join(', ');
    if (bits.length > 20) text += ` … (+${bits.length - 20} more)`;
    return text;
  }, [step, storageModel]);

  // Height drag handler
  const handleHeightDrag = useCallback((e) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = height || 200;
    const onMove = (ev) => {
      const delta = startY - ev.clientY;
      onHeightChange(Math.max(180, Math.min(700, startHeight + delta)));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [height, onHeightChange]);

  // Width drag handler (drag right edge)
  const handleWidthDrag = useCallback((e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = width || 0;
    const onMove = (ev) => {
      const delta = ev.clientX - startX;
      onWidthChange(Math.max(0, startWidth + delta));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [width, onWidthChange]);

  if (!step) return null;

  const panelTitle = [
    step.prime != null ? `Prime ${step.prime}` : null,
    `Event ${step.stepId ?? stepIndex}`,
    step.operation || null,
    step.numChanged > 0 ? `+${step.numChanged} bits` : null,
  ].filter(Boolean).join(' | ');

  const rowValues = [
    {
      label: 'Operation',
      content: step.operation ? <span className="detail-tag op-tag">{step.operation}</span> : <span className="detail-empty">-</span>,
    },
    {
      label: 'Prime',
      content: step.prime != null ? <span className="detail-tag prime-tag">{step.prime}</span> : <span className="detail-empty">-</span>,
    },
    {
      label: 'Range',
      content: step.start != null && step.stop != null
        ? <span className="detail-tag block-tag">[{step.start} – {step.stop}]</span>
        : <span className="detail-empty">-</span>,
    },
    {
      label: 'Step size',
      content: step.factorStep != null ? <span className="detail-tag step-tag">{step.factorStep}</span> : <span className="detail-empty">-</span>,
    },
    {
      label: 'Bits changed',
      content: <span className="dt-changed">{step.numChanged ?? 0}</span>,
    },
    {
      label: 'Newly set',
      content: <span className="dt-changed">{stepStats?.newlySet ?? '-'}</span>,
    },
    {
      label: 'Already set',
      content: <span className="dt-changed">{stepStats?.reSet ?? '-'}</span>,
    },
    {
      label: 'Total set',
      content: <span className="dt-changed">{stepStats?.totalSet ?? '-'}</span>,
    },
    {
      label: 'Bit ranges',
      content: step.numChanged > 0 ? <span className="dt-mono">{bitRanges}</span> : <span className="detail-empty">-</span>,
    },
    {
      label: 'Numbers marked',
      content: step.numChanged > 0 ? <span className="dt-mono">{numberSummary}</span> : <span className="detail-empty">-</span>,
    },
    {
      label: 'Annotation',
      content: step.annotation ? <span className="dt-annotation">{step.annotation}</span> : <span className="detail-empty">-</span>,
    },
  ];

  return (
    <div className={`detail-panel ${open ? 'open' : 'collapsed'}`}>
      {open && !playing && <div className="detail-panel-resize" onMouseDown={handleHeightDrag} />}
      <div className="detail-panel-toggle" onClick={onToggle}>
        <span className="detail-panel-title">{panelTitle}</span>
        <span className="detail-panel-arrow">{open ? '▼' : '▲'}</span>
      </div>

      {open && (
        <div className="detail-panel-body" style={{
          ...(playing ? { height: `${height || 200}px` } : { maxHeight: `${height || 200}px` }),
          ...(width > 0 ? { minWidth: `${width}px`, overflowX: 'auto' } : {}),
        }}>
          <table className="detail-table">
            <tbody>
              {rowValues.map((row) => (
                <tr key={row.label}>
                  <td className="dt-label">{row.label}</td>
                  <td>{row.content}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {open && <div className="detail-panel-width-handle" onMouseDown={handleWidthDrag} />}
    </div>
  );
}
