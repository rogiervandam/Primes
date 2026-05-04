import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { STORAGE_MODELS } from '../SieveRenderer';

/**
 * Popover anchored to the trace title showing storage model + parsed
 * header sections. Pure presentational — parent controls open state.
 *
 * @param {object}  props
 * @param {React.Ref} props.popoverRef     Ref attached to the popover root for outside-click handling.
 * @param {string}    props.storageModel   Currently selected storage model key.
 * @param {function}  props.setStorageModel Setter for the storage model select.
 * @param {object}    props.header         Parsed trace header (for hint text).
 * @param {Array}     props.sections       Output of `buildTraceInfoSections`.
 * @param {function}   props.onFetchRawSource  Async callback that resolves to the raw source text.
 * @param {object}    props.lineToStep     Map of raw-source line index → step index.
 * @param {function}  props.onJumpToStep   Called with stepIndex when a linked line number is clicked.
 * @param {number|null} props.rawScrollToLine  When set, open the raw log and scroll to this line index.
 * @param {function}  props.onClearRawScrollToLine  Called after scroll target is consumed.
 */
export default function TraceInfoPopover({
  popoverRef, visible = true, storageModel, setStorageModel, header, sections, onFetchRawSource,
  lineToStep, onJumpToStep, rawScrollToLine, onClearRawScrollToLine,
}) {
  const [rawOpen, setRawOpen] = useState(false);
  const [wheelOpen, setWheelOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  // Lazily-fetched raw source: fetched on first open, cached thereafter.
  const [rawLines, setRawLines] = useState(null);   // string[] | null
  const [rawFetching, setRawFetching] = useState(false);
  const rawCacheRef = useRef(null);
  // Always keep explicit absolute position — avoids flex↔absolute jump on first drag.
  // Default to near the top of the viewport (below the toolbar) rather than centered.
  const [dlgPos, setDlgPos] = useState(() => ({
    x: Math.max(0, Math.round((window.innerWidth - 900) / 2)),
    y: 60,
  }));
  const [dlgSize, setDlgSize] = useState({ w: 900, h: 580 });
  const dlgRef = useRef(null);
  const contentRef = useRef(null);

  // Fetch raw source and open dialog.
  const openRawLog = useCallback(async () => {
    setRawOpen(true);
    if (rawCacheRef.current) return; // already fetched
    if (!onFetchRawSource) return;
    setRawFetching(true);
    try {
      const text = await onFetchRawSource();
      rawCacheRef.current = text;
      setRawLines(text.split(/\r?\n/));
    } catch (err) {
      console.error('[TraceInfoPopover] Failed to fetch raw source:', err);
    } finally {
      setRawFetching(false);
    }
  }, [onFetchRawSource]);

  // Open and scroll to a specific line when requested from outside (e.g. Detail Panel).
  useEffect(() => {
    if (rawScrollToLine == null) return;
    openRawLog();
  }, [rawScrollToLine, openRawLog]);

  useEffect(() => {
    if (!rawOpen || rawScrollToLine == null || !rawLines) return;
    const lineIdx = rawScrollToLine;
    const raf = requestAnimationFrame(() => {
      const el = contentRef.current?.querySelector(`[data-lineindex="${lineIdx}"]`);
      el?.scrollIntoView({ block: 'center' });
      onClearRawScrollToLine?.();
    });
    return () => cancelAnimationFrame(raf);
  // rawScrollToLine deliberately omitted — we only want to re-scroll when rawOpen/rawLines flip
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawOpen, rawLines, onClearRawScrollToLine]);


  const wheelRows = useMemo(() => {
    const wheel = header?.wheel;
    if (!wheel || !Array.isArray(wheel.mapNumbers) || !Array.isArray(wheel.mapBits)) return [];
    const count = Math.min(wheel.mapNumbers.length, wheel.mapBits.length);
    return Array.from({ length: count }, (_, index) => {
      const relativeNumber = wheel.mapNumbers[index];
      const relativeBit = wheel.mapBits[index];
      return {
        relativeNumber,
        relativeBit,
        nextNumber: relativeNumber + wheel.wheelSize,
        nextBit: relativeBit + wheel.bitsPerWheel,
      };
    });
  }, [header?.wheel]);

  const handleCopy = useCallback(async () => {
    if (!onFetchRawSource) return;
    try {
      const text = rawCacheRef.current ?? await onFetchRawSource();
      if (!rawCacheRef.current) {
        rawCacheRef.current = text;
        setRawLines(text.split(/\r?\n/));
      }
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (err) {
      console.error('[TraceInfoPopover] Copy failed:', err);
    }
  }, [onFetchRawSource]);

  const handleLineClick = useCallback((stepIdx) => {
    setRawOpen(false);
    onJumpToStep?.(stepIdx);
  }, [onJumpToStep]);

  const startDrag = useCallback((e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const posX = dlgPos.x;
    const posY = dlgPos.y;
    const onMove = (me) => {
      setDlgPos({
        x: Math.max(0, posX + me.clientX - startX),
        y: Math.max(0, posY + me.clientY - startY),
      });
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [dlgPos.x, dlgPos.y]);

  const startResize = useCallback((e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = dlgSize.w;
    const startH = dlgSize.h;
    const onMove = (me) => {
      setDlgSize({
        w: Math.max(420, startW + me.clientX - startX),
        h: Math.max(240, startH + me.clientY - startY),
      });
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [dlgSize.w, dlgSize.h]);

  const dlgStyle = {
    position: 'absolute',
    left: dlgPos.x,
    top: dlgPos.y,
    width: dlgSize.w,
    height: dlgSize.h,
  };

  return (
    <>
      {visible && <div className="trace-info-popover" ref={popoverRef}>
        {onFetchRawSource && (
          <div className="trace-info-section trace-info-raw-section">
            <button
              type="button"
              className="trace-info-raw-btn"
              onClick={openRawLog}
            >
              View raw log
            </button>
          </div>
        )}
        <div className="trace-info-section">
          <div className="trace-info-section-title">Storage model</div>
          <div className="trace-info-row">
            <select
              className="trace-info-storage-select"
              value={storageModel || 'half'}
              onChange={(e) => setStorageModel(e.target.value)}
              title={`Detected from log: ${header.storageModel || 'half'}`}
            >
              {Object.entries(STORAGE_MODELS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          {header.storageModel && header.storageModel !== storageModel && (
            <div className="trace-info-row trace-info-row-hint">
              Log reported <code>{header.storageModel}</code> — override active.
            </div>
          )}
          {header.rawStorageModel && header.rawStorageModel !== header.storageModel && (
            <div className="trace-info-row trace-info-row-hint">
              Trace storage <code>{header.rawStorageModel}</code>
            </div>
          )}
          {header.wheel && (
            <div className="trace-info-wheel">
              <div className="trace-info-row trace-info-row-kv">
                <span className="trace-info-key">Wheel</span>
                <span className="trace-info-value">
                  {header.wheel.mapCount || wheelRows.length} bits / {header.wheel.wheelSize} numbers
                </span>
              </div>
              <div className="trace-info-row trace-info-row-kv">
                <span className="trace-info-key">Period</span>
                <span className="trace-info-value">
                  {header.wheel.bitsPerWheel} bits, base {header.wheel.baseSize}, repeats {header.wheel.repeats}
                </span>
              </div>
              <button
                type="button"
                className="trace-info-wheel-toggle"
                onClick={() => setWheelOpen((value) => !value)}
              >
                {wheelOpen ? 'Hide wheel map' : 'Inspect wheel map'}
              </button>
              {wheelOpen && (
                <div className="trace-info-wheel-table-wrap">
                  <table className="trace-info-wheel-table">
                    <thead>
                      <tr>
                        <th>Rel Bit</th>
                        <th>Rel Number</th>
                        <th>Next Bit</th>
                        <th>Next Number</th>
                      </tr>
                    </thead>
                    <tbody>
                      {wheelRows.map((row) => (
                        <tr key={`wheel-${row.relativeBit}-${row.relativeNumber}`}>
                          <td>{row.relativeBit}</td>
                          <td>{row.relativeNumber}</td>
                          <td>{row.nextBit}</td>
                          <td>{row.nextNumber}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
        {sections.map((section) => (
          <div key={section.title} className="trace-info-section">
            <div className="trace-info-section-title">{section.title}</div>
            {section.rows.map((row) => (
              <div key={`${section.title}-${row.label}-${row.value}`} className="trace-info-row trace-info-row-kv">
                <span className="trace-info-key">{row.label}</span>
                <span className="trace-info-value">{row.value}</span>
              </div>
            ))}
          </div>
        ))}
      </div>}

      {rawOpen && (
        <div
          className="raw-log-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Raw log file"
          onKeyDown={(e) => { if (e.key === 'Escape') setRawOpen(false); }}
          onClick={(e) => e.stopPropagation()}
          tabIndex={-1}
        >
          <div className="raw-log-dialog" ref={dlgRef} style={dlgStyle}>
            <div className="raw-log-toolbar" onMouseDown={startDrag}>
              <span className="raw-log-title">Raw log</span>
              <button
                type="button"
                className="raw-log-copy-btn"
                onClick={handleCopy}
                title="Copy all to clipboard"
                onMouseDown={(e) => e.stopPropagation()}
              >
                {copied ? 'Copied!' : 'Copy all'}
              </button>
              <button
                type="button"
                className="raw-log-close-btn"
                onClick={() => setRawOpen(false)}
                title="Close (Esc)"
                onMouseDown={(e) => e.stopPropagation()}
                autoFocus
              >
                ✕
              </button>
            </div>
            <div className="raw-log-content" ref={contentRef}>
              {rawFetching && (
                <div className="raw-log-loading">Loading…</div>
              )}
              {!rawFetching && rawLines && rawLines.map((line, i) => {
                const stepIdx = lineToStep?.[i];
                const hasStep = stepIdx !== undefined;
                return (
                  <div
                    key={i}
                    className={`raw-log-line${hasStep ? ' raw-log-line--linked' : ''}`}
                    data-lineindex={i}
                  >
                    {hasStep ? (
                      <button
                        type="button"
                        className="raw-log-linenum raw-log-linenum--linked"
                        onClick={() => handleLineClick(stepIdx)}
                        title={`Jump to event ${stepIdx}`}
                      >
                        {i + 1}
                      </button>
                    ) : (
                      <span className="raw-log-linenum">{i + 1}</span>
                    )}
                    <span className="raw-log-line-text">{line || '\u00A0'}</span>
                  </div>
                );
              })}
              {!rawFetching && !rawLines && !onFetchRawSource && (
                <div className="raw-log-loading">Raw source not available.</div>
              )}
            </div>
            <div className="raw-log-resize-handle" onMouseDown={startResize} />
          </div>
        </div>
      )}
    </>
  );
}
