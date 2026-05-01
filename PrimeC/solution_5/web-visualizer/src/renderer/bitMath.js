/**
 * Bit ↔ number conversions for the supported sieve storage models.
 * Pure helpers, dependency-free.
 */

import { WHEEL30_RESIDUES } from './constants';

const FALLBACK_WHEEL = Object.freeze({
  wheelSize: 30,
  bitsPerWheel: 8,
  baseSize: 30,
  repeats: 1,
  wheelMax: 5,
  mapNumbers: WHEEL30_RESIDUES,
  mapBits: WHEEL30_RESIDUES.map((_, index) => index),
  mapCount: WHEEL30_RESIDUES.length,
});

const wheelLookupCache = new WeakMap();

function isWheelModel(model) {
  return String(model || '').toLowerCase().startsWith('wheel');
}

function getWheelLookup(wheel) {
  const definition = wheel || FALLBACK_WHEEL;
  if (wheelLookupCache.has(definition)) return wheelLookupCache.get(definition);

  const wheelSize = Number(definition.wheelSize || definition.wheel_size || 0);
  const bitsPerWheel = Number(definition.bitsPerWheel || definition.bits_per_wheel || 0);
  const mapNumbers = Array.isArray(definition.mapNumbers) ? definition.mapNumbers : definition.map_numbers;
  const mapBits = Array.isArray(definition.mapBits) ? definition.mapBits : definition.map_bits;
  if (!(wheelSize > 0) || !(bitsPerWheel > 0) || !Array.isArray(mapNumbers) || !Array.isArray(mapBits)) {
    return null;
  }

  const relNumberByBit = new Array(bitsPerWheel).fill(null);
  const relBitByNumber = new Map();
  const pairCount = Math.min(mapNumbers.length, mapBits.length);
  for (let i = 0; i < pairCount; i++) {
    const relNumber = Number(mapNumbers[i]);
    const relBit = Number(mapBits[i]);
    if (!Number.isInteger(relNumber) || !Number.isInteger(relBit)) continue;
    if (relNumber < 0 || relNumber >= wheelSize || relBit < 0 || relBit >= bitsPerWheel) continue;
    relNumberByBit[relBit] = relNumber;
    relBitByNumber.set(relNumber, relBit);
  }

  const lookup = { wheelSize, bitsPerWheel, relNumberByBit, relBitByNumber };
  wheelLookupCache.set(definition, lookup);
  return lookup;
}

export function wheelSignature(wheel) {
  const lookup = getWheelLookup(wheel);
  if (!lookup) return 'wheel:none';
  const source = wheel || FALLBACK_WHEEL;
  const mapNumbers = Array.isArray(source.mapNumbers) ? source.mapNumbers : source.map_numbers;
  const mapBits = Array.isArray(source.mapBits) ? source.mapBits : source.map_bits;
  let hash = 2166136261;
  const count = Math.min(mapNumbers.length, mapBits.length);
  for (let i = 0; i < count; i++) {
    hash ^= Number(mapNumbers[i]) || 0;
    hash = Math.imul(hash, 16777619);
    hash ^= Number(mapBits[i]) || 0;
    hash = Math.imul(hash, 16777619);
  }
  return `wheel:${lookup.wheelSize}:${lookup.bitsPerWheel}:${count}:${hash >>> 0}`;
}

export function describeWheelBit(bitIdx, wheel) {
  const lookup = getWheelLookup(wheel);
  if (!lookup || bitIdx < 0) return null;
  const period = Math.floor(bitIdx / lookup.bitsPerWheel);
  const relativeBit = bitIdx % lookup.bitsPerWheel;
  const relativeNumber = lookup.relNumberByBit[relativeBit];
  if (relativeNumber == null) {
    return {
      mapped: false,
      period,
      relativeBit,
      relativeNumber: null,
      number: null,
      wheelSize: lookup.wheelSize,
      bitsPerWheel: lookup.bitsPerWheel,
    };
  }
  return {
    mapped: true,
    period,
    relativeBit,
    relativeNumber,
    number: period * lookup.wheelSize + relativeNumber,
    wheelSize: lookup.wheelSize,
    bitsPerWheel: lookup.bitsPerWheel,
  };
}

/** Convert a bit index to the number it represents in the given storage model. */
export function bitToNumber(bitIdx, model, wheel) {
  switch (model) {
    case 'full':  return bitIdx;
    case 'wheel': {
      const info = describeWheelBit(bitIdx, wheel);
      return info?.mapped ? info.number : null;
    }
    case 'half':
    default:
      if (isWheelModel(model)) {
        const info = describeWheelBit(bitIdx, wheel);
        return info?.mapped ? info.number : null;
      }
      return bitIdx * 2 + 1;
  }
}

/** Convert a number to a bit index, or `-1` if it cannot be represented. */
export function numberToBit(num, model, wheel) {
  switch (model) {
    case 'full':  return num;
    case 'wheel': {
      const lookup = getWheelLookup(wheel);
      if (!lookup || num < 0) return -1;
      const period = Math.floor(num / lookup.wheelSize);
      const relativeNumber = num % lookup.wheelSize;
      const relativeBit = lookup.relBitByNumber.get(relativeNumber);
      return relativeBit != null ? period * lookup.bitsPerWheel + relativeBit : -1;
    }
    case 'half':
    default:
      if (isWheelModel(model)) return numberToBit(num, 'wheel', wheel);
      return (num < 1 || num % 2 === 0) ? -1 : (num - 1) / 2;
  }
}
