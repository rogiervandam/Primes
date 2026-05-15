import { useCallback } from 'react';

export function useRunEffect({
  rendererRef,
  runEffectCancelRef,
  rippleRef,
  seekGenRef,
  getMinimapDetailH,
}) {
  const runEffect = useCallback((style, durationOverride = null, onProgress = null) => {
    const r = rendererRef.current;
    if (!r || !r.changedBits || r.changedBits.size === 0) return Promise.resolve();
    if (runEffectCancelRef.current) runEffectCancelRef.current();
    if (style === 'none') return Promise.resolve();

    const duration = Math.max(280, durationOverride || 600);
    const start = performance.now();
    const capturedSeekGen = seekGenRef.current;
    return new Promise((resolve) => {
      runEffectCancelRef.current = () => {
        runEffectCancelRef.current = null;
        if (rippleRef.current) {
          cancelAnimationFrame(rippleRef.current);
          rippleRef.current = null;
        }
        resolve();
      };
      const animate = (now) => {
        if (seekGenRef.current !== capturedSeekGen) {
          runEffectCancelRef.current = null;
          rippleRef.current = null;
          resolve();
          return;
        }
        const elapsed = now - start;
        const progress = Math.min(1, elapsed / duration);
        if (onProgress) onProgress(progress);
        r.render();
        if (style === 'ripple') r.renderRipple(progress);
        else if (style === 'fade') r.renderFade(progress);
        else if (style === 'pulse') r.renderPulse(progress);
        r.renderMinimap(r.canvasWidth, r.canvasHeight || 0, getMinimapDetailH());
        if (progress < 1) {
          rippleRef.current = requestAnimationFrame(animate);
        } else {
          runEffectCancelRef.current = null;
          rippleRef.current = null;
          resolve();
        }
      };
      rippleRef.current = requestAnimationFrame(animate);
    });
  }, [rendererRef, runEffectCancelRef, rippleRef, seekGenRef, getMinimapDetailH]);

  return { runEffect };
}