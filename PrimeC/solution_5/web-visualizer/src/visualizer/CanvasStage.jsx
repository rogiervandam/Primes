import React from 'react';
import EventTitleBanner from './EventTitleBanner';
import BitHistoryBalloons from './BitHistoryBalloons';
import DetailInspectorOverlay from './DetailInspectorOverlay';
import DetailPanel from '../DetailPanel';
import TimingPanel from '../TimingPanel';

/**
 * CanvasStage — the centre column of the visualizer:
 *   - optional event-title banner above the canvas
 *   - the layered canvas stack (settled / main / minimap)
 *   - hover + pinned bit-history balloons
 *   - the detail panel docked at the bottom
 *   - the modal detail inspector + floating timing panel
 *
 * Pure presentation: the parent (Visualizer.jsx) owns all state and logic.
 * Refs are forwarded; mouse/wheel/keyboard handlers are attached by the
 * parent to the elements via these refs.
 *
 * This component is intentionally renderer-agnostic — the three canvas
 * elements are created here but the renderer reads them through the refs
 * passed by the parent. Swapping in a different visualization mode does
 * not require touching this file.
 */
function CanvasStage({
  // layout flags
  mode3D,
  // canvas refs (owned by parent, attached here)
  containerRef,
  canvasRef,
  settledCanvasRef,
  glCanvasRef,
  // wrapper div ref — receives the 3D CSS transform so canvas elements stay
  // flat (no per-canvas GPU layers in Safari → no black flicker)
  wrapperCanvasRef,
  // whether GL renderer is active (controls GL canvas visibility)
  glActive,
  // styling
  camera3DContainerStyle,
  renderCanvasStyle,
  // event title banner
  eventTitleSettings,
  setEventTitleSettings,
  eventTitleStyle,
  currentStepBanner,
  surroundingEvents,
  currentStepData,
  currentStep,
  goToStep,
  revealCurrentStepInPanel,
  eventsPanelCollapsed,
  setEventsPanelCollapsed,
  stepAnimSlidersContent,
  // join/split state for the joined widget feature
  widgetsJoined,
  onJoinWidgets,
  onSplitWidgets,
  // bit-history balloons
  pinnedBitIndices,
  hoveredBitInfo,
  computeBitInfo,
  getVisibleBalloonStyles,
  balloonLiveLayout,
  cachelineSize,
  setPinnedBitIndices,
  handleStepSelection,
  // detail panel
  detailOpen,
  toggleDetailPanel,
  detailHeight,
  updateDetailHeight,
  detailWidth,
  setDetailWidth,
  playing,
  selectedSteps,
  stepStats,
  storageModel,
  wheelDefinition,
  layoutSettings,
  benchmarkTimingData,
  openDetailInspector,
  // detail inspector overlay
  detailInspectorOpen,
  detailInspectorMode,
  detailInspectorQuery,
  setDetailInspectorQuery,
  setDetailInspectorOpen,
  detailInspectorRows,
  filteredDetailInspectorRows,
  // timing panel
  timingPanelOpen,
  setTimingPanelOpen,
  benchmarkTimingFileName,
  setTimingFocusOp,
  onImportBenchmarkTiming,
  steps,
  onShowEventTitle,
  onOpenRawLog,
  currentStepSourceLine,
}) {
  return (
    <div className={`canvas-area${mode3D ? ' mode-3d' : ''}`}>
      {eventTitleSettings.visible && !widgetsJoined && (
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
          eventsPanelCollapsed={eventsPanelCollapsed}
          setEventsPanelCollapsed={setEventsPanelCollapsed}
          detailOpen={detailOpen}
          toggleDetailPanel={toggleDetailPanel}
          sliders={stepAnimSlidersContent}
          onJoinWidgets={onJoinWidgets}
        />
      )}
      <div
        className={`canvas-container${mode3D ? ' mode-3d' : ''}`}
        ref={containerRef}
        style={camera3DContainerStyle}
      >
        {/* Wrapper div receives the 3D CSS transform (translate + rotateX/Y).
            Keeping the transform on a div instead of the canvas elements
            prevents Safari from creating one GPU compositing layer per canvas,
            which caused black flicker during drawing (GPU texture upload
            momentarily exposing a black/cleared layer). All three canvases
            are flat children of this wrapper and share its GPU layer. */}
        <div ref={wrapperCanvasRef} className="canvas-transform-wrapper" style={renderCanvasStyle}>
          {/* WebGL bit-grid canvas. Always in DOM so the renderer can attach on
              mount and mode switches are instant. Hidden via CSS when canvas2d
              renderer is active. Overlays/labels render on the Canvas2D layer on top. */}
          <canvas
            ref={glCanvasRef}
            className={`gl-render-canvas${glActive ? '' : ' renderer-inactive'}`}
            aria-hidden="true"
          />
          <canvas
            ref={settledCanvasRef}
            className="settled-render-canvas"
            aria-hidden="true"
          />
          <canvas
            ref={canvasRef}
            className="main-render-canvas"
          />
        </div>
      </div>

      <BitHistoryBalloons
        pinnedBitIndices={pinnedBitIndices}
        hoveredBitInfo={hoveredBitInfo}
        computeBitInfo={computeBitInfo}
        getVisibleBalloonStyles={getVisibleBalloonStyles}
        liveLayout={balloonLiveLayout}
        cachelineSize={cachelineSize}
        currentStep={currentStep}
        onUnpin={(bi) => setPinnedBitIndices((prev) => prev.filter((value) => value !== bi))}
        onHistoryClick={handleStepSelection}
      />

      <DetailPanel
        step={currentStepData}
        stepIndex={currentStep}
        open={detailOpen}
        onToggle={toggleDetailPanel}
        height={detailHeight}
        onHeightChange={updateDetailHeight}
        width={detailWidth}
        onWidthChange={setDetailWidth}
        playing={playing}
        stepStats={selectedSteps.size > 1 ? null : stepStats}
        storageModel={storageModel}
        wheelDefinition={wheelDefinition}
        bitLayout={layoutSettings.bitLayout}
        byteLayout={layoutSettings.byteLayout}
        benchmarkTimingData={benchmarkTimingData}
        onInspectChangedBits={() => openDetailInspector('bits')}
        onInspectMarkedNumbers={() => openDetailInspector('numbers')}
        eventTitleVisible={eventTitleSettings.visible && !widgetsJoined}
        onShowEventTitle={onShowEventTitle}
        eventAnimSliders={stepAnimSlidersContent}
        onOpenRawLog={onOpenRawLog}
        sourceLineNumber={currentStepSourceLine}
      />

      {detailInspectorOpen && (
        <DetailInspectorOverlay
          open={detailInspectorOpen}
          mode={detailInspectorMode}
          query={detailInspectorQuery}
          onQueryChange={setDetailInspectorQuery}
          onClose={() => setDetailInspectorOpen(false)}
          rows={detailInspectorRows}
          filteredRows={filteredDetailInspectorRows}
        />
      )}

      {timingPanelOpen && (
        <TimingPanel
          steps={steps}
          benchmarkTimingData={benchmarkTimingData}
          benchmarkTimingFileName={benchmarkTimingFileName}
          onClose={() => setTimingPanelOpen(false)}
          onFocusFn={(fnName) => setTimingFocusOp(fnName || '')}
          onImportBenchmarkTiming={onImportBenchmarkTiming}
        />
      )}
    </div>
  );
}

export default CanvasStage;
