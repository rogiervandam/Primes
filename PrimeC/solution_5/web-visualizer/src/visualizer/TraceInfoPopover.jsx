import React, { useState, useCallback, useEffect, useRef } from 'react';
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
 * @param {string|null} props.rawSource    Original file text, shown via "View raw log".
 * @param {object}    props.lineToStep     Map of raw-source line index → step index.
 * @param {function}  props.onJumpToStep   Called with stepIndex when a linked line number is clicked.
 * @param {number|null} props.rawScrollToLine  When set, open the raw log and scroll to this line index.
 * @param {function}  props.onClearRawScrollToLine  Called after scroll target is consumed.
 */
export default function TraceInfoPopover({
  popoverRef, storageModel, setStorageModel, header, sections, rawSource,
  lineToStep, onJumpToStep, rawScrollToLine, onClearRawScrollToLine,
}) {
  const [rawOpen, setRawOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  // Always keep explicit absolute position — avoids flex↔absolute jump on first drag.
  // Default to near the top of the viewport (below the toolbar) rather than centered.
  const [dlgPos, setDlgPos] = useState(() => ({
    x: Math.max(0, Math.round((window.innerWidth - 900) / 2)),
    y: 60,
  }));
  const [dlgSize, setDlgSize] = useState({ w: 900, h: 580 });
  const dlgRef = useRef(null);
  const contentRef = useRef(null);

  // Open and scroll to a specific line when requested from outside (e.g. Detail Panel).
  useEffect(() => {
    if (rawScrollToLine == null) return;
    setRawOpen(true);
  }, [rawScrollToLine]);

  useEffect(() => {
    if (!rawOpen || rawScrollToLine == null) return;
    const lineIdx = rawScrollToLine;
    const raf = requestAnimationFrame(() => {
      const el = contentRef.current?.querySelector(`[data-lineindex="${lineIdx}"]`);
      el?.scrollIntoView({ block: 'center' });
      onClearRawScrollToLine?.();
    });
    return () => cancelAnimationFrame(raf);
  // rawScrollToLine deliberately omitted — we only want to re-scroll when rawOpen flips true
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawOpen, onClearRawScrollToLine]);

  const rawLines = rawSource ? rawSource.split(/\r?\n/) : [];

  const handleCopy = useCallback(() => {
    if (!rawSource) return;
    navigator.clipboard.writeText(rawSource).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }).catch(() => {});
  }, [rawSource]);

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
      <div className="trace-info-popover" ref={popoverRef}>
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
        {rawSource && (
          <div className="trace-info-section trace-info-raw-section">
            <button
              type="button"
              className="trace-info-raw-btn"
              onClick={() => setRawOpen(true)}
            >
              View raw log
            </button>
          </div>
        )}
      </div>

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
              {rawLines.map((line, i) => {
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
            </div>
            <div className="raw-log-resize-handle" onMouseDown={startResize} />
          </div>
        </div>
      )}
    </>
  );
}
