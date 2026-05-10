import React, { createContext, useContext, useRef, useCallback, useMemo, useLayoutEffect, useState, useEffect } from 'react';

const ActiveStepContext = createContext(null);

/**
 * Provides the current playback step via a push-subscription model.
 *
 * The context VALUE itself is stable (never changes reference), so any
 * component that calls `useActiveStepContext()` will NOT re-render when the
 * step changes — only the subscribers' callbacks are invoked imperatively.
 *
 * Components that need `currentStep` as React state (e.g. PlaybackTransport's
 * controlled slider) should use the `useCurrentStep()` hook instead.
 */
export function ActiveStepProvider({ children, currentStep }) {
  const listenersRef = useRef(new Set());
  const stepRef = useRef(currentStep);

  // Runs synchronously after every render of the provider (i.e. after Visualizer
  // re-renders with a new currentStep). Notifies subscribers without creating a
  // new context value, so consumers do not re-render.
  useLayoutEffect(() => {
    if (stepRef.current === currentStep) return;
    stepRef.current = currentStep;
    for (const cb of listenersRef.current) cb(currentStep);
  });

  const subscribe = useCallback((cb) => {
    listenersRef.current.add(cb);
    return () => listenersRef.current.delete(cb);
  }, []);

  // Stable context value — never changes reference, so this context never
  // triggers re-renders in consumers.
  const value = useMemo(() => ({ stepRef, subscribe }), [subscribe]);

  return React.createElement(ActiveStepContext.Provider, { value }, children);
}

/**
 * Returns `{ stepRef, subscribe }` for imperative step access.
 * Components using this hook will NOT re-render when the step changes.
 * Use `subscribe(callback)` to react to step changes imperatively.
 */
export function useActiveStepContext() {
  return useContext(ActiveStepContext);
}

/**
 * Hook for components that need currentStep as React state and are therefore
 * expected to re-render on every step change (e.g. PlaybackTransport slider).
 */
export function useCurrentStep() {
  const ctx = useContext(ActiveStepContext);
  const [step, setStep] = useState(ctx ? ctx.stepRef.current : 0);
  useEffect(() => {
    if (!ctx) return;
    // Sync immediately on mount in case step changed before subscription started.
    setStep(ctx.stepRef.current ?? 0);
    return ctx.subscribe(setStep);
  }, [ctx]);
  return step;
}

export default ActiveStepContext;
