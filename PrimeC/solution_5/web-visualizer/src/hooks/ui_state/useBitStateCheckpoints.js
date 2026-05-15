import { useEffect } from 'react';

export function useBitStateCheckpoints({
  loadComplete,
  header,
  steps,
  bitStateCheckpointsRef,
}) {
  useEffect(() => {
    if (!loadComplete) return;
    const { bitCount } = header;
    const MAX_CHECKPOINTS = 50;
    const MIN_INTERVAL = 100;
    const MAX_BYTES = 8 * 1024 * 1024;
    if (!steps.length || !bitCount) {
      bitStateCheckpointsRef.current = [];
      return;
    }
    const interval = Math.max(MIN_INTERVAL, Math.ceil(steps.length / MAX_CHECKPOINTS));
    const estimatedCheckpoints = Math.floor(steps.length / interval);
    if (estimatedCheckpoints * bitCount > MAX_BYTES) {
      bitStateCheckpointsRef.current = [];
      return;
    }
    const checkpoints = [];
    const bs = new Uint8Array(bitCount);
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      for (let j = 0; j < s.changedBits.length; j++) {
        const idx = s.changedBits[j];
        if (idx < bs.length) bs[idx] = 1;
      }
      if ((i + 1) % interval === 0) {
        checkpoints.push({ stepIndex: i, bitState: new Uint8Array(bs) });
      }
    }
    if (
      checkpoints.length === 0
      || checkpoints[checkpoints.length - 1].stepIndex !== steps.length - 1
    ) {
      checkpoints.push({ stepIndex: steps.length - 1, bitState: new Uint8Array(bs) });
    }
    bitStateCheckpointsRef.current = checkpoints;
  }, [loadComplete, header, steps, bitStateCheckpointsRef]);
}