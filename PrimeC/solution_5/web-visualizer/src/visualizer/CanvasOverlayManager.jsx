import React from 'react';
import EventTitleBanner from './EventTitleBanner';
import BitHistoryBalloons from './BitHistoryBalloons';
import DetailInspectorOverlay from './DetailInspectorOverlay';
import TimingPanel from '../TimingPanel';

/**
 * Collects canvas-adjacent overlays so CanvasStage only owns layout structure.
 */
export default function CanvasOverlayManager(props) {
  const overlayState = props.overlayState || {};
  const overlayHandlers = props.overlayHandlers || {};

  const eventTitleSettings = overlayState.eventTitleSettings ?? props.eventTitleSettings;
  const eventTitleStyle = overlayState.eventTitleStyle ?? props.eventTitleStyle;
  const currentStepBanner = overlayState.currentStepBanner ?? props.currentStepBanner;
  const surroundingEvents = overlayState.surroundingEvents ?? props.surroundingEvents;
  const currentStepData = overlayState.currentStepData ?? props.currentStepData;
  const currentStep = overlayState.currentStep ?? props.currentStep;
  const isEventsPanelCollapsed = overlayState.isEventsPanelCollapsed ?? props.isEventsPanelCollapsed;
  const stepAnimSlidersContent = overlayState.stepAnimSlidersContent ?? props.stepAnimSlidersContent;
  const areWidgetsJoined = overlayState.areWidgetsJoined ?? props.areWidgetsJoined;
  const pinnedBitIndices = overlayState.pinnedBitIndices ?? props.pinnedBitIndices;
  const hoveredBitInfo = overlayState.hoveredBitInfo ?? props.hoveredBitInfo;
  const balloonLiveLayout = overlayState.balloonLiveLayout ?? props.balloonLiveLayout;
  const cachelineSize = overlayState.cachelineSize ?? props.cachelineSize;
  const isDetailOpen = overlayState.isDetailOpen ?? props.isDetailOpen;
  const detailHeight = overlayState.detailHeight ?? props.detailHeight;
  const pendingBannerDragStart = overlayState.pendingBannerDragStart ?? props.pendingBannerDragStart;
  const isDetailInspectorOpen = overlayState.isDetailInspectorOpen ?? props.isDetailInspectorOpen;
  const detailInspectorMode = overlayState.detailInspectorMode ?? props.detailInspectorMode;
  const detailInspectorQuery = overlayState.detailInspectorQuery ?? props.detailInspectorQuery;
  const detailInspectorRows = overlayState.detailInspectorRows ?? props.detailInspectorRows;
  const filteredDetailInspectorRows = overlayState.filteredDetailInspectorRows ?? props.filteredDetailInspectorRows;
  const isTimingPanelOpen = overlayState.isTimingPanelOpen ?? props.isTimingPanelOpen;
  const steps = overlayState.steps ?? props.steps;
  const benchmarkTimingData = overlayState.benchmarkTimingData ?? props.benchmarkTimingData;
  const benchmarkTimingFileName = overlayState.benchmarkTimingFileName ?? props.benchmarkTimingFileName;
  const isSingleEventWidgetRevealed = overlayState.isSingleEventWidgetRevealed ?? props.isSingleEventWidgetRevealed;

  const setEventTitleSettings = overlayHandlers.setEventTitleSettings ?? props.setEventTitleSettings;
  const goToStep = overlayHandlers.goToStep ?? props.goToStep;
  const revealCurrentStepInPanel = overlayHandlers.revealCurrentStepInPanel ?? props.revealCurrentStepInPanel;
  const setIsEventsPanelCollapsed = overlayHandlers.setIsEventsPanelCollapsed ?? props.setIsEventsPanelCollapsed;
  const onJoinWidgets = overlayHandlers.onJoinWidgets ?? props.onJoinWidgets;
  const computeBitInfo = overlayHandlers.computeBitInfo ?? props.computeBitInfo;
  const getVisibleBalloonStyles = overlayHandlers.getVisibleBalloonStyles ?? props.getVisibleBalloonStyles;
  const setPinnedBitIndices = overlayHandlers.setPinnedBitIndices ?? props.setPinnedBitIndices;
  const handleStepSelection = overlayHandlers.handleStepSelection ?? props.handleStepSelection;
  const toggleDetailPanel = overlayHandlers.toggleDetailPanel ?? props.toggleDetailPanel;
  const onConsumePendingBannerDragStart = overlayHandlers.onConsumePendingBannerDragStart ?? props.onConsumePendingBannerDragStart;
  const setDetailInspectorQuery = overlayHandlers.setDetailInspectorQuery ?? props.setDetailInspectorQuery;
  const setIsDetailInspectorOpen = overlayHandlers.setIsDetailInspectorOpen ?? props.setIsDetailInspectorOpen;
  const setIsTimingPanelOpen = overlayHandlers.setIsTimingPanelOpen ?? props.setIsTimingPanelOpen;
  const setTimingFocusOp = overlayHandlers.setTimingFocusOp ?? props.setTimingFocusOp;
  const onImportBenchmarkTiming = overlayHandlers.onImportBenchmarkTiming ?? props.onImportBenchmarkTiming;

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