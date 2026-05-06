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

    const winResize = () => onResize(true);
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