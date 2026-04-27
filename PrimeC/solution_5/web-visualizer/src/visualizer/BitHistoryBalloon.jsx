import React from 'react';

/**
 * Floating popover anchored next to a sieve bit. Shows the bit's identity
 * (number, byte, word, qword, cache line) and its modification history.
 *
 * Two modes are supported via the `pinned` prop:
 *  - `pinned`  → rendered for bits in the user's pinned set; has a close
 *                button and the 📌 marker.
 *  - hover     → ephemeral popover following the mouse; includes a hint line
 *                explaining click-to-lock.
 *
 * @param {object}   props
 * @param {object}   props.info             Output of `computeBitInfo(bitIdx)`.
 * @param {boolean}  props.pinned           True for click-locked balloons.
 * @param {object}   props.style            Inline style (position) from the layout solver.
 * @param {boolean}  props.clipped          True when the layout solver decided to hide the panel.
 * @param {number}   props.cachelineSize    Cache line size in bytes (for the indices table).
 * @param {number}   props.currentStep      Currently active step (for highlighting in the history).
 * @param {function} props.onClose          Called when the close button is clicked (pinned only).
 * @param {function} props.onHistoryClick   Called with `(stepIndex)` when a history row is clicked.
 * @param {string}   props.keyPrefix        Used to namespace `<tr key>` attributes for history rows.
 */
export default function BitHistoryBalloon({
  info,
  pinned,
  style,
  clipped,
  cachelineSize,
  currentStep,
  onClose,
  onHistoryClick,
  keyPrefix,
}) {
  if (!info) return null;
  const bi = info.bitIndex;
  const byteIdx = Math.floor(bi / 8);
  const bitInByte = bi % 8;
  const u32Idx = Math.floor(bi / 32);
  const bitInU32 = bi % 32;
  const u64Idx = Math.floor(bi / 64);
  const bitInU64 = bi % 64;
  const clIdx = Math.floor(bi / (cachelineSize * 8));
  const className =
    `bit-history-panel${pinned ? ' locked' : ''} hover-balloon${clipped ? ' clipped' : ''}`;

  return (
    <div className={className} style={style}>
      <div className="bit-history-header">
        <span>{pinned ? '📌 ' : ''}Bit {bi} → #{info.number}</span>
        {pinned && onClose && (
          <button className="bit-history-close" onClick={onClose}>✕</button>
        )}
      </div>
      {info.isPrime && (
        <div className="bit-prime-notice">★ {info.number} is prime</div>
      )}
      <div className="bit-history-indices">
        <table className="bit-index-table">
          <tbody>
            <tr><td>Bit</td><td>{bi}</td></tr>
            <tr><td>Number</td><td>{info.number}</td></tr>
            <tr><td>uint8 (byte)</td><td>byte #{byteIdx}, bit {bitInByte}</td></tr>
            <tr><td>uint32</td><td>word #{u32Idx}, bit {bitInU32}</td></tr>
            <tr><td>uint64</td><td>qword #{u64Idx}, bit {bitInU64}</td></tr>
            <tr><td>Cache line</td><td>#{clIdx} ({cachelineSize}B)</td></tr>
          </tbody>
        </table>
      </div>
      <div className="bit-history-body">
        {info.history.length === 0 ? (
          <p className="bit-history-empty">No events have modified this bit.</p>
        ) : (
          <table className="bit-history-table">
            <thead>
              <tr><th>Event</th><th>Operation</th><th>Prime</th></tr>
            </thead>
            <tbody>
              {info.history.map((h) => (
                <tr
                  key={`${keyPrefix}-${bi}-${h.stepIndex}`}
                  className={h.stepIndex === currentStep ? 'bh-current' : ''}
                  onClick={() => onHistoryClick && onHistoryClick(h.stepIndex)}
                >
                  <td>{h.stepIndex}</td>
                  <td>{h.operation || '—'}</td>
                  <td>{h.prime != null ? h.prime : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {!pinned && (
        <div className="bit-history-hint">Click to lock. Double-click to keep only this balloon.</div>
      )}
    </div>
  );
}
