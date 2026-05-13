import React from 'react';
import CanvasOverlayManager from './CanvasOverlayManager';

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
 * @param {object}   props.canvasConfig            - Canvas configuration (glActive, hideGlCanvas)
 * @param {object}   props.canvasStyles            - Canvas styling (camera3DContainerStyle, renderCanvasStyle)
 * @param {object}   props.overlay                 - CanvasOverlayManager props (all overlay-related state/handlers)
 * @param {object}   props.detail                  - DetailPanel props (all detail-related state/handlers)
 * @param {object}   props.intro                   - Intro animation state (introPhase, onIntroTransitionEnd)
 *
 */
function CanvasStage({
  canvasRefs = {},
  canvasConfig = {},
  canvasStyles = {},
  overlay = {},
  intro = {},
}) {

  // Extract canvas refs
  const {
    containerRef,
    glCanvasRef,
    glyphCanvasRef,
    glyph2DCanvasRef,
    wrapperCanvasRef,
  } = canvasRefs;

  // Extract canvas config
  const {
    glCanvasKey = 'gl-auto',
    glActive,
    hideGlCanvas = false,
  } = canvasConfig;

  // Extract canvas styles
  const {
    camera3DContainerStyle,
    renderCanvasStyle,
  } = canvasStyles;

  // Extract intro state
  const {
    introPhase = 'visible',
    onIntroTransitionEnd,
  } = intro;

  const overlayState = {
    eventTitleSettings: overlay.eventTitleSettings,
    eventTitleStyle: overlay.eventTitleStyle,
    currentStepData: overlay.currentStepData,
    currentStep: overlay.currentStep,
    isEventsPanelCollapsed: overlay.isEventsPanelCollapsed,
    stepAnimSlidersContent: overlay.stepAnimSlidersContent,
    pinnedBitIndices: overlay.pinnedBitIndices,
    hoveredBitInfo: overlay.hoveredBitInfo,
    balloonLiveLayout: overlay.balloonLiveLayout,
    cachelineSize: overlay.cachelineSize,
    isDetailOpen: overlay.isDetailOpen,
    detailHeight: overlay.detailHeight,
    isDetailInspectorOpen: overlay.isDetailInspectorOpen,
    detailInspectorMode: overlay.detailInspectorMode,
    detailInspectorQuery: overlay.detailInspectorQuery,
    detailInspectorRows: overlay.detailInspectorRows,
    filteredDetailInspectorRows: overlay.filteredDetailInspectorRows,
    isTimingPanelOpen: overlay.isTimingPanelOpen,
    steps: overlay.steps,
    benchmarkTimingData: overlay.benchmarkTimingData,
    benchmarkTimingFileName: overlay.benchmarkTimingFileName,
    // item 331: group inspector
    groupInspectorUnit: overlay.groupInspectorUnit,
    groupInspectorEffectiveGroupBits: overlay.groupInspectorEffectiveGroupBits,
    groupInspectorStorageModel: overlay.groupInspectorStorageModel,
    groupInspectorWheelDefinition: overlay.groupInspectorWheelDefinition,
    groupInspectorBitLayout: overlay.groupInspectorBitLayout,
    groupInspectorByteLayout: overlay.groupInspectorByteLayout,
    groupInspectorBitCount: overlay.groupInspectorBitCount,
  };

  const overlayHandlers = {
    setEventTitleSettings: overlay.setEventTitleSettings,
    goToStep: overlay.goToStep,
    revealCurrentStepInPanel: overlay.revealCurrentStepInPanel,
    setIsEventsPanelCollapsed: overlay.setIsEventsPanelCollapsed,
    computeBitInfo: overlay.computeBitInfo,
    getVisibleBalloonStyles: overlay.getVisibleBalloonStyles,
    setPinnedBitIndices: overlay.setPinnedBitIndices,
    handleStepSelection: overlay.handleStepSelection,
    toggleDetailPanel: overlay.toggleDetailPanel,
    setDetailInspectorQuery: overlay.setDetailInspectorQuery,
    setIsDetailInspectorOpen: overlay.setIsDetailInspectorOpen,
    setIsTimingPanelOpen: overlay.setIsTimingPanelOpen,
    setTimingFocusOp: overlay.setTimingFocusOp,
    onImportBenchmarkTiming: overlay.onImportBenchmarkTiming,
    // item 331: group inspector handlers
    openGroupInspector: overlay.openGroupInspector,
    closeGroupInspector: overlay.closeGroupInspector,
  };

  return (
    <div className="canvas-area">
      <CanvasOverlayManager
        overlayState={overlayState}
        overlayHandlers={overlayHandlers}
      />

      <div
        className="canvas-container"
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
            key={glCanvasKey}
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
          <canvas
            ref={glyph2DCanvasRef}
            className="glyph2d-render-canvas"
            aria-hidden="true"
          />
        </div>
      </div>

    </div>
  );
}

export default CanvasStage;
