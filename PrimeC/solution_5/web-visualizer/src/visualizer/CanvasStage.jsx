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
  glCanvasRef,
  glyphCanvasRef,
  // wrapper div ref — receives positioning (translate -50%/-50%) only.
  // The 3D CSS rotation is applied directly to the GL canvas imperatively
  // by refreshCanvasLayout (via camera3DTransformRef) so only one GPU
  // compositing layer is created, avoiding Safari black-flicker.
  wrapperCanvasRef,
  // whether GL renderer is active (controls GL canvas visibility)
  glActive,
  hideGlCanvas = false,
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
  isEventsPanelCollapsed,
  setIsEventsPanelCollapsed,
  stepAnimSlidersContent,
  stepAnimSlidersDockedContent,
  // join/split state for the joined widget feature
  areWidgetsJoined,
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
  isDetailOpen,
  toggleDetailPanel,
  detailHeight,
  pendingBannerDragStart,
  onConsumePendingBannerDragStart,
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
  isDetailInspectorOpen,
  detailInspectorMode,
  detailInspectorQuery,
  setDetailInspectorQuery,
  setIsDetailInspectorOpen,
  detailInspectorRows,
  filteredDetailInspectorRows,
  // timing panel
  isTimingPanelOpen,
  setIsTimingPanelOpen,
  benchmarkTimingFileName,
  setTimingFocusOp,
  onImportBenchmarkTiming,
  steps,
  onShowEventTitle,
  onOpenRawLog,
  currentStepSourceLine,
  hasRawSource = false,
  allEventsTransport,
  // Intro animation phase: 'hidden' | 'scaling' | 'tilting' | 'visible'
  introPhase = 'visible',
  onIntroTransitionEnd,
  // Gating flag: single-event widget hidden until first play or event selection
  isSingleEventWidgetRevealed = true,
}) {
  return (
    <div className={`canvas-area${mode3D ? ' mode-3d' : ''}`}>
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
      <div
        className={`canvas-container${mode3D ? ' mode-3d' : ''}`}
        ref={containerRef}
        style={camera3DContainerStyle}
      >
        {/* Wrapper div handles only positioning (translate -50%/-50%) and
            preserve-3d so the GL canvas's own rotateX/Y is interpreted in
            the parent 3D context rather than being flattened.
            The 3D rotation lives on the single GL canvas element — one GPU
            compositing layer, no Safari black-flicker from multiple canvases
            sharing a rotated layer. */}
        <div
          ref={wrapperCanvasRef}
          className={`canvas-transform-wrapper canvas-intro-${introPhase}`}
          style={renderCanvasStyle}
          onTransitionEnd={introPhase === 'scaling' ? onIntroTransitionEnd : undefined}
        >
          {/* WebGL bit-grid canvas. The 3D rotation (rotateX/Y) is applied
              here directly so it is the only element with a 3D transform,
              keeping the GPU layer count at one. */}
          <canvas
            ref={glCanvasRef}
            className={`gl-render-canvas${glActive ? '' : ' renderer-inactive'}${hideGlCanvas ? ' debug-hidden' : ''}`}
            aria-hidden="true"
          />
          {/* WebGL glyph-text canvas — transparent overlay for per-cell labels
              and dots. Gets the same rotation as the GL canvas (applied
              imperatively by refreshCanvasLayout / the camera3DTransform effect)
              so both canvases stay aligned. Each has its own GPU compositing
              layer, which avoids the shared-layer black-flicker seen in Safari
              when the rotation lived on the wrapper div. */}
          <canvas
            ref={glyphCanvasRef}
            className="glyph-render-canvas"
            aria-hidden="true"
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
        step={isSingleEventWidgetRevealed ? currentStepData : null}
        stepIndex={currentStep}
        open={isDetailOpen}
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
        eventTitleVisible={eventTitleSettings.visible && !areWidgetsJoined}
        onShowEventTitle={onShowEventTitle}
        eventAnimSliders={stepAnimSlidersDockedContent || stepAnimSlidersContent}
        onOpenRawLog={onOpenRawLog}
        sourceLineNumber={currentStepSourceLine}
        hasRawSource={hasRawSource}
        allEventsTransport={allEventsTransport}
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
    </div>
  );
}

export default CanvasStage;
