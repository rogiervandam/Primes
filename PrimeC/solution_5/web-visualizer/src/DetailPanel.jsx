import React, { useMemo } from 'react';

/**
 * Collapsible detail panel showing full information about the current step.
 * Shows: operation, prime, block range, factor step, changed bits summary, annotation.
 */
export default function DetailPanel({ step, stepIndex, open, onToggle }) {
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

  // Convert changed bits to number representation (bit i → number 2i+1)
  const numberSummary = useMemo(() => {
    if (!step || step.changedBits.length === 0) return '';
    const bits = Array.from(step.changedBits).sort((a, b) => a - b);
    const nums = bits.slice(0, 20).map(b => b * 2 + 1);
    let text = nums.join(', ');
    if (bits.length > 20) text += ` … (+${bits.length - 20} more)`;
    return text;
  }, [step]);

  if (!step) return null;

  return (
    <div className={`detail-panel ${open ? 'open' : 'collapsed'}`}>
      <div className="detail-panel-toggle" onClick={onToggle}>
        <span className="detail-panel-title">Step {stepIndex} Details</span>
        <span className="detail-panel-arrow">{open ? '▼' : '▲'}</span>
      </div>

      {open && (
        <div className="detail-panel-body">
          <table className="detail-table">
            <tbody>
              {step.operation && (
                <tr>
                  <td className="dt-label">Operation</td>
                  <td><span className="detail-tag op-tag">{step.operation}</span></td>
                </tr>
              )}
              {step.prime != null && (
                <tr>
                  <td className="dt-label">Prime</td>
                  <td><span className="detail-tag prime-tag">{step.prime}</span></td>
                </tr>
              )}
              {step.blockStart != null && step.blockStop != null && (
                <tr>
                  <td className="dt-label">Block range</td>
                  <td><span className="detail-tag block-tag">[{step.blockStart} – {step.blockStop}]</span></td>
                </tr>
              )}
              {step.factorStep != null && (
                <tr>
                  <td className="dt-label">Factor step</td>
                  <td><span className="detail-tag step-tag">{step.factorStep}</span></td>
                </tr>
              )}
              <tr>
                <td className="dt-label">Bits changed</td>
                <td className="dt-changed">{step.numChanged}</td>
              </tr>
              {step.numChanged > 0 && (
                <tr>
                  <td className="dt-label">Bit ranges</td>
                  <td className="dt-mono">{bitRanges}</td>
                </tr>
              )}
              {step.numChanged > 0 && (
                <tr>
                  <td className="dt-label">Numbers marked</td>
                  <td className="dt-mono">{numberSummary}</td>
                </tr>
              )}
              {step.annotation && (
                <tr>
                  <td className="dt-label">Annotation</td>
                  <td className="dt-annotation">{step.annotation}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
