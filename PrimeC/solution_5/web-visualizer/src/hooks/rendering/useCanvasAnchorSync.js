import { useEffect } from 'react';

/**
 * Keeps the canvas pinned to the VIEWPORT center (not the container center)
 * so panel collapse/expand transitions don't slide the (stable) canvas content
 * across the screen. Updates DOM styles imperatively so the position tracks the
 * container's CSS transition frame-by-frame. A rAF self-priming loop runs for
 * ~420ms after each detected container reshape (or transition start) to cover
 * the entire CSS transition.
 *
 * @param {object} params
 * @param {React.RefObject} params.containerRef     - The canvas container element ref
 * @param {React.RefObject} params.wrapperCanvasRef - The canvas transform wrapper div ref
 * @param {function}        params.setCanvasAnchorPx - State setter for { left, top } anchor
 */
export function useCanvasAnchorSync({ containerRef, wrapperCanvasRef, setCanvasAnchorPx }) {
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof window === 'undefined') return undefined;
    let lastL = Number.NaN;
    let lastT = Number.NaN;
    let rafId = 0;
    let rafUntil = 0;
    const apply = (left, top) => {
      const leftStr = `${left}px`;
      const topStr = `${top}px`;
      // Update only the wrapper div — the 3D transform lives on the
      // wrapper, not on individual canvas elements (prevents per-canvas
      // Safari GPU compositing layers that cause black flicker).
      const wrapperEl = wrapperCanvasRef.current;
      if (wrapperEl) {
        if (wrapperEl.style.left !== leftStr) wrapperEl.style.left = leftStr;
        if (wrapperEl.style.top !== topStr) wrapperEl.style.top = topStr;
      }
      // Pin perspective-origin to the same anchor so the 3D vanishing
      // point doesn't slide when the container reshapes.
      el.style.perspectiveOrigin = `${left}px ${top}px`;
    };
    const sample = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return false;
      const left = Math.round((window.innerWidth / 2 - rect.left) * 100) / 100;
      const top = Math.round((window.innerHeight / 2 - rect.top) * 100) / 100;
      if (left === lastL && top === lastT) return false;
      lastL = left;
      lastT = top;
      apply(left, top);
      setCanvasAnchorPx({ left, top });
      return true;
    };
    const tick = () => {
      sample();
      if (performance.now() < rafUntil) {
        rafId = requestAnimationFrame(tick);
      } else {
        rafId = 0;
      }
    };
    const kick = (durationMs = 420) => {
      rafUntil = Math.max(rafUntil, performance.now() + durationMs);
      if (!rafId) rafId = requestAnimationFrame(tick);
    };
    sample();
    let ro = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => kick());
      ro.observe(el);
      if (document.body) ro.observe(document.body);
    }
    const onResize = () => kick();
    const onScroll = () => kick(60);
    const onTransitionStart = (ev) => {
      const p = ev.propertyName;
      if (p === 'width' || p === 'flex-basis' || p === 'transform' || p === 'margin' || p === 'padding') {
        kick();
      }
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onScroll, true);
    document.addEventListener('transitionstart', onTransitionStart, true);
    // Watch for device-pixel-ratio changes (user moves window between
    // displays with different DPRs, or zooms the browser page). Chrome/Edge
    // don't always fire a 'resize' event in that case, but the media-query
    // change fires reliably. Each handler recreates the watcher at the new
    // DPR so the query stays fresh without leaking listeners.
    let _dprMq = null;
    const _watchDpr = () => {
      if (typeof window === 'undefined') return;
      const _mq = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      const _onDpr = () => { sample(); kick(); _dprMq = null; _watchDpr(); };
      _mq.addEventListener('change', _onDpr);
      _dprMq = { mq: _mq, cb: _onDpr };
    };
    _watchDpr();
    document.addEventListener('transitionrun', onTransitionStart, true);
    return () => {
      if (ro) ro.disconnect();
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll, true);
      document.removeEventListener('transitionstart', onTransitionStart, true);
      document.removeEventListener('transitionrun', onTransitionStart, true);
      if (_dprMq) _dprMq.mq.removeEventListener('change', _dprMq.cb);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
