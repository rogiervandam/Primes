/**
 * Streaming trace parser Web Worker.
 *
 * Receives:  { type: 'parse', text: string, format: 'text'|'json'|'auto' }
 * Posts back (in order):
 *   { type: 'header',   header }                   — as soon as the header is found
 *   { type: 'steps',    steps, startIndex }         — batches of ~100 step objects
 *   { type: 'progress', count }                     — every 500 steps
 *   { type: 'done',     stepCount }                 — all steps processed
 *   { type: 'error',    message }                   — if parsing fails
 */

import { extractTextTraceHeader, parseTextTraceLine, parseTrace } from '../traceParser.js';
import {
  inferPrimeFromAnnotation,
  parsePrimeFromText,
} from '../parser/primeInference.js';

const BATCH_SIZE = 100;
const PROGRESS_EVERY = 500;

self.onmessage = function handleMessage(e) {
  if (e.data?.type !== 'parse') return;

  const text = typeof e.data.text === 'string' ? e.data.text : '';

  try {
    const trimmed = text.trim();
    if (!trimmed) {
      self.postMessage({ type: 'error', message: 'Invalid trace file: empty input' });
      return;
    }

    // JSON-format traces are typically compact machine-generated files.
    // Parse them all at once using the existing parser (no streaming needed),
    // then stream the result back in batches so the API stays consistent.
    if (trimmed[0] === '{' || trimmed[0] === '[') {
      parseJsonTraceInWorker(trimmed);
      return;
    }

    parseTextTraceInWorker(trimmed);
  } catch (err) {
    self.postMessage({ type: 'error', message: String(err?.message || err) });
  }
};

// ---------------------------------------------------------------------------
// Text trace streaming path
// ---------------------------------------------------------------------------

function parseTextTraceInWorker(trimmed) {
  const lines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // --- Phase 1: find + broadcast header ---
  let header;
  try {
    ({ header } = extractTextTraceHeader(lines));
  } catch (err) {
    self.postMessage({ type: 'error', message: String(err?.message || err) });
    return;
  }
  self.postMessage({ type: 'header', header });

  // --- Phase 2: parse steps incrementally ---
  let stepCount = 0;
  let batch = [];
  // Track last known prime to propagate forward (mirrors inferMissingPrimes logic).
  // This lets us send correct primes with each batch instead of needing a
  // post-hoc correction pass.
  let lastPrime = null;

  for (let i = 0; i < lines.length; i++) {
    const step = parseTextTraceLine(lines[i], stepCount);
    if (step === null) continue;

    // Forward-propagate prime inline so each batch is self-consistent.
    if (step.prime != null) {
      lastPrime = step.prime;
    } else if (step.prime == null) {
      // Try annotation-based inference (mirrors primeInference.inferMissingPrimes).
      const inferred = inferPrimeFromAnnotation(step.annotation, step.factorStep, header.storageModel);
      if (inferred != null) {
        step.prime = inferred;
        lastPrime = inferred;
      } else if (lastPrime != null) {
        step.prime = lastPrime;
      }
    }

    stepCount++;
    batch.push(step);

    if (batch.length >= BATCH_SIZE) {
      self.postMessage({ type: 'steps', steps: batch, startIndex: stepCount - batch.length });
      batch = [];
    }

    if (stepCount % PROGRESS_EVERY === 0) {
      self.postMessage({ type: 'progress', count: stepCount });
    }
  }

  // Send any remaining steps
  if (batch.length > 0) {
    self.postMessage({ type: 'steps', steps: batch, startIndex: stepCount - batch.length });
  }

  self.postMessage({ type: 'done', stepCount });
}

// ---------------------------------------------------------------------------
// JSON trace path — parse synchronously, emit header + batches
// ---------------------------------------------------------------------------

function parseJsonTraceInWorker(trimmed) {
  let parsed;
  try {
    parsed = parseTrace(trimmed);
  } catch (err) {
    self.postMessage({ type: 'error', message: String(err?.message || err) });
    return;
  }

  const { header, steps } = parsed;
  // Emit header immediately
  self.postMessage({ type: 'header', header });

  // Emit steps in batches
  for (let i = 0; i < steps.length; i += BATCH_SIZE) {
    const batch = steps.slice(i, i + BATCH_SIZE);
    self.postMessage({ type: 'steps', steps: batch, startIndex: i });
    if (i % PROGRESS_EVERY === 0 && i > 0) {
      self.postMessage({ type: 'progress', count: i });
    }
  }

  self.postMessage({ type: 'done', stepCount: steps.length });
}
