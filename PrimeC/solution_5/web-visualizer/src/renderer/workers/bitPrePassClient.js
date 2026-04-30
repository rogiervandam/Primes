/**
 * Tiny client wrapper around `bitPrePass.worker.js`.
 *
 * Owns the worker lifecycle, request id allocation and stale-reply
 * filtering. Falls back to `null` (caller computes synchronously) when
 * the environment doesn't support workers.
 */

let sharedWorker = null;
let nextId = 1;
const pending = new Map();

function ensureWorker() {
  if (sharedWorker) return sharedWorker;
  if (typeof Worker === 'undefined') return null;
  try {
    // Vite resolves this URL at build time and bundles the worker.
    sharedWorker = new Worker(
      new URL('./bitPrePass.worker.js', import.meta.url),
      { type: 'module' },
    );
    sharedWorker.onmessage = (event) => {
      const { id } = event.data || {};
      const cb = pending.get(id);
      if (!cb) return;
      pending.delete(id);
      cb(event.data);
    };
    sharedWorker.onerror = (err) => {
      // On hard worker failure (e.g. compile error), surface to console so
      // it's visible during development, then fall back to synchronous
      // compute for the rest of the session.
      console.error('[bitPrePassClient] worker error — falling back to synchronous:', err && err.message);
      pending.clear();
      sharedWorker = null;
    };
  } catch {
    sharedWorker = null;
  }
  return sharedWorker;
}

/**
 * Returns a Promise that resolves with `{ flags, key }` from the worker,
 * or `null` if no worker is available (caller should compute inline).
 */
export function requestPrimeOverlay({ sieveSize, bitCount, storageModel }) {
  const worker = ensureWorker();
  if (!worker) return null;
  const id = nextId++;
  return new Promise((resolve) => {
    pending.set(id, resolve);
    worker.postMessage({
      id,
      type: 'buildPrimeOverlay',
      sieveSize,
      bitCount,
      storageModel,
    });
  });
}
