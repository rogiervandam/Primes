import { useCallback } from 'react';

export function useTiltControls({
  introTiltStartedRef,
  setIntroPhase,
  camera3DRef,
  schedulePostLayoutRefresh,
  isTiltActive,
  setIsTiltActive,
  setCamera3DContainerStyle,
  refitViewportToContent,
}) {
  const handleIntroTransitionEnd = useCallback(() => {
    if (introTiltStartedRef.current) return;
    introTiltStartedRef.current = true;
    setIntroPhase('tilting');

    const cam = camera3DRef.current;
    if (!cam || !cam.enabled) {
      setIntroPhase('visible');
      return;
    }

    const targetTilt = Math.min(30, cam.maxTilt || 30);
    cam.cancelAllAnimations();
    cam.animateTo({ rotateX: targetTilt, rotateY: 0, perspective: 1500 }, 900)
      .then(() => {
        setIntroPhase('visible');
        schedulePostLayoutRefresh(null);
        // item 468: smoothly refit the 2D viewport so the whole sieve is
        // visible in the area not covered by panels after the intro tilt.
        refitViewportToContent({ duration: 500 });
      })
      .catch(() => {
        setIntroPhase('visible');
      });
  }, [introTiltStartedRef, setIntroPhase, camera3DRef, schedulePostLayoutRefresh, refitViewportToContent]);

  const toggleTilt = useCallback(() => {
    const cam = camera3DRef.current;
    if (!cam || !cam.enabled) return;
    const newTiltActive = !isTiltActive;
    setIsTiltActive(newTiltActive);
    const targetTilt = newTiltActive ? Math.min(30, cam.maxTilt || 30) : 0;
    cam.animateTo({ rotateX: targetTilt, rotateY: 0, perspective: 1500 }, 900)
      .then(() => {
        schedulePostLayoutRefresh(null);
        // item 468: smoothly animate the 2D viewport to show the full sieve
        // in the panel-free area after the 2D→3D or 3D→2D tilt transition.
        refitViewportToContent({ duration: 650 });
      });
  }, [camera3DRef, isTiltActive, setIsTiltActive, schedulePostLayoutRefresh, refitViewportToContent]);

  const enableTiltAndResize = useCallback(() => {
    const cam = camera3DRef.current;
    if (cam && cam.enabled) {
      return cam;
    }
    if (cam && !cam.enabled) {
      cam.cancelAllAnimations();
      if (Math.abs(cam.rotateX) < 0.5) cam.rotateX = Math.min(16, cam.maxTilt || 16);
      cam.perspective = 1500;
      cam.enable();
      setCamera3DContainerStyle(cam.getContainerStyle());
      schedulePostLayoutRefresh(null);
      requestAnimationFrame(() => requestAnimationFrame(() => refitViewportToContent({ instant: true })));
      return cam;
    }
    return camera3DRef.current;
  }, [camera3DRef, setCamera3DContainerStyle, schedulePostLayoutRefresh, refitViewportToContent]);

  return { handleIntroTransitionEnd, toggleTilt, enableTiltAndResize };
}