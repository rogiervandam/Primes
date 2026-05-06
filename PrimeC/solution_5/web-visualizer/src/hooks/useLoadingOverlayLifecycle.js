import { useEffect } from 'react';

export function useLoadingOverlayLifecycle({
  rendererRef,
  header,
  introTiltStartedRef,
  setIntroPhase,
  setLoadingOverlayPhase,
  setUiChromeVisible,
  setOverlayBarPct,
  overlayStartTimeRef,
  pendingIntroAfterOverlayRef,
  loadingOverlayPhase,
  loadCompleteRef,
  loadProgressRef,
}) {
  useEffect(() => {
    let fired = false;
    const tryTrigger = () => {
      if (fired) return;
      const r = rendererRef.current;
      if (!r) return;
      fired = true;
      introTiltStartedRef.current = false;
      setIntroPhase('hidden');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setLoadingOverlayPhase('active');
          setUiChromeVisible(false);
          setOverlayBarPct(0);
          overlayStartTimeRef.current = Date.now();
          pendingIntroAfterOverlayRef.current = true;
        });
      });
    };
    const raf = requestAnimationFrame(tryTrigger);
    return () => cancelAnimationFrame(raf);
  }, [
    header.bitCount,
    rendererRef,
    introTiltStartedRef,
    setIntroPhase,
    setLoadingOverlayPhase,
    setUiChromeVisible,
    setOverlayBarPct,
    overlayStartTimeRef,
    pendingIntroAfterOverlayRef,
  ]);

  useEffect(() => {
    if (loadingOverlayPhase !== 'active') return;
    const MIN_MS = 2000;
    let timer = null;

    const update = () => {
      const elapsed = Date.now() - (overlayStartTimeRef.current || Date.now());
      const complete = loadCompleteRef.current;
      const progress = loadProgressRef.current;
      const stepCount = header.stepCount;

      const timePct = Math.min(100, (elapsed / MIN_MS) * 100);
      const realPct = complete ? 100
        : stepCount > 0 ? Math.min(95, (progress / stepCount) * 100)
        : Math.min(90, timePct * 0.9);
      const displayPct = Math.max(0, Math.min(timePct, realPct));
      setOverlayBarPct(Math.round(displayPct));

      if (complete && elapsed >= MIN_MS) {
        setOverlayBarPct(100);
        setTimeout(() => {
          setLoadingOverlayPhase('fading');
          setTimeout(() => {
            setLoadingOverlayPhase('hidden');
            setUiChromeVisible(true);
            if (pendingIntroAfterOverlayRef.current) {
              pendingIntroAfterOverlayRef.current = false;
              setIntroPhase('scaling');
            }
          }, 500);
        }, 300);
        return;
      }
      timer = setTimeout(update, 50);
    };

    timer = setTimeout(update, 50);
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [
    loadingOverlayPhase,
    header.stepCount,
    overlayStartTimeRef,
    loadCompleteRef,
    loadProgressRef,
    setOverlayBarPct,
    setLoadingOverlayPhase,
    setUiChromeVisible,
    pendingIntroAfterOverlayRef,
    setIntroPhase,
  ]);
}