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
    let changed = false;
    for (let j = 0; j < st.changedBits.length; j++) {
      if (st.changedBits[j] === idx) { changed = true; break; }
    }
    if (changed) {
      history.push({ stepIndex: i, operation: st.operation, prime: st.prime, annotation: st.annotation, wasChanged: true });
    } else if (st.numTargeted > 0) {
      // Check if targeted but already set (bit in targetBits but not changedBits)
      for (let j = 0; j < st.targetBits.length; j++) {
        if (st.targetBits[j] === idx) {
          history.push({ stepIndex: i, operation: st.operation, prime: st.prime, annotation: st.annotation, wasChanged: false });
          break;
        }
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