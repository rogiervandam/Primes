import { useState } from 'react';
import { useRawLogActions } from './useRawLogActions';

export function useRawLogNavigation({
  setShowTraceInfo,
  goToStep,
  revealCurrentStepInPanel,
  fetchRawSource,
  steps,
  currentStep,
}) {
  const [rawScrollToLine, setRawScrollToLine] = useState(null);
  const { onJumpToStep, onClearRawScrollToLine, onOpenRawLog } = useRawLogActions({
    setShowTraceInfo,
    goToStep,
    revealCurrentStepInPanel,
    setRawScrollToLine,
    fetchRawSource,
    steps,
    currentStep,
  });

  return {
    rawScrollToLine,
    onJumpToStep,
    onClearRawScrollToLine,
    onOpenRawLog,
  };
}