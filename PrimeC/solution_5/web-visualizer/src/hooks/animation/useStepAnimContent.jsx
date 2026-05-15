/**
 * Builds the pre-rendered JSX fragment used in the canvas stage:
 *  - `allEventsTransportContent` – AllEventsTransport or null
 *
 * Returning JSX from a custom hook is valid React — it's the "render prop
 * without prop" pattern, keeping Visualizer.jsx's return block clean.
 */
import React from 'react';
import AllEventsTransport from '../../visualizer/AllEventsTransport';

export function useStepAnimContent({
  // AllEventsTransport
  isAllEventsInDetailPanel,
  currentStep,
  steps,
  playing,
  exporting,
  handlePlayPause,
  goToStep,
  isScrubbingTopRef,
  playSpeedPercent,
  setPlaySpeedPercent,
  setIsAllEventsInDetailPanel,
  setIsAllEventsWidgetHidden,
}) {
  const allEventsTransportContent = isAllEventsInDetailPanel ? (
    <AllEventsTransport
      currentStep={currentStep}
      steps={steps}
      playing={playing}
      handlePlayPause={handlePlayPause}
      goToStep={goToStep}
      exporting={!!exporting}
      isScrubbingTopRef={isScrubbingTopRef}
      playSpeedPercent={playSpeedPercent}
      setPlaySpeedPercent={setPlaySpeedPercent}
      onDismiss={() => {
        setIsAllEventsInDetailPanel(false);
        setIsAllEventsWidgetHidden(false);
      }}
      onUndockByDrag={() => {
        setIsAllEventsInDetailPanel(false);
        setIsAllEventsWidgetHidden(false);
      }}
    />
  ) : null;

  return { allEventsTransportContent };
}
