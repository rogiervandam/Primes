/**
 * Prime number inference helpers.
 *
 * The trace format may omit the prime that triggered each step. These
 * helpers reconstruct it from annotations, factor steps, and natural-
 * language descriptions on a best-effort basis.
 */

import { toNullableNumber } from './parseUtils';

/** Pull `prime <n>` (case-insensitive) out of free-form text. */
export function parsePrimeFromText(text) {
  const m = String(text || '').match(/\bprime\s+(-?\d+)\b/i);
  return m ? Number(m[1]) : null;
}

/**
 * Look for the first numeric value tagged with one of the alias keywords
 * in `text`, e.g. `step_size: 17` or `step=17`.
 */
export function firstAliasNumberInText(text, aliases, fallback) {
  for (let i = 0; i < aliases.length; i++) {
    const a = aliases[i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(?:\\b${a}\\b|${a}\\s*[:=])\\s*[:=]?\\s*(-?\\d+)`, 'i');
    const m = text.match(re);
    if (m) return Number(m[1]);
  }
  return fallback;
}

/**
 * Specialised search for "factor step" / "step <n>" patterns; falls back to
 * generic alias matching for known synonyms.
 */
export function firstFactorStepNumberInText(text, fallback) {
  const explicitAliases = ['factor_step', 'step_size', 'stride', 'inc', 'increment', 'stap'];
  const aliased = firstAliasNumberInText(text, explicitAliases, null);
  if (aliased != null) return aliased;

  const naturalLanguage = String(text || '').match(/(?:with\s+)?step\s*(-?\d+)\b/i);
  if (naturalLanguage) return Number(naturalLanguage[1]);

  return fallback;
}

// Temporarily disable inferring primes from steps and fallback to the last mentioned prime
export function inferPrimeFromFactorStep(factorStep, _storageModel) {
  return null; // Disable inference
}

/**
 * Try to recover the prime that produced a given annotation. Recognises the
 * classic "setting bits with step S in range A-B" wording and falls back to
 * the supplied factor step.
 */
export function inferPrimeFromAnnotation(annotation, factorStep, storageModel) {
  const explicitPrime = parsePrimeFromText(annotation);
  if (explicitPrime != null) return explicitPrime;

  const text = String(annotation || '');
  const classicRangeMatch = text.match(/setting\s+bits?.*?(?:with\s+)?step\s*(-?\d+)\s+in\s+range\s*(-?\d+)\s*(?:-|\.\.|to)\s*(-?\d+)/i);
  if (classicRangeMatch) {
    return inferPrimeFromFactorStep(Number(classicRangeMatch[1]), storageModel);
  }

  return inferPrimeFromFactorStep(factorStep, storageModel);
}

/**
 * Walk a list of parsed steps and fill in missing `prime` fields by
 * inferring from annotations, factor steps, or the most recent known prime.
 */
export function inferMissingPrimes(steps, storageModel) {
  const mode = String(storageModel || '').toLowerCase();
  let lastPrime = null;
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (step.prime != null) {
      lastPrime = step.prime;
      continue;
    }

    const inferredFromText = inferPrimeFromAnnotation(step.annotation, step.factorStep, mode);
    if (inferredFromText != null) {
      step.prime = inferredFromText;
      lastPrime = inferredFromText;
      continue;
    }

    // const prime = inferPrimeFromFactorStep(step.factorStep, mode);
    // if (prime != null) {
    //   step.prime = prime;
    //   lastPrime = prime;
    //   continue;
    // }

    if (lastPrime != null) {
      step.prime = lastPrime;
    }
  }
}
