import React from 'react';
import BitHistoryBalloons from './BitHistoryBalloons';
import DetailInspectorOverlay from './DetailInspectorOverlay';
import TimingPanel from './TimingPanel';
import GroupInspector from './GroupInspector';

/**
 * Collects canvas-adjacent overlays so CanvasStage only owns layout structure.
 */
export default function CanvasOverlayManager(props) {
  const overlayState = props.overlayState;
  const overlayHandlers = props.overlayHandlers;

  const currentStep = overlayState.currentStep;
  const pinnedBitIndices = overlayState.pinnedBitIndices;
  const hoveredBitInfo = overlayState.hoveredBitInfo;
  const balloonLiveLayout = overlayState.balloonLiveLayout;
  const cachelineSize = overlayState.cachelineSize;
  const isDetailInspectorOpen = overlayState.isDetailInspectorOpen;
  const detailInspectorMode = overlayState.detailInspectorMode;
  const detailInspectorQuery = overlayState.detailInspectorQuery;
  const detailInspectorRows = overlayState.detailInspectorRows;
  const filteredDetailInspectorRows = overlayState.filteredDetailInspectorRows;
  const isTimingPanelOpen = overlayState.isTimingPanelOpen;
  const steps = overlayState.steps;
  const benchmarkTimingData = overlayState.benchmarkTimingData;
  const benchmarkTimingFileName = overlayState.benchmarkTimingFileName;

  // item 331: group inspector
  const groupInspectorUnit = overlayState.groupInspectorUnit;
  const groupInspectorEffectiveGroupBits = overlayState.groupInspectorEffectiveGroupBits;
  const groupInspectorStorageModel = overlayState.groupInspectorStorageModel;
  const groupInspectorWheelDefinition = overlayState.groupInspectorWheelDefinition;
  const groupInspectorBitLayout = overlayState.groupInspectorBitLayout;
  const groupInspectorByteLayout = overlayState.groupInspectorByteLayout;
  const groupInspectorBitCount = overlayState.groupInspectorBitCount;

  const computeBitInfo = overlayHandlers.computeBitInfo;
  const getVisibleBalloonStyles = overlayHandlers.getVisibleBalloonStyles;
  const setPinnedBitIndices = overlayHandlers.setPinnedBitIndices;
  const handleStepSelection = overlayHandlers.handleStepSelection;
  const setDetailInspectorQuery = overlayHandlers.setDetailInspectorQuery;
  const setIsDetailInspectorOpen = overlayHandlers.setIsDetailInspectorOpen;
  const setIsTimingPanelOpen = overlayHandlers.setIsTimingPanelOpen;
  const setTimingFocusOp = overlayHandlers.setTimingFocusOp;
  const onImportBenchmarkTiming = overlayHandlers.onImportBenchmarkTiming;
  const openGroupInspector = overlayHandlers.openGroupInspector;
  const closeGroupInspector = overlayHandlers.closeGroupInspector;

  return (
    <>
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
        onInspectUnit={openGroupInspector}
        effectiveGroupBits={groupInspectorEffectiveGroupBits}
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
          steps={steps}
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

      {groupInspectorUnit && (
        <GroupInspector
          unit={groupInspectorUnit}
          steps={steps}
          cachelineSize={cachelineSize}
          effectiveGroupBits={groupInspectorEffectiveGroupBits}
          storageModel={groupInspectorStorageModel}
          wheelDefinition={groupInspectorWheelDefinition}
          bitLayout={groupInspectorBitLayout}
          byteLayout={groupInspectorByteLayout}
          bitCount={groupInspectorBitCount}
          currentStep={currentStep}
          onClose={closeGroupInspector}
          onGoToStep={handleStepSelection}
        />
      )}
    </>
  );
}