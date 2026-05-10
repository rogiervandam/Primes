/**
 * Lightweight shared counter bucket for in-app React performance debugging.
 * Written imperatively so components can increment counters without causing
 * extra re-renders. DebugToolsPanel reads via snapshotAndReset() on a timer.
 */

const state = {
  renderCounts: {},    // { componentName: count } — reset each interval
  stepCallbackMs: 0,   // cumulative ms across all step callbacks this interval
  stepCallbackN: 0,    // number of step callbacks this interval
  eventNodeCount: 0,   // last known DOM event-item node count (set by EventsPanel)
};

/** Call in a bare useEffect (no deps) inside a component to count renders. */
export function bumpRender(name) {
  state.renderCounts[name] = (state.renderCounts[name] || 0) + 1;
}

/** Call in the step-subscription callback with the elapsed ms to track timing. */
export function recordStepCallback(ms) {
  state.stepCallbackMs += ms;
  state.stepCallbackN += 1;
}

/** Call from EventsPanel's useLayoutEffect that builds the Map. */
export function setEventNodeCount(n) {
  state.eventNodeCount = n;
}

/**
 * Returns a snapshot of the current counters and resets the per-interval
 * accumulators. Called by DebugToolsPanel on its polling timer.
 */
export function snapshotAndReset() {
  const snap = {
    renderCounts: { ...state.renderCounts },
    stepCallbackAvgMs:
      state.stepCallbackN > 0
        ? state.stepCallbackMs / state.stepCallbackN
        : null,
    stepCallbackN: state.stepCallbackN,
    eventNodeCount: state.eventNodeCount,
  };
  state.renderCounts = {};
  state.stepCallbackMs = 0;
  state.stepCallbackN = 0;
  return snap;
}
