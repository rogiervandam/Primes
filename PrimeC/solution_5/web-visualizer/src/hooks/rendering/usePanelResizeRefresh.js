import { useEffect } from 'react';

export function usePanelResizeRefresh({
  panelWidth,
  isMinimapVisible,
  isDetailOpen,
  detailHeight,
  refreshCanvasLayout,
  clearScheduledLayoutRefresh,
  captureViewportAnchor,
  pendingResizeAnchorRef,
}) {
  useEffect(() => {
    const onResize = (consumeAnchor) => {
      let anchor = null;
      if (consumeAnchor && pendingResizeAnchorRef.current) {
        anchor = pendingResizeAnchorRef.current;
        pendingResizeAnchorRef.current = null;
      } else if (consumeAnchor) {
        anchor = captureViewportAnchor(0.5, 0.5);
      }
      refreshCanvasLayout(anchor);
    };

    clearScheduledLayoutRefresh();
    onResize(true);

    const transitionRefreshTimer = setTimeout(() => onResize(false), 190);

    // item 259: throttle window-resize to one call per animation frame so that
    // fast consecutive resize events (e.g. dragging the window edge) don't
    // each trigger a full GL-worker resize + React state update.  The anchor
    // is captured on the first event of the batch so the viewport stays stable.
    let rafId = null;
    const winResize = () => {
      if (rafId != null) return; // already pending — skip duplicate
      // Capture the anchor now (before layout changes on the next frame).
      const anchor = captureViewportAnchor(0.5, 0.5);
      rafId = requestAnimationFrame(() => {
        rafId = null;
        refreshCanvasLayout(anchor);
      });
    };
    window.addEventListener('resize', winResize);

    let dprMqResize = null;
    const watchDprResize = () => {
      if (typeof window === 'undefined') return;
      const mq = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      const onDpr = () => { onResize(true); dprMqResize = null; watchDprResize(); };
      mq.addEventListener('change', onDpr);
      dprMqResize = { mq, cb: onDpr };
    };
    watchDprResize();

    return () => {
      window.removeEventListener('resize', winResize);
      if (rafId != null) { cancelAnimationFrame(rafId); rafId = null; }
      clearTimeout(transitionRefreshTimer);
      clearScheduledLayoutRefresh();
      if (dprMqResize) dprMqResize.mq.removeEventListener('change', dprMqResize.cb);
    };
  }, [
    panelWidth,
    isMinimapVisible,
    isDetailOpen,
    detailHeight,
    refreshCanvasLayout,
    clearScheduledLayoutRefresh,
    captureViewportAnchor,
    pendingResizeAnchorRef,
  ]);
}