import React from 'react';
import CanvasOverlayManager from './CanvasOverlayManager';
import DetailPanel from '../DetailPanel';

/**
 * CanvasStage — the centre column of the visualizer:
 *   - optional event-title banner above the canvas
 *   - the layered canvas stack (settled / main / minimap)
 *   - hover + pinned bit-history balloons
 *   - the detail panel docked at the bottom
 *   - the modal detail inspector + floating timing panel
 *
 * Phase 5 Refactoring: Accepts organized prop objects instead of 80+ scattered props.
 * Pure presentation: the parent (Visualizer.jsx) owns all state and logic.
 *
 * @param {object}   props
 * @param {object}   props.canvasRefs              - Canvas element refs (containerRef, glCanvasRef, glyphCanvasRef, wrapperCanvasRef)
 * @param {object}   props.canvasConfig            - Canvas configuration (mode3D, glActive, hideGlCanvas)
 * @param {object}   props.canvasStyles            - Canvas styling (camera3DContainerStyle, renderCanvasStyle)
 * @param {object}   props.overlay                 - CanvasOverlayManager props (all overlay-related state/handlers)
 * @param {object}   props.detail                  - DetailPanel props (all detail-related state/handlers)
 * @param {object}   props.intro                   - Intro animation state (introPhase, onIntroTransitionEnd, isSingleEventWidgetRevealed)
 *
 * Flat fallback: if organized objects not provided, will accept flat props for backward compatibility.
 */
