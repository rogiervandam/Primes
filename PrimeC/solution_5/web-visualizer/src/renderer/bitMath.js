/**
 * Bit ↔ number conversions for the supported sieve storage models.
 * Pure helpers, dependency-free.
 */

import { WHEEL30_RESIDUES } from './constants';

/** Convert a bit index to the number it represents in the given storage model. */
export function bitToNumber(bitIdx, model) {
  switch (model) {
    case 'full':  return bitIdx;
    case 'wheel': return Math.floor(bitIdx / 8) * 30 + WHEEL30_RESIDUES[bitIdx % 8];
    case 'half':
    default:      return bitIdx * 2 + 1;
  }
}

/** Convert a number to a bit index, or `-1` if it cannot be represented. */
export function numberToBit(num, model) {
  switch (model) {
    case 'full':  return num;
    case 'wheel': {
      const group = Math.floor(num / 30);
      const rem = num % 30;
      const idx = WHEEL30_RESIDUES.indexOf(rem);
      return idx >= 0 ? group * 8 + idx : -1;
    }
    case 'half':
    default:
      return (num < 1 || num % 2 === 0) ? -1 : (num - 1) / 2;
  }
}
