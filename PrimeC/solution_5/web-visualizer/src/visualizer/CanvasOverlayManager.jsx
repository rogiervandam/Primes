import React from 'react';
import EventTitleBanner from './EventTitleBanner';
import BitHistoryBalloons from './BitHistoryBalloons';
import DetailInspectorOverlay from './DetailInspectorOverlay';
import TimingPanel from '../TimingPanel';

/**
 * Collects canvas-adjacent overlays so CanvasStage only owns layout structure.
 */
export default function CanvasOverlayManager(props) {
  const overlayState = props.overlayState;
  const overlayHandlers = props.overlayHandlers;

  const eventTitleSettings = overlayState.eventTitleSettings;
  const eventTitleStyle = overlayState.eventTitleStyle;
  const currentStepBanner = overlayState.currentStepBanner;
  const surroundingEvents = overlayState.surroundingEvents;
  const currentStepData = overlayState.currentStepData;
  const currentStep = overlayState.currentStep;
  const isEventsPanelCollapsed = overlayState.isEventsPanelCollapsed;
  const stepAnimSlidersContent = overlayState.stepAnimSlidersContent;
  const areWidgetsJoined = overlayState.areWidgetsJoined;
  const pinnedBitIndices = overlayState.pinnedBitIndices;
  const hoveredBitInfo = overlayState.hoveredBitInfo;
  const balloonLiveLayout = overlayState.balloonLiveLayout;
  const cachelineSize = overlayState.cachelineSize;
  const isDetailOpen = overlayState.isDetailOpen;
  const detailHeight = overlayState.detailHeight;
  const pendingBannerDragStart = overlayState.pendingBannerDragStart;
  const isDetailInspectorOpen = overlayState.isDetailInspectorOpen;
  const detailInspectorMode = overlayState.detailInspectorMode;
  const detailInspectorQuery = overlayState.detailInspectorQuery;
  const detailInspectorRows = overlayState.detailInspectorRows;
  const filteredDetailInspectorRows = overlayState.filteredDetailInspectorRows;
  const isTimingPanelOpen = overlayState.isTimingPanelOpen;
  const steps = overlayState.steps;
  const benchmarkTimingData = overlayState.benchmarkTimingData;
  const benchmarkTimingFileName = overlayState.benchmarkTimingFileName;
  const isSingleEventWidgetRevealed = overlayState.isSingleEventWidgetRevealed;

  const setEventTitleSettings = overlayHandlers.setEventTitleSettings;
  const goToStep = overlayHandlers.goToStep;
  const revealCurrentStepInPanel = overlayHandlers.revealCurrentStepInPanel;
  const setIsEventsPanelCollapsed = overlayHandlers.setIsEventsPanelCollapsed;
  const onJoinWidgets = overlayHandlers.onJoinWidgets;
  const computeBitInfo = overlayHandlers.computeBitInfo;
  const getVisibleBalloonStyles = overlayHandlers.getVisibleBalloonStyles;
  const setPinnedBitIndices = overlayHandlers.setPinnedBitIndices;
  const handleStepSelection = overlayHandlers.handleStepSelection;
  const toggleDetailPanel = overlayHandlers.toggleDetailPanel;
  const onConsumePendingBannerDragStart = overlayHandlers.onConsumePendingBannerDragStart;
  const setDetailInspectorQuery = overlayHandlers.setDetailInspectorQuery;
  const setIsDetailInspectorOpen = overlayHandlers.setIsDetailInspectorOpen;
  const setIsTimingPanelOpen = overlayHandlers.setIsTimingPanelOpen;
  const setTimingFocusOp = overlayHandlers.setTimingFocusOp;
  const onImportBenchmarkTiming = overlayHandlers.onImportBenchmarkTiming;

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