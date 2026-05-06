import { useState } from 'react';
import { useRawLogActions } from './useRawLogActions';

export function useRawLogNavigation({
  setIsTraceInfoVisible,
  goToStep,
  revealCurrentStepInPanel,
  fetchRawSource,
  steps,
  currentStep,
}) {
  const [rawScrollToLine, setRawScrollToLine] = useState(null);
  const { onJumpToStep, onClearRawScrollToLine, onOpenRawLog } = useRawLogActions({
    setIsTraceInfoVisible,
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