import React, { useEffect } from 'react';

/**
 * Modal overlay listing all keyboard shortcuts, grouped by category.
 * Opened with the `?` key; closed with Escape or the close button.
 * Accessible: uses role="dialog", aria-modal, aria-label, and close button.
 */

const SHORTCUTS = [
  {
    category: 'Playback',
    rows: [
      { keys: ['Space'], description: 'Play / Pause' },
      { keys: ['Home'], description: 'Jump to first event' },
      { keys: ['End'], description: 'Jump to last event' },
    ],
  },
  {
    category: 'Navigation',
    rows: [
      { keys: ['←', '→'], description: 'Previous / Next event' },
      { keys: ['↑', '↓'], description: '(3D) Orbit camera up / down' },
      { keys: ['Shift+←', 'Shift+→'], description: '(3D) Orbit camera left / right' },
    ],
  },
  {
    category: 'View',
    rows: [
      { keys: ['+', '='], description: 'Zoom in' },
      { keys: ['-'], description: 'Zoom out' },
      { keys: ['0'], description: 'Reset zoom' },
      { keys: ['T'], description: 'Toggle light / dark theme' },
      { keys: ['D'], description: 'Toggle Detail panel' },
      { keys: ['R'], description: '(3D) Reset camera to flat' },
    ],
  },
  {
    category: 'Help',
    rows: [
      { keys: ['?'], description: 'Open / close this keyboard shortcuts help' },
    ],
  },
];

export default function KeyboardShortcutsOverlay({ open, onClose }) {
  // Close on Escape
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
      className="kbd-shortcuts-backdrop"
      onClick={onClose}
      aria-hidden="true"
    >
      <div
        className="kbd-shortcuts-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="kbd-shortcuts-header">
          <span className="kbd-shortcuts-title">Keyboard Shortcuts</span>
          <button
            className="kbd-shortcuts-close"
            onClick={onClose}
            aria-label="Close keyboard shortcuts"
            type="button"
          >
            ✕
          </button>
        </div>
        <div className="kbd-shortcuts-body">
          {SHORTCUTS.map((group) => (
            <section key={group.category} className="kbd-shortcuts-group">
              <div className="kbd-shortcuts-group-title">{group.category}</div>
              <div className="kbd-shortcuts-rows">
                {group.rows.map((row) => (
                  <div key={row.description} className="kbd-shortcuts-row">
                    <div className="kbd-shortcuts-keys">
                      {row.keys.map((k) => (
                        <kbd key={k} className="kbd-key">{k}</kbd>
                      ))}
                    </div>
                    <span className="kbd-shortcuts-desc">{row.description}</span>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
        <div className="kbd-shortcuts-footer">
          Press <kbd className="kbd-key">?</kbd> to show / hide this overlay
        </div>
      </div>
    </div>
  );
}