function CanvasStage(props) {
  // Phase 5: Destructure organized objects with flat fallback compatibility
  const canvasRefs = props.canvasRefs || {};
  const canvasConfig = props.canvasConfig || {};
  const canvasStyles = props.canvasStyles || {};
  const overlay = props.overlay || {};
  const detail = props.detail || {};
  const intro = props.intro || {};

  // Extract canvas refs
  const {
    containerRef = props.containerRef,
    glCanvasRef = props.glCanvasRef,
    glyphCanvasRef = props.glyphCanvasRef,
    wrapperCanvasRef = props.wrapperCanvasRef,
  } = canvasRefs;

  // Extract canvas config
  const {
    mode3D = props.mode3D,
    glActive = props.glActive,
    hideGlCanvas = props.hideGlCanvas !== undefined ? props.hideGlCanvas : false,
  } = canvasConfig;

  // Extract canvas styles
  const {
    camera3DContainerStyle = props.camera3DContainerStyle,
    renderCanvasStyle = props.renderCanvasStyle,
  } = canvasStyles;

  // Extract intro state
  const {
    introPhase = props.introPhase || 'visible',
    onIntroTransitionEnd = props.onIntroTransitionEnd,
    isSingleEventWidgetRevealed = props.isSingleEventWidgetRevealed !== undefined ? props.isSingleEventWidgetRevealed : true,
  } = intro;

  // Extract overlay props (all passed to CanvasOverlayManager)
  const overlayProps = {
    eventTitleSettings: overlay.eventTitleSettings || props.eventTitleSettings,
    setEventTitleSettings: overlay.setEventTitleSettings || props.setEventTitleSettings,
    eventTitleStyle: overlay.eventTitleStyle || props.eventTitleStyle,
    currentStepBanner: overlay.currentStepBanner || props.currentStepBanner,
    surroundingEvents: overlay.surroundingEvents || props.surroundingEvents,
    currentStepData: overlay.currentStepData || props.currentStepData,
    currentStep: overlay.currentStep || props.currentStep,
    goToStep: overlay.goToStep || props.goToStep,
    revealCurrentStepInPanel: overlay.revealCurrentStepInPanel || props.revealCurrentStepInPanel,
    isEventsPanelCollapsed: overlay.isEventsPanelCollapsed || props.isEventsPanelCollapsed,
    setIsEventsPanelCollapsed: overlay.setIsEventsPanelCollapsed || props.setIsEventsPanelCollapsed,
    stepAnimSlidersContent: overlay.stepAnimSlidersContent || props.stepAnimSlidersContent,
    areWidgetsJoined: overlay.areWidgetsJoined || props.areWidgetsJoined,
    onJoinWidgets: overlay.onJoinWidgets || props.onJoinWidgets,
    pinnedBitIndices: overlay.pinnedBitIndices || props.pinnedBitIndices,
    hoveredBitInfo: overlay.hoveredBitInfo || props.hoveredBitInfo,
    computeBitInfo: overlay.computeBitInfo || props.computeBitInfo,
    getVisibleBalloonStyles: overlay.getVisibleBalloonStyles || props.getVisibleBalloonStyles,
    balloonLiveLayout: overlay.balloonLiveLayout || props.balloonLiveLayout,
    cachelineSize: overlay.cachelineSize || props.cachelineSize,
    setPinnedBitIndices: overlay.setPinnedBitIndices || props.setPinnedBitIndices,
    handleStepSelection: overlay.handleStepSelection || props.handleStepSelection,
    isDetailOpen: overlay.isDetailOpen || props.isDetailOpen,
    detailHeight: overlay.detailHeight || props.detailHeight,
    toggleDetailPanel: overlay.toggleDetailPanel || props.toggleDetailPanel,
    pendingBannerDragStart: overlay.pendingBannerDragStart || props.pendingBannerDragStart,
    onConsumePendingBannerDragStart: overlay.onConsumePendingBannerDragStart || props.onConsumePendingBannerDragStart,
    isDetailInspectorOpen: overlay.isDetailInspectorOpen || props.isDetailInspectorOpen,
    detailInspectorMode: overlay.detailInspectorMode || props.detailInspectorMode,
    detailInspectorQuery: overlay.detailInspectorQuery || props.detailInspectorQuery,
    setDetailInspectorQuery: overlay.setDetailInspectorQuery || props.setDetailInspectorQuery,
    setIsDetailInspectorOpen: overlay.setIsDetailInspectorOpen || props.setIsDetailInspectorOpen,
    detailInspectorRows: overlay.detailInspectorRows || props.detailInspectorRows,
    filteredDetailInspectorRows: overlay.filteredDetailInspectorRows || props.filteredDetailInspectorRows,
    isTimingPanelOpen: overlay.isTimingPanelOpen || props.isTimingPanelOpen,
    setIsTimingPanelOpen: overlay.setIsTimingPanelOpen || props.setIsTimingPanelOpen,
    steps: overlay.steps || props.steps,
    benchmarkTimingData: overlay.benchmarkTimingData || props.benchmarkTimingData,
    benchmarkTimingFileName: overlay.benchmarkTimingFileName || props.benchmarkTimingFileName,
    setTimingFocusOp: overlay.setTimingFocusOp || props.setTimingFocusOp,
    onImportBenchmarkTiming: overlay.onImportBenchmarkTiming || props.onImportBenchmarkTiming,
    isSingleEventWidgetRevealed,
  };

  // Extract detail props (all passed to DetailPanel)
  const detailProps = {
    step: detail.step !== undefined ? detail.step : (isSingleEventWidgetRevealed ? (props.currentStepData || null) : null),
    stepIndex: detail.stepIndex || props.currentStep,
    open: detail.open || props.isDetailOpen,
    onToggle: detail.onToggle || props.toggleDetailPanel,
    height: detail.height || props.detailHeight,
    onHeightChange: detail.onHeightChange || props.updateDetailHeight,
    width: detail.width || props.detailWidth,
    onWidthChange: detail.onWidthChange || props.setDetailWidth,
    playing: detail.playing || props.playing,
    stepStats: detail.stepStats || (props.selectedSteps && props.selectedSteps.size > 1 ? null : props.stepStats),
    storageModel: detail.storageModel || props.storageModel,
    wheelDefinition: detail.wheelDefinition || props.wheelDefinition,
    bitLayout: detail.bitLayout || (props.layoutSettings && props.layoutSettings.bitLayout) || '4x2',
    byteLayout: detail.byteLayout || (props.layoutSettings && props.layoutSettings.byteLayout) || '4x2',
    benchmarkTimingData: detail.benchmarkTimingData || props.benchmarkTimingData,
    onInspectChangedBits: detail.onInspectChangedBits || (() => (props.openDetailInspector ? props.openDetailInspector('bits') : undefined)),
    onInspectMarkedNumbers: detail.onInspectMarkedNumbers || (() => (props.openDetailInspector ? props.openDetailInspector('numbers') : undefined)),
    eventTitleVisible: detail.eventTitleVisible || (props.eventTitleSettings && props.eventTitleSettings.visible && !(props.areWidgetsJoined)),
    onShowEventTitle: detail.onShowEventTitle || props.onShowEventTitle,
    eventAnimSliders: detail.eventAnimSliders || (props.stepAnimSlidersDockedContent || props.stepAnimSlidersContent),
    onOpenRawLog: detail.onOpenRawLog || props.onOpenRawLog,
    sourceLineNumber: detail.sourceLineNumber || props.currentStepSourceLine,
    hasRawSource: detail.hasRawSource !== undefined ? detail.hasRawSource : (props.hasRawSource !== undefined ? props.hasRawSource : false),
    allEventsTransport: detail.allEventsTransport || props.allEventsTransport,
  };
  return (
    <div className={`canvas-area${mode3D ? ' mode-3d' : ''}`}>
      <CanvasOverlayManager {...overlayProps} />

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

      <DetailPanel
        detailState={{
          step: detailProps.step,
          stepIndex: detailProps.stepIndex,
          open: detailProps.open,
          height: detailProps.height,
          width: detailProps.width,
          playing: detailProps.playing,
          stepStats: detailProps.stepStats,
          bitLayout: detailProps.bitLayout,
          byteLayout: detailProps.byteLayout,
          eventTitleVisible: detailProps.eventTitleVisible,
          sourceLineNumber: detailProps.sourceLineNumber,
          hasRawSource: detailProps.hasRawSource,
        }}
        detailConfig={{
          storageModel: detailProps.storageModel,
          wheelDefinition: detailProps.wheelDefinition,
          benchmarkTimingData: detailProps.benchmarkTimingData,
          eventAnimSliders: detailProps.eventAnimSliders,
          allEventsTransport: detailProps.allEventsTransport,
        }}
        detailHandlers={{
          onToggle: detailProps.onToggle,
          onHeightChange: detailProps.onHeightChange,
          onWidthChange: detailProps.onWidthChange,
          onInspectChangedBits: detailProps.onInspectChangedBits,
          onInspectMarkedNumbers: detailProps.onInspectMarkedNumbers,
          onShowEventTitle: detailProps.onShowEventTitle,
          onOpenRawLog: detailProps.onOpenRawLog,
        }}
      />

    </div>
  );
}

export default CanvasStage;
