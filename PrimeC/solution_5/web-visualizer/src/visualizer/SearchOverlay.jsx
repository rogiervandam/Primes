/**
 * SearchOverlay — macOS Spotlight-style full-overlay search. (item 239)
 *
 * Triggered by the `/` key (or Cmd+K).  Shows a large centred input field
 * with live results below it.  Supports:
 *
 *   Navigation queries:
 *     "bit N"           → navigate to bit N
 *     "byte N"          → navigate to byte N
 *     "bits N-M"        → navigate to the start of that range
 *     "number N"        → navigate to the number (converted to bit index)
 *     "N"               → treat a plain integer as a bit index
 *
 *   Event queries:
 *     Any other text    → fuzzy-filter events by index, operation, annotation,
 *                         prime, or detail annotation
 *
 * Keyboard navigation: Up/Down to highlight, Enter to select, Escape to close.
 */
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';

// Maximum event results shown
const MAX_EVENTS = 12;

function parseNavQuery(q) {
  const lower = q.trim().toLowerCase();

  // ── Ranges ────────────────────────────────────────────────────────────────
  // "bits N-M", "bytes N-M", "uint32 N-M", "uint64 N-M", "number N-M", "group N-M"
  let m = lower.match(/^(bits?|bytes?|uint32|uint64|vector|numbers?|num|group)\s+(\d+)\s*[-–]\s*(\d+)$/);
  if (m) {
    const type = m[1].replace(/s$/, '');
    const from = m[2], to = m[3];
    const typeLabel = { bit:'bit', byte:'byte', uint32:'uint32', uint64:'uint64', vector:'vector', number:'number', num:'number', group:'group' }[type] ?? type;
    return { type: 'range', label: `Highlight ${typeLabel} range ${from}–${to}`, navQuery: `${type} ${from}-${to}` };
  }
  // Plain range "N-M" → bit range
  m = lower.match(/^(\d+)\s*[-–]\s*(\d+)$/);
  if (m) return { type: 'range', label: `Highlight bit range ${m[1]}–${m[2]}`, navQuery: `${m[1]}-${m[2]}` };

  // ── Single-value navigation ───────────────────────────────────────────────
  // "bit N"
  m = lower.match(/^bits?\s+(\d+)$/);
  if (m) return { type: 'navigate', label: `Navigate to bit ${m[1]}`, navQuery: `bit ${m[1]}` };
  // "byte N"
  m = lower.match(/^bytes?\s+(\d+)$/);
  if (m) return { type: 'navigate', label: `Navigate to byte ${m[1]}`, navQuery: `byte ${m[1]}` };
  // "uint32 N"
  m = lower.match(/^uint32\s+(\d+)$/);
  if (m) return { type: 'navigate', label: `Navigate to uint32 ${m[1]}`, navQuery: `uint32 ${m[1]}` };
  // "uint64 N"
  m = lower.match(/^uint64\s+(\d+)$/);
  if (m) return { type: 'navigate', label: `Navigate to uint64 ${m[1]}`, navQuery: `uint64 ${m[1]}` };
  // "vector N"
  m = lower.match(/^vector\s+(\d+)$/);
  if (m) return { type: 'navigate', label: `Navigate to vector ${m[1]}`, navQuery: `vector ${m[1]}` };
  // "number N" / "num N" / "#N"
  m = lower.match(/^(number|num|#)\s*(\d+)$/);
  if (m) return { type: 'navigate', label: `Navigate to number ${m[2]}`, navQuery: `number ${m[2]}` };
  // "group N" — single group: highlight its bit range
  m = lower.match(/^group\s+(\d+)$/);
  if (m) return { type: 'range', label: `Highlight group ${m[1]}`, navQuery: `group ${m[1]}` };
  // Plain integer → bit index
  m = lower.match(/^(\d+)$/);
  if (m) return { type: 'navigate', label: `Navigate to bit ${m[1]}`, navQuery: m[1] };

  return null;
}

function formatEventLabel(step, idx) {
  const parts = [`Event ${step.originalIndex ?? idx}`];
  if (step.prime != null) parts.push(`prime ${step.prime * 2 + 1}`);
  if (step.operation) parts.push(step.operation);
  if (step.annotation) parts.push(`"${step.annotation}"`);
  return parts.join(' · ');
}

export default function SearchOverlay({
  open,
  onClose,
  steps,
  goToStep,
  handleSearch,
  setIsEventsPanelCollapsed,
  revealCurrentStepInPanel,
  // Controlled query — shared with the toolbar search input so both stay in sync.
  // If not provided the component manages its own local state.
  query: queryProp,
  onQueryChange,
  // Range overlay activation — called for range-type search results.
  onSetRange,
}) {
  const [localQuery, setLocalQuery] = useState('');
  const isControlled = queryProp !== undefined;
  const query = isControlled ? queryProp : localQuery;
  const setQuery = isControlled
    ? (v) => onQueryChange(typeof v === 'function' ? v(queryProp) : v)
    : setLocalQuery;

  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef(null);

  // Auto-focus when opened; do NOT clear query on open so the user can re-run
  // or refine their last search (they can use Ctrl+A to replace it).
  useEffect(() => {
    if (open) {
      setSelectedIdx(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    const out = [];

    // Navigation result (if query looks like a nav command)
    const nav = parseNavQuery(q);
    if (nav) {
      out.push({ id: 'nav', kind: nav.type, label: nav.label ?? `Navigate to ${q}`, navQuery: nav.navQuery });
    }

    // Event search (runs even if a nav result was found, so users can find events by number)
    if (steps && steps.length > 0) {
      const lower = q.toLowerCase();
      let count = 0;
      for (let i = 0; i < steps.length && count < MAX_EVENTS; i++) {
        const s = steps[i];
        const idx = s.originalIndex ?? i;
        const match =
          String(idx).includes(lower) ||
          (s.operation && s.operation.toLowerCase().includes(lower)) ||
          (s.annotation && s.annotation.toLowerCase().includes(lower)) ||
          (s.prime != null && String(s.prime * 2 + 1).includes(lower)) ||
          (s.start != null && String(s.start).includes(lower)) ||
          (s.stop != null && String(s.stop).includes(lower));
        if (match) {
          out.push({ id: `event-${idx}`, kind: 'event', step: s, stepIdx: idx, label: formatEventLabel(s, i) });
          count++;
        }
      }
    }

    return out;
  }, [query, steps]);

  // Clamp selected index whenever results change
  useEffect(() => {
    setSelectedIdx((prev) => Math.min(prev, Math.max(0, results.length - 1)));
  }, [results.length]);

  const activate = useCallback((result) => {
    if (!result) return;
    if (result.kind === 'navigate' || result.kind === 'range') {
      // Both navigate and range queries go through handleSearch — it resolves the
      // range overlay for range queries and single-bit navigation for navigate queries.
      handleSearch(result.navQuery);
      onClose();
    } else if (result.kind === 'event') {
      goToStep(result.stepIdx);
      if (setIsEventsPanelCollapsed) setIsEventsPanelCollapsed(false);
      if (revealCurrentStepInPanel) setTimeout(revealCurrentStepInPanel, 60);
      onClose();
    }
  }, [handleSearch, goToStep, setIsEventsPanelCollapsed, revealCurrentStepInPanel, onClose]);

  const onKeyDown = useCallback((e) => {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx((i) => Math.min(i + 1, results.length - 1)); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx((i) => Math.max(i - 1, 0)); return; }
    if (e.key === 'Enter') { e.preventDefault(); activate(results[selectedIdx]); return; }
  }, [results, selectedIdx, activate, onClose]);

  if (!open) return null;

  return (
    <div className="search-overlay-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Search">
      <div className="search-overlay-panel" onClick={(e) => e.stopPropagation()}>
        <div className="search-overlay-input-row">
          <span className="search-overlay-icon" aria-hidden="true">⌕</span>
          <input
            ref={inputRef}
            className="search-overlay-input"
            type="text"
            placeholder="Search events, bits, numbers… (e.g. bit 42 · byte 5 · bits 100-200 · prime)"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIdx(0); }}
            onKeyDown={onKeyDown}
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button className="search-overlay-clear" onClick={() => { setQuery(''); setSelectedIdx(0); inputRef.current?.focus(); }} aria-label="Clear">✕</button>
          )}
        </div>
        {results.length > 0 && (
          <ul className="search-overlay-results" role="listbox">
            {results.map((r, i) => (
              <li
                key={r.id}
                role="option"
                aria-selected={i === selectedIdx}
                className={`search-overlay-result${i === selectedIdx ? ' selected' : ''} kind-${r.kind}`}
                onMouseEnter={() => setSelectedIdx(i)}
                onClick={() => activate(r)}
              >
                <span className="search-overlay-result-icon" aria-hidden="true">
                  {r.kind === 'navigate' ? '⊕' : '#'}
                </span>
                <span className="search-overlay-result-label">{r.label}</span>
                {r.kind === 'event' && r.step?.numChanged != null && (
                  <span className="search-overlay-result-meta">{r.step.numChanged > 0 ? `+${r.step.numChanged}` : ''}</span>
                )}
              </li>
            ))}
          </ul>
        )}
        {query.trim() && results.length === 0 && (
          <div className="search-overlay-empty">No results</div>
        )}
        <div className="search-overlay-hint">
          <kbd>↑↓</kbd> navigate · <kbd>↵</kbd> select · <kbd>Esc</kbd> close
        </div>
      </div>
    </div>
  );
}
