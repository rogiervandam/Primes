import React, { useEffect } from 'react';

/**
 * Modal — accessible dialog shell.
 *
 * Renders `children` inside a `role="dialog"` container.
 * Closes on Escape key.  Click on backdrop also closes when `closeOnBackdrop`
 * is true (default: true).
 *
 * Props:
 *   open            — whether to render
 *   onClose         — () => void
 *   title           — string shown in the header (optional)
 *   className       — extra class for the inner .modal-shell div
 *   closeOnBackdrop — default true
 *   children
 */
export default function Modal({
  open,
  onClose,
  title,
  className = '',
  closeOnBackdrop = true,
  children,
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div
        className={`modal-shell${className ? ` ${className}` : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="modal-header">
            <span className="modal-title">{title}</span>
            <button className="btn-icon" onClick={onClose} title="Close">✕</button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
