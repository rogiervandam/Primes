/**
 * useBitState — owns bit-grid simulation state and step selection.
 *
 * Owns:
 *  - bitStateRef (Uint8Array — the live bit grid)
 *  - bitStateCheckpointsRef (periodic snapshots for fast backward scrub)
 *  - bitStateDirtyRef (true while bitState is in a partially-revealed state)
 *  - selectedSteps (Set<number>) + selectedStepsRef
 */
import { useState, useRef } from 'react';

export function useBitState() {
  const bitStateRef = useRef(null);
  // Periodic snapshots of bitState built at trace load time (every
  // CHECKPOINT_INTERVAL events). Used by goToStep to skip replaying
  // thousands of events on backward scrubs.
  const bitStateCheckpointsRef = useRef([]);
  // True while the timeline slider has left bitState in a partially-revealed
  // (pre-step) state. goToStep checks this and always rebuilds from scratch.
  const bitStateDirtyRef = useRef(false);

  const [selectedSteps, setSelectedSteps] = useState(new Set());
  const selectedStepsRef = useRef(new Set());
  selectedStepsRef.current = selectedSteps;

  return {
    bitStateRef,
    bitStateCheckpointsRef,
    bitStateDirtyRef,
    selectedSteps, setSelectedSteps, selectedStepsRef,
  };
}
