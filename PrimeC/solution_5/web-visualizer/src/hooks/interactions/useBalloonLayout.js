/**
 * useBalloonLayout — owns bit-balloon display state.
 *
 * Owns:
 *  - pinnedBitIndices / hoveredBitInfo
 *  - balloonLiveLayout (live-recalculation flag during scroll/zoom)
 *  - balloonLayoutRafRef / balloonLiveLayoutTimerRef / lastHoveredIdxRef
 *  - scheduleBalloonRelayout callback
 *
 * Note: getBitBalloonGeometry and getVisibleBalloonStyles remain in
 * Visualizer.jsx because they depend on getCanvasPlaneMetrics, camera3DRef,
 * and several layout values that are not available to this hook.
 */
import { useState, useRef, useCallback, useEffect } from 'react';

export function useBalloonLayout() {
  const [pinnedBitIndices, setPinnedBitIndices] = useState([]);
  const [hoveredBitInfo, setHoveredBitInfo] = useState(null);
  const [, setBalloonLayoutTick] = useState(0);
  const [balloonLiveLayout, setBalloonLiveLayout] = useState(false);

  const balloonLayoutRafRef = useRef(null);
  const balloonLiveLayoutTimerRef = useRef(null);
  const lastHoveredIdxRef = useRef(-1);

  const scheduleBalloonRelayout = useCallback((immediate = false) => {
    if (immediate) {
      if (balloonLayoutRafRef.current != null) {
        cancelAnimationFrame(balloonLayoutRafRef.current);
        balloonLayoutRafRef.current = null;
      }
      setBalloonLayoutTick((v) => v + 1);
      return;
    }
    if (balloonLayoutRafRef.current != null) return;
    balloonLayoutRafRef.current = requestAnimationFrame(() => {
      balloonLayoutRafRef.current = null;
      setBalloonLayoutTick((v) => v + 1);
    });
  }, []);

  useEffect(() => () => {
    if (balloonLayoutRafRef.current != null) {
      cancelAnimationFrame(balloonLayoutRafRef.current);
      balloonLayoutRafRef.current = null;
    }
    if (balloonLiveLayoutTimerRef.current != null) {
      clearTimeout(balloonLiveLayoutTimerRef.current);
      balloonLiveLayoutTimerRef.current = null;
    }
  }, []);

  return {
    pinnedBitIndices, setPinnedBitIndices,
    hoveredBitInfo, setHoveredBitInfo,
    balloonLiveLayout, setBalloonLiveLayout,
    balloonLayoutRafRef,
    balloonLiveLayoutTimerRef,
    lastHoveredIdxRef,
    scheduleBalloonRelayout,
  };
}
