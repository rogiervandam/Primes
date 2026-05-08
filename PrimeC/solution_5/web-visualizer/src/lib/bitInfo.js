import { bitToNumber } from '../SieveRenderer';

/** Trial division primality test for positive integers. */
export function isPrimeNumber(n) {
  if (n < 2) return false;
  if (n === 2 || n === 3 || n === 5 || n === 7) return true;
  if (n % 2 === 0 || n % 3 === 0) return false;
  for (let i = 5; i * i <= n; i += 6) {
    if (n % i === 0 || n % (i + 2) === 0) return false;
  }
  return true;
}

/** Build bit detail info with step history and mapped number metadata. */
export function computeBitInfoFromSteps(idx, steps, storageModel, wheelDefinition) {
  const history = [];
  for (let i = 0; i < steps.length; i++) {
    const st = steps[i];
    for (let j = 0; j < st.changedBits.length; j++) {
      if (st.changedBits[j] === idx) {
        history.push({ stepIndex: i, operation: st.operation, prime: st.prime, annotation: st.annotation });
        break;
      }
    }
  }
  const num = bitToNumber(idx, storageModel, wheelDefinition);
  return {
    bitIndex: idx,
    number: num == null ? 'unmapped' : num,
    isPrime: num != null && isPrimeNumber(num),
    history,
  };
}