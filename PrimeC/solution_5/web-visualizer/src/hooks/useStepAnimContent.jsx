/**
 * Builds the three pre-rendered JSX fragments used in the canvas stage:
 *  - `stepAnimSlidersContent`       – floating banner instance (docked=false)
 *  - `stepAnimSlidersDockedContent` – detail-panel instance (docked=true)
 *  - `allEventsTransportContent`    – AllEventsTransport or null
 *
 * Returning JSX from a custom hook is valid React — it's the "render prop
 * without prop" pattern, keeping Visualizer.jsx's return block clean.
 */
import React from 'react';
import StepAnimSliders from '../visualizer/StepAnimSliders';
import AllEventsTransport from '../visualizer/AllEventsTransport';

export function useStepAnimContent({
  currentStepData,
  bitAnimationMode,
  setBitAnimationMode,
  bitAnimationModeRef,
  stopSeqAnim,
  seekStepAnimation,
  stepScrubProgress,
  setStepScrubProgress,
  handleStepAnimToggle,
  stepAnimRunning,
  singleEventLoopActive,
  animationReplayPaused,
  delayPhaseMs,
  playing,
  exporting,
  openAnimationSettings,
  // docked-only
  setEventTitleSettings,
  setPendingBannerDragStart,
  // AllEventsTransport
  allEventsInDetailPanel,
  currentStep,
  steps,
  handlePlayPause,
  goToStep,
  isScrubbingTopRef,
  playSpeedPercent,
  setPlaySpeedPercent,
  setAllEventsInDetailPanel,
  setAllEventsWidgetHidden,
}) {
  const stepAnimSlidersContent = (
    <StepAnimSliders
      currentStepData={currentStepData}
      bitAnimationMode={bitAnimationMode}
      setBitAnimationMode={setBitAnimationMode}
      bitAnimationModeRef={bitAnimationModeRef}
      stopSeqAnim={stopSeqAnim}
      seekStepAnimation={seekStepAnimation}
      stepScrubProgress={stepScrubProgress}
      setStepScrubProgress={setStepScrubProgress}
      handleStepAnimToggle={handleStepAnimToggle}
      stepAnimRunning={stepAnimRunning}
      singleEventLoopActive={singleEventLoopActive}
      animationReplayPaused={animationReplayPaused}
      delayPhaseMs={delayPhaseMs}
      playing={playing}
      exporting={exporting}
      onOpenAnimationSettings={openAnimationSettings}
      docked={false}
    />
  );

  const stepAnimSlidersDockedContent = (
    <StepAnimSliders
      currentStepData={currentStepData}
      bitAnimationMode={bitAnimationMode}
      setBitAnimationMode={setBitAnimationMode}
      bitAnimationModeRef={bitAnimationModeRef}
      stopSeqAnim={stopSeqAnim}
      seekStepAnimation={seekStepAnimation}
      stepScrubProgress={stepScrubProgress}
      setStepScrubProgress={setStepScrubProgress}
      handleStepAnimToggle={handleStepAnimToggle}
      stepAnimRunning={stepAnimRunning}
      singleEventLoopActive={singleEventLoopActive}
      animationReplayPaused={animationReplayPaused}
      delayPhaseMs={delayPhaseMs}
      playing={playing}
      exporting={exporting}
      onOpenAnimationSettings={openAnimationSettings}
      onDragOutFromDock={({ x, y }) => {
        setEventTitleSettings((prev) => ({ ...prev, visible: true }));
        setPendingBannerDragStart({ x, y, token: Date.now() });
      }}
      docked={true}
    />
  );

  const allEventsTransportContent = allEventsInDetailPanel ? (
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
        setAllEventsInDetailPanel(false);
        setAllEventsWidgetHidden(false);
      }}
      onUndockByDrag={() => {
        setAllEventsInDetailPanel(false);
        setAllEventsWidgetHidden(false);
      }}
    />
  ) : null;

  return { stepAnimSlidersContent, stepAnimSlidersDockedContent, allEventsTransportContent };
}
