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
  loweredSetBits,
  // canvas refs (owned by parent, attached here)
  containerRef,
  canvasRef,
  settledCanvasRef,
  minimapCanvasRef,
  glCanvasRef,
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
  stepsPanelCollapsed,
  setStepsPanelCollapsed,
  stepAnimSlidersContent,
  // bit-history balloons
  pinnedBitIndices,
  hoveredBitInfo,
  computeBitInfo,
  getVisibleBalloonStyles,
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
}) {
  return (
    <div className={`canvas-area${mode3D ? ' mode-3d' : ''}`}>
      {eventTitleSettings.visible && (
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
          stepsPanelCollapsed={stepsPanelCollapsed}
          setStepsPanelCollapsed={setStepsPanelCollapsed}
          sliders={stepAnimSlidersContent}
        />
      )}
      <div
        className={`canvas-container${mode3D ? ' mode-3d' : ''}`}
        ref={containerRef}
        style={camera3DContainerStyle}
      >
        {glCanvasRef && (
          // Experimental WebGL bit-grid (see docs/AI_MAINTENANCE.md §8).
          // Mounted underneath the Canvas2D layers so overlays/labels keep
          // working unchanged on top. Only present when ?renderer=gl.
          <canvas
            ref={glCanvasRef}
            className="gl-render-canvas"
            style={renderCanvasStyle}
            aria-hidden="true"
          />
        )}
        <canvas
          ref={settledCanvasRef}
          className={`settled-render-canvas${loweredSetBits ? ' active' : ''}`}
          style={renderCanvasStyle}
          aria-hidden="true"
        />
        <canvas
          ref={canvasRef}
          className="main-render-canvas"
          style={renderCanvasStyle}
        />
        <canvas
          ref={minimapCanvasRef}
          className="minimap-overlay-canvas"
          aria-hidden="true"
        />
      </div>

      <BitHistoryBalloons
        pinnedBitIndices={pinnedBitIndices}
        hoveredBitInfo={hoveredBitInfo}
        computeBitInfo={computeBitInfo}
        getVisibleBalloonStyles={getVisibleBalloonStyles}
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
        bitLayout={layoutSettings.bitLayout}
        byteLayout={layoutSettings.byteLayout}
        benchmarkTimingData={benchmarkTimingData}
        onInspectChangedBits={() => openDetailInspector('bits')}
        onInspectMarkedNumbers={() => openDetailInspector('numbers')}
        eventTitleVisible={eventTitleSettings.visible}
        onShowEventTitle={() =>
          setEventTitleSettings((prev) => ({ ...prev, visible: true }))
        }
        eventAnimSliders={stepAnimSlidersContent}
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
