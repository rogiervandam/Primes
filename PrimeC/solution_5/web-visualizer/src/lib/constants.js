/**
 * Shared UI constants for the web-visualizer.
 *
 * Use these instead of inline magic numbers so a single change propagates
 * everywhere.  All values are named exports (tree-shakeable).
 */

// ---- Drag interaction -------------------------------------------------------

/** Minimum pixel displacement before a mousedown is treated as a drag. */
export const DRAG_THRESHOLD_PX = 6;

/** Minimum pixel displacement for widget drop-zone detection during drag. */
export const DROP_ZONE_HIT_PADDING_PX = 40;

// ---- Animation --------------------------------------------------------------

/** RAF loop debounce: minimum ms between resize-triggered relayouts. */
export const RESIZE_DEBOUNCE_MS = 16;

// ---- Z-index stacking -------------------------------------------------------

export const Z_TOOLBAR = 30;
export const Z_PANELS = 28;
export const Z_FLOATING_WIDGET = 40;
export const Z_MODAL = 60;
export const Z_MODAL_BACKDROP = 59;
export const Z_TOOLTIP = 50;
