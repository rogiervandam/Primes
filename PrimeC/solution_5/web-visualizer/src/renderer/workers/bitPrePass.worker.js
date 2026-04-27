/**
 * Cold pre-pass worker for SieveRenderer.
 *
 * Currently handles a single job type:
 *   - `buildPrimeOverlay` — runs the Sieve of Eratosthenes up to
 *     `sieveSize` (or the largest representable number for `bitCount`)
 *     and returns a `Uint8Array` of per-bit prime flags.
 *
 * Protocol:
 *   ← { id, type: 'buildPrimeOverlay', sieveSize, bitCount, storageModel }
 *   → { id, type: 'buildPrimeOverlay', flags: Uint8Array, key }
 *
 * `id` is echoed back so the host can drop stale replies.
 * `key` mirrors `${sieveSize}:${bitCount}:${storageModel}` for the
 * caller's cache check.
 *
 * Kept small and dependency-free on purpose. If you grow this beyond a
 * handful of job types, split per-job files and use `case` dispatch.
 */

import { bitToNumber } from '../bitMath';

function buildPrimeOverlay({ sieveSize, bitCount, storageModel }) {
  const limit = Math.max(2, sieveSize > 0
    ? sieveSize
    : bitToNumber(Math.max(0, bitCount - 1), storageModel));

  // Sieve of Eratosthenes (odd-only optimisation; even numbers stay 0
  // except for 2 itself, which is hard-coded below).
  const sieve = new Uint8Array(limit + 1);
  if (limit >= 2) sieve[2] = 1;
  for (let i = 3; i <= limit; i += 2) sieve[i] = 1;
  for (let p = 3; p * p <= limit; p += 2) {
    if (!sieve[p]) continue;
    for (let j = p * p; j <= limit; j += p * 2) sieve[j] = 0;
  }

  const flags = new Uint8Array(bitCount);
  for (let i = 0; i < bitCount; i++) {
    const num = bitToNumber(i, storageModel);
    if (num >= 2 && num <= limit && sieve[num]) flags[i] = 1;
  }
  return flags;
}

self.onmessage = (event) => {
  const msg = event.data;
  if (!msg || typeof msg !== 'object') return;
  const { id, type } = msg;

  if (type === 'buildPrimeOverlay') {
    const flags = buildPrimeOverlay(msg);
    const key = `${Math.max(2, msg.sieveSize > 0 ? msg.sieveSize : bitToNumber(Math.max(0, msg.bitCount - 1), msg.storageModel))}:${msg.bitCount}:${msg.storageModel}`;
    // Transfer the underlying buffer so we don't pay a copy on the way back.
    self.postMessage({ id, type, flags, key }, [flags.buffer]);
    return;
  }
};
