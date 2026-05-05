import { useCallback } from 'react';

export function useRawLogActions({
  setShowTraceInfo,
  goToStep,
  revealCurrentStepInPanel,
  setRawScrollToLine,
  fetchRawSource,
  steps,
  currentStep,
}) {
  const onJumpToStep = useCallback((stepIndex) => {
    setShowTraceInfo(false);
    goToStep(stepIndex);
    revealCurrentStepInPanel();
  }, [setShowTraceInfo, goToStep, revealCurrentStepInPanel]);

  const onClearRawScrollToLine = useCallback(() => setRawScrollToLine(null), [setRawScrollToLine]);

  const onOpenRawLog = useCallback(async (lineIdx) => {
    if (lineIdx != null) {
      setRawScrollToLine(lineIdx);
      return;
    }
    const text = await fetchRawSource();
    if (!text) {
      setRawScrollToLine(0);
      return;
    }
    const target = (steps[currentStep]?.annotation || '').trim();
    if (!target) {
      setRawScrollToLine(0);
      return;
    }
    const rawLines = text.split(/\r?\n/);
    let found = null;
    for (let l = 0; l < rawLines.length; l++) {
      const raw = rawLines[l];
      if (raw.trim() === target) {
        found = l;
        break;
      }
      const kvM = raw.match(/\bannotation="([^"]*)"/);
      if (kvM && kvM[1].trim() === target) {
        found = l;
        break;
      }
      const nsM = raw.match(/^(.+?)\s*\{[^}]*"?traceline"?\s*:/);
      if (nsM && nsM[1].trim() === target) {
        found = l;
        break;
      }
    }
    setRawScrollToLine(found ?? 0);
  }, [setRawScrollToLine, fetchRawSource, steps, currentStep]);

  return { onJumpToStep, onClearRawScrollToLine, onOpenRawLog };
}