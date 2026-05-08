export function waitForDelay(ms, { globalPausedRef, seqTimerRef }) {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => {
    let remaining = ms;
    let prev = performance.now();
    const tick = (now) => {
      const dt = now - prev;
      prev = now;
      if (!globalPausedRef.current) remaining -= dt;
      if (remaining <= 0) {
        seqTimerRef.current = null;
        resolve();
        return;
      }
      seqTimerRef.current = requestAnimationFrame(tick);
    };
    seqTimerRef.current = requestAnimationFrame(tick);
  });
}

export function estimateAnimDuration(bitCount, {
  options = {},
  animMode,
  animStyle,
  currentHighlighted = 0,
  getAnimationTimingPlan,
  getAnimationBitInterval,
  getFadeOutDuration,
}) {
  const plan = options.adaptivePlan || getAnimationTimingPlan(bitCount, options);
  const effectiveBitInterval = getAnimationBitInterval(bitCount, { ...options, adaptivePlan: plan });
  const fadeOutMs = currentHighlighted > 0 ? getFadeOutDuration(currentHighlighted, options) : 0;

  if (bitCount <= 0 || animStyle === 'none') {
    return fadeOutMs + (plan ? Math.min(3200, plan.totalDuration) : 0);
  }

  if (animMode === 'all' || effectiveBitInterval <= 0) {
    return fadeOutMs + (plan ? Math.min(3200, plan.totalDuration) : 620);
  }

  let revealMs = plan ? plan.totalDuration : bitCount * Math.max(10, effectiveBitInterval);
  if (animMode === 'bounce') {
    revealMs = plan ? Math.min(10000, revealMs * 1.35) : revealMs * 2;
  }

  return fadeOutMs + revealMs;
}
