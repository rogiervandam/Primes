import { useEffect } from 'react';

/**
 * useWindowResize — calls `handler` whenever the window fires a `resize`
 * event.
 *
 * Runs `handler` once on mount (after the first render) so the caller's
 * initial state matches the actual window size.
 *
 * @param {() => void} handler  Called on resize and once on mount.
 * @param {Array}      deps     React dependency array.  The handler is
 *                              recreated and re-registered whenever these
 *                              change.
 */
export function useWindowResize(handler, deps = []) {
  useEffect(() => {
    handler();
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
    // deps intentionally passed through from caller
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
