/**
 * useIntroSequence — owns the intro-animation and loading-overlay state.
 *
 * Owns:
 *  - introPhase ('hidden' | 'scaling' | 'tilting' | 'visible')
 *  - introTiltStartedRef
 *  - topbarPlaybackReady (delayed post-load reveal)
 *  - loadingOverlayPhase ('hidden' | 'active' | 'fading')
 *  - uiChromeVisible / overlayBarPct
 *  - overlayStartTimeRef / pendingIntroAfterOverlayRef
 *  - loadCompleteRef / loadProgressRef (stable refs to volatile props)
 *
 * The complex loading-overlay animation effects remain in Visualizer.jsx since
 * they reference rendererRef and other cross-cutting state. This hook only
 * owns state and provides the topbarPlaybackReady effect (self-contained).
 *
 * @param {{ loadComplete: boolean, loadProgress: number }} params
 */
import { useState, useRef, useEffect } from 'react';

export function useIntroSequence({ loadComplete, loadProgress }) {
  const [introPhase, setIntroPhase] = useState('hidden');
  const introTiltStartedRef = useRef(false);

  const [topbarPlaybackReady, setTopbarPlaybackReady] = useState(false);
  const [loadingOverlayPhase, setLoadingOverlayPhase] = useState('hidden');
  const [uiChromeVisible, setUiChromeVisible] = useState(false);
  const [overlayBarPct, setOverlayBarPct] = useState(0);

  const overlayStartTimeRef = useRef(null);
  const pendingIntroAfterOverlayRef = useRef(false);

  // Keep stable refs to volatile prop values so animation callbacks don't
  // need to re-bind every time these change.
  const loadCompleteRef = useRef(loadComplete);
  const loadProgressRef = useRef(loadProgress);
  loadCompleteRef.current = loadComplete;
  loadProgressRef.current = loadProgress;

  // Topbar transport controls appear shortly after loading finishes.
  useEffect(() => {
    if (!loadComplete) {
      setTopbarPlaybackReady(false);
      return;
    }
    const timer = setTimeout(() => setTopbarPlaybackReady(true), 500);
    return () => clearTimeout(timer);
  }, [loadComplete]);

  return {
    introPhase, setIntroPhase,
    introTiltStartedRef,
    topbarPlaybackReady,
    loadingOverlayPhase, setLoadingOverlayPhase,
    uiChromeVisible, setUiChromeVisible,
    overlayBarPct, setOverlayBarPct,
    overlayStartTimeRef,
    pendingIntroAfterOverlayRef,
    loadCompleteRef,
    loadProgressRef,
  };
}
