import React from 'react';

/**
 * ButtonGroup — renders a horizontal set of mutually-exclusive toggle buttons.
 *
 * Uses the `.btn-group` / `.btn-option` CSS classes already defined in
 * `10-settings.css`.
 *
 * Props:
 *   options   — array of { value, label, title? } objects
 *   value     — currently-active option value
 *   onChange  — (newValue) => void
 *   disabled  — whether all buttons are disabled (default: false)
 *   className — extra class for the outer .btn-group wrapper
 */
export default function ButtonGroup({
  options,
  value,
  onChange,
  disabled = false,
  className = '',
}) {
  return (
    <div className={`btn-group${className ? ` ${className}` : ''}`}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={`btn-option${value === opt.value ? ' active' : ''}`}
          title={opt.title}
          disabled={disabled}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
