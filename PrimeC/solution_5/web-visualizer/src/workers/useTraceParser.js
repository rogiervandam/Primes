/**
 * useTraceParser — React hook wrapping the streaming trace parser Web Worker.
 *
 * Usage:
 *   const { header, steps, progress, isComplete, startParse, abort } = useTraceParser();
 *
 * Call `startParse(text)` to begin parsing; the hook resets automatically.
 * Call `abort()` to stop a running parse (e.g. when a new file is loaded).
 *
 * Steps accumulate via React's startTransition so they don't block urgent
 * renders (canvas, toolbar, etc.).
 */

import { useState, useRef, useCallback, startTransition } from 'react';

export function useTraceParser() {
  const [header, setHeader] = useState(null);
  const [steps, setSteps] = useState([]);
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [parseError, setParseError] = useState(null);

  // Hold the live worker so abort() can terminate it
  const workerRef = useRef(null);

  const abort = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
  }, []);

  const startParse = useCallback((text) => {
    // Terminate any previous worker
    abort();

    // Reset state
    setHeader(null);
    setSteps([]);
    setProgress(0);
    setIsComplete(false);
    setParseError(null);

    const worker = new Worker(
      new URL('./traceParserWorker.js', import.meta.url),
      { type: 'module' },
    );
    workerRef.current = worker;

    worker.onmessage = (e) => {
      const msg = e.data;
      switch (msg.type) {
        case 'header':
          // Urgent — lets the Visualizer mount immediately
          setHeader(msg.header);
          break;

        case 'steps':
          // Non-urgent — batch-append without blocking canvas renders
          startTransition(() => {
            setSteps((prev) => {
              // Avoid unnecessary array copy when the batch simply appends
              if (msg.startIndex === prev.length) {
                return [...prev, ...msg.steps];
              }
              // Rare case: out-of-order batch or retry after reset — rebuild
              const next = [...prev];
              msg.steps.forEach((s, i) => {
                next[msg.startIndex + i] = s;
              });
              return next;
            });
          });
          break;

        case 'progress':
          setProgress(msg.count);
          break;

        case 'done':
          setProgress(msg.stepCount);
          setIsComplete(true);
          // Worker is no longer needed
          worker.terminate();
          workerRef.current = null;
          break;

        case 'error':
          setParseError(msg.message);
          worker.terminate();
          workerRef.current = null;
          break;

        default:
          break;
      }
    };

    worker.onerror = (err) => {
      setParseError(err.message || 'Worker error');
      worker.terminate();
      workerRef.current = null;
    };

    worker.postMessage({ type: 'parse', text });
  }, [abort]);

  return { header, steps, progress, isComplete, parseError, startParse, abort };
}
