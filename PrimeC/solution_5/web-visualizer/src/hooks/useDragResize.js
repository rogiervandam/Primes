import { useCallback } from 'react';

/**
 * useDragResize — generic "mousedown starts a drag" hook.
 *
 * Returns a `handleMouseDown` callback suitable for an element's
 * `onMouseDown` prop.  While the mouse is held, `onMove(dx, dy, event)`
 * is called on every `mousemove`.  When the mouse is released `onEnd` is
 * called (optional).
 *
 * @param {object} options
 * @param {(dx: number, dy: number, e: MouseEvent) => void} options.onMove
 *   Called with (deltaX, deltaY) relative to where the drag started.
 * @param {(e: MouseEvent) => void} [options.onEnd]
 *   Called once when the mouseup fires (cleanup / commit state).
 * @param {EventTarget} [options.target]
 *   Element to attach the temporary listeners to.  Defaults to `window`.
 * @param {boolean} [options.preventDefault]
 *   Whether to call `e.preventDefault()` on the initiating mousedown.
 *   Defaults to `true`.
 */
export function useDragResize({
  onMove,
  onEnd,
  target,
  preventDefault = true,
} = {}) {
  return useCallback(
    (downEvent) => {
      if (preventDefault) downEvent.preventDefault();

      const startX = downEvent.clientX;
      const startY = downEvent.clientY;
      const el = target ?? window;

      const handleMove = (ev) => {
        onMove(ev.clientX - startX, ev.clientY - startY, ev);
      };

      const handleUp = (ev) => {
        el.removeEventListener('mousemove', handleMove);
        el.removeEventListener('mouseup', handleUp);
        if (onEnd) onEnd(ev);
      };

      el.addEventListener('mousemove', handleMove);
      el.addEventListener('mouseup', handleUp);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onMove, onEnd, target, preventDefault],
  );
}
