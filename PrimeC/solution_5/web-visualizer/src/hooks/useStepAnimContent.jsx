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
  isStepAnimRunning,
  isSingleEventLoopActive,
  isAnimationReplayPaused,
  delayPhaseMs,
  playing,
  exporting,
  openAnimationSettings,
  isSingleEventRepeatEnabled,
  setIsSingleEventRepeatEnabled,
  // item 283: mask step indicator
  aggMaskStepIndex = 0,
  aggMaskStepSetterRef,
  // docked-only
  setEventTitleSettings,
  setPendingBannerDragStart,
  // AllEventsTransport
  isAllEventsInDetailPanel,
  currentStep,
  steps,
  handlePlayPause,
  goToStep,
  isScrubbingTopRef,
  playSpeedPercent,
  setPlaySpeedPercent,
  setIsAllEventsInDetailPanel,
  setIsAllEventsWidgetHidden,
}) {
  const aggMaskStepCount = currentStepData?.aggMaskSteps?.length ?? 0;
  const onAggMaskStepChange = aggMaskStepSetterRef
    ? (idx) => aggMaskStepSetterRef.current?.(idx)
    : undefined;

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
      isStepAnimRunning={isStepAnimRunning}
      isSingleEventLoopActive={isSingleEventLoopActive}
      isAnimationReplayPaused={isAnimationReplayPaused}
      delayPhaseMs={delayPhaseMs}
      playing={playing}
      exporting={exporting}
      onOpenAnimationSettings={openAnimationSettings}
      isSingleEventRepeatEnabled={isSingleEventRepeatEnabled}
      onToggleSingleEventRepeat={() => setIsSingleEventRepeatEnabled((prev) => !prev)}
      onTriggerAnimation={() => { if (goToStep && currentStep != null) goToStep(currentStep); }}
      aggMaskStepCount={aggMaskStepCount}
      aggMaskStepIndex={aggMaskStepIndex}
      onAggMaskStepChange={onAggMaskStepChange}
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
      isStepAnimRunning={isStepAnimRunning}
      isSingleEventLoopActive={isSingleEventLoopActive}
      isAnimationReplayPaused={isAnimationReplayPaused}
      delayPhaseMs={delayPhaseMs}
      playing={playing}
      exporting={exporting}
      onOpenAnimationSettings={openAnimationSettings}
      isSingleEventRepeatEnabled={isSingleEventRepeatEnabled}
      onToggleSingleEventRepeat={() => setIsSingleEventRepeatEnabled((prev) => !prev)}
      onTriggerAnimation={() => { if (goToStep && currentStep != null) goToStep(currentStep); }}
      onDragOutFromDock={({ x, y }) => {
        setEventTitleSettings((prev) => ({ ...prev, visible: true }));
        setPendingBannerDragStart({ x, y, token: Date.now() });
      }}
      aggMaskStepCount={aggMaskStepCount}
      aggMaskStepIndex={aggMaskStepIndex}
      onAggMaskStepChange={onAggMaskStepChange}
      docked={true}
    />
  );

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

  return { stepAnimSlidersContent, stepAnimSlidersDockedContent, allEventsTransportContent };
}
