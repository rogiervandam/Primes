import { useCallback } from 'react';
import { computeBitInfoFromSteps } from '../../lib/bitInfo';

export function useBitInfo({ rendererRef, stepsRef, wheelDefinition }) {
  const computeBitInfo = useCallback((idx) => {
    const r = rendererRef.current;
    const storageModel = r ? r.storageModel : 'half';
    return computeBitInfoFromSteps(idx, stepsRef.current, storageModel, r?.wheelDefinition || wheelDefinition);
  }, [rendererRef, stepsRef, wheelDefinition]);

  return { computeBitInfo };
}