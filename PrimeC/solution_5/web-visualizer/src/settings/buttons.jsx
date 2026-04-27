import React from 'react';

/**
 * Mini SVG preview of a layout grid (cols × rows). When `grid3x3` is set,
 * the center cell is left empty to mirror the renderer's 3×3 layout.
 *
 * Used by the "Bit layout" / "Byte layout" arrangement pickers.
 */
export function LayoutIcon({ cols, rows, grid3x3, active, onClick, size = 32, tooltip }) {
  const gap = 1;
  const cellW = (size - (cols - 1) * gap) / cols;
  const cellH = (size - (rows - 1) * gap) / rows;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`-3 -3 ${size + 6} ${size + 6}`}
      onClick={onClick}
      title={tooltip}
      style={{
        cursor: 'pointer',
        border: active ? '2px solid var(--accent)' : '2px solid var(--border)',
        borderRadius: 4,
        padding: 2,
        overflow: 'visible',
        display: 'block',
        boxSizing: 'content-box',
        background: 'var(--bg-raised)',
      }}
    >
      {Array.from({ length: rows * cols }, (_, i) => {
        if (grid3x3 && i === 4) return null; // center cell empty
        const col = i % cols;
        const row = Math.floor(i / cols);
        return (
          <rect
            key={i}
            x={col * (cellW + gap)}
            y={row * (cellH + gap)}
            width={cellW}
            height={cellH}
            fill={active ? 'var(--accent)' : 'var(--fg-dim)'}
            rx={1}
          />
        );
      })}
    </svg>
  );
}

/** Mini SVG preview for a vector grouping (N side-by-side boxes). */
export function VectorIcon({ count, active, onClick, size = 32, tooltip }) {
  const gap = 2;
  const boxW = (size - (count - 1) * gap) / count;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`-3 -3 ${size + 6} ${size + 6}`}
      onClick={onClick}
      title={tooltip}
      style={{
        cursor: 'pointer',
        border: active ? '2px solid var(--accent)' : '2px solid var(--border)',
        borderRadius: 4,
        padding: 2,
        overflow: 'visible',
        display: 'block',
        boxSizing: 'content-box',
        background: 'var(--bg-raised)',
      }}
    >
      {Array.from({ length: count }, (_, i) => (
        <rect
          key={i}
          x={i * (boxW + gap)}
          y={2}
          width={boxW}
          height={size - 4}
          fill={active ? 'var(--accent)' : 'var(--fg-dim)'}
          rx={1}
        />
      ))}
    </svg>
  );
}

/** Crosshair icon used as the trigger for the spacing inline-popover controls. */
export function SpacingIcon({ title }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <path d="M12 3 V21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M3 12 H21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9 6 L12 3 L15 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 18 L12 21 L15 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 9 L3 12 L6 15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 9 L21 12 L18 15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="1.35" fill="currentColor" stroke="none" />
      <title>{title}</title>
    </svg>
  );
}

/** Settings (gear) icon used in the collapsed sidebar header. */
export function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

/**
 * Generic toggle button with an SVG/text preview, used for the bit-label,
 * byte-label, vector-label, and outline-target pickers.
 */
export function AnnotationButton({ title, hint, active, onClick, preview }) {
  return (
    <button
      type="button"
      className={`anno-btn${active ? ' active' : ''}`}
      onClick={onClick}
      title={hint || title}
    >
      <span className="anno-btn-preview">{preview}</span>
      <span className="anno-btn-title">{title}</span>
      {hint ? <span className="anno-btn-hint">{hint}</span> : null}
    </button>
  );
}

/**
 * Generic toggle button with a swatch/icon preview and label + hint,
 * used for animation style/mode pickers and overlay toggles.
 */
export function PreviewOptionButton({ label, hint, active, onClick, preview, compact = false, extraClass = '' }) {
  return (
    <button
      type="button"
      className={`preview-btn${active ? ' active' : ''}${compact ? ' compact' : ''}${extraClass ? ' ' + extraClass : ''}`}
      onClick={onClick}
      title={hint}
    >
      <span className="preview-btn-swatch">{preview}</span>
      <span className="preview-btn-title">{label}</span>
      <span className="preview-btn-hint">{hint}</span>
    </button>
  );
}
