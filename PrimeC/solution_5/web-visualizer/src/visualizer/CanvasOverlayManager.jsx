import React from 'react';
import EventTitleBanner from './EventTitleBanner';
import BitHistoryBalloons from './BitHistoryBalloons';
import DetailInspectorOverlay from './DetailInspectorOverlay';
import TimingPanel from '../TimingPanel';

/**
 * Collects canvas-adjacent overlays so CanvasStage only owns layout structure.
 */
export default function CanvasOverlayManager({
  eventTitleSettings,
  setEventTitleSettings,
  eventTitleStyle,
  currentStepBanner,
  surroundingEvents,
  currentStepData,
  currentStep,
  goToStep,
  revealCurrentStepInPanel,
  isEventsPanelCollapsed,
  setIsEventsPanelCollapsed,
  stepAnimSlidersContent,
  areWidgetsJoined,
  onJoinWidgets,
  pinnedBitIndices,
  hoveredBitInfo,
  computeBitInfo,
  getVisibleBalloonStyles,
  balloonLiveLayout,
  cachelineSize,
  setPinnedBitIndices,
  handleStepSelection,
  isDetailOpen,
  detailHeight,
  toggleDetailPanel,
  pendingBannerDragStart,
  onConsumePendingBannerDragStart,
  isDetailInspectorOpen,
  detailInspectorMode,
  detailInspectorQuery,
  setDetailInspectorQuery,
  setIsDetailInspectorOpen,
  detailInspectorRows,
  filteredDetailInspectorRows,
  isTimingPanelOpen,
  setIsTimingPanelOpen,
  steps,
  benchmarkTimingData,
  benchmarkTimingFileName,
  setTimingFocusOp,
  onImportBenchmarkTiming,
  isSingleEventWidgetRevealed,
}) {
  return (
    <>
      {eventTitleSettings.visible && !areWidgetsJoined && isSingleEventWidgetRevealed && (
        <EventTitleBanner
          settings={eventTitleSettings}
          setSettings={setEventTitleSettings}
          style={eventTitleStyle}
          banner={currentStepBanner}
          surrounding={surroundingEvents}
          currentStepData={currentStepData}
          currentStep={currentStep}
          goToStep={goToStep}
          revealCurrentStepInPanel={revealCurrentStepInPanel}
          isEventsPanelCollapsed={isEventsPanelCollapsed}
          setIsEventsPanelCollapsed={setIsEventsPanelCollapsed}
          isDetailOpen={isDetailOpen}
          detailHeight={detailHeight}
          toggleDetailPanel={toggleDetailPanel}
          externalDragStart={pendingBannerDragStart}
          onConsumeExternalDragStart={onConsumePendingBannerDragStart}
          sliders={stepAnimSlidersContent}
          onJoinWidgets={onJoinWidgets}
        />
      )}

      <BitHistoryBalloons
        pinnedBitIndices={pinnedBitIndices}
        hoveredBitInfo={hoveredBitInfo}
        computeBitInfo={computeBitInfo}
        getVisibleBalloonStyles={getVisibleBalloonStyles}
        liveLayout={balloonLiveLayout}
        cachelineSize={cachelineSize}
        currentStep={currentStep}
        onUnpin={(bitIndex) => setPinnedBitIndices((prev) => prev.filter((value) => value !== bitIndex))}
        onHistoryClick={handleStepSelection}
      />

      {isDetailInspectorOpen && (
        <DetailInspectorOverlay
          open={isDetailInspectorOpen}
          mode={detailInspectorMode}
          query={detailInspectorQuery}
          onQueryChange={setDetailInspectorQuery}
          onClose={() => setIsDetailInspectorOpen(false)}
          rows={detailInspectorRows}
          filteredRows={filteredDetailInspectorRows}
        />
      )}

      {isTimingPanelOpen && (
        <TimingPanel
          steps={steps}
          benchmarkTimingData={benchmarkTimingData}
          benchmarkTimingFileName={benchmarkTimingFileName}
          onClose={() => setIsTimingPanelOpen(false)}
          onFocusFn={(fnName) => setTimingFocusOp(fnName || '')}
          onImportBenchmarkTiming={onImportBenchmarkTiming}
        />
      )}
    </>
  );
}