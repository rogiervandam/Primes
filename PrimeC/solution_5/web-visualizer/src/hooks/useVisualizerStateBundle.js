/**
 * useVisualizerStateBundle
 *
 * Organises all raw Visualizer state variables into semantic domain objects.
 * Called once in Visualizer.jsx after all hooks are resolved so all variables
 * are in scope.  No React hooks are called internally; the `use` prefix follows
 * the project's convention for component-scoped logic functions.
 *
 * Returns: { canvasState, uiFrameState, animationState, playbackState,
 *            themeState, panelState, overlayState, bitState, cameraState,
 *            debugState, uiState, timingPanelState, detailInspectorState,
 *            animationTimingRefs, uiElementRefs, platformInfo, uiLogic }
 */
// eslint-disable-next-line react-hooks/rules-of-hooks -- no React hooks called internally
export function useVisualizerStateBundle({
  // Canvas refs
  minimapCanvasRef, containerRef, rendererRef,
  glCanvasRef, glRendererRef, glyphCanvasRef, glyph2DCanvasRef, glyphRendererRef, wrapperCanvasRef,
  glCssUnlockTokenRef, glCssUnlockRafRef, glCssUnlockTimeoutRef, glCssLockStateRef, pendingRenderRafRef,
  // 3D camera
  mode3D, camera3DRef, camera3DTransform, camera3DContainerStyle, cameraKey,
  // UI frame
  introPhase, isUiChromeVisible, loadingOverlayPhase, isTopbarPlaybackReady, overlayBarPct,
  introTiltStartedRef, overlayStartTimeRef, pendingIntroAfterOverlayRef, loadCompleteRef, loadProgressRef,
  // Animation config
  animMode, animStyle, delayBetweenEvents, eventTimeTargets, eventDurationMode,
  bitAnimInterval, maskAnimInterval, stepSpeedValue, maskSpeedValue,
  // Animation runtime
  bitAnimationMode, isAutoAnimateOnSelect, isAnimationReplayPaused, isStepAnimRunning,
  stepScrubProgress, delayPhaseMs,
  // Animation refs
  eventTimeTargetsRef, eventDurationModeRef, bitsAtTimeRatioRef, timeRatioAtBitIndexRef,
  computeEventDurationRef, globalPausedRef, seekGenRef, animBusyUntilRef,
  isScrubbingTopRef, stepScrubProgressRef, stepScrubProgressValueRef,
  setIsStepAnimRunningRef, isStepAnimRunningRefForScheduler,
  stepResumeStartIndexRef, stepResumeMaskProgressRef,
  currentAnimIntervalRef, currentMaskAnimIntervalRef, pausedStepAnimLoopRef, selectedAnimLoopRef,
  // Playback
  playing, currentStep, playSpeedPercent,
  playSpeedPercentRef, playTimerRef, playTimeoutRef, currentStepRef, stepsRef,
  // Theme
  colorPreset, customColors, canvasColors, gridOpacity, zoom,
  debugGlOffsetXRef, debugGlOffsetYRef, debugGlAutoOffsetYRef, glDebugLastUpdateRef,
  // Panel: events
  isEventsPanelCollapsed, panelWidth,
  // Panel: settings
  isSettingsCollapsed, settingsActiveTab, settingsTabRequest,
  // Panel: detail
  isDetailOpen, detailHeight, detailWidth, isDetailOpenRef, detailHeightRef,
  isDetailHeaderHidden, isDetailPanelFloating,
  // Panel: minimap
  isMinimapVisible, isMinimapAvailable,
  // Panel: widgets
  isAllEventsWidgetHidden, isAllEventsInDetailPanel,
  joinBannerRect, pendingBannerDragStart, revealStepRequest,
  // Panel: refs
  layoutRefreshTimeoutRef, layoutRefreshRaf1Ref, layoutRefreshRaf2Ref,
  canvasAnchorPx, pendingResizeAnchorRef, deferredPanelStateRef, viewportAnimRef,
  // Overlays
  isHeatMapEnabled, isPrimeOverlayEnabled,
  isRangeOverlayEnabled, rangeOverlayStart, rangeOverlayEnd,
  isMultiplesOverlayEnabled, multiplesOverlayPrime,
  areBalloonsEnabled, isBalloonClickEnabled, isBalloonHoverEnabled,
  pinnedBitIndices, hoveredBitInfo, balloonLiveLayout,
  balloonLayoutRafRef, balloonLiveLayoutTimerRef, lastHoveredIdxRef,
  cachelineSize, cachelineAnnotation, cachePreset,
  // Bit state
  bitStateRef, bitStateCheckpointsRef, bitStateDirtyRef, selectedSteps, selectedStepsRef,
  // Debug
  isDebugToolsOpen, isGlUnavailable, glDebugInfo,
  debugLayerMode, debugGlOffsetX, debugGlOffsetY, debugGlAutoOffsetY,
  isDebugCalibrationMode, debugRenderTuning,
  // UI
  isTraceInfoVisible, isShortcutsHelpVisible, layoutSettings, eventTitleSettings, storageModel, autoFitColumnCount,
  // Timing panel
  isTimingPanelOpen, timingFocusOp,
  // Detail inspector
  isDetailInspectorOpen, detailInspectorMode, detailInspectorQuery,
  // Animation timing refs
  rippleRef, seqTimerRef, runEffectCancelRef, triggerAnimationRef, stopSeqAnimRef,
  initialFitDoneRef, initialHighlightHoldRef,
  // UI element refs
  traceInfoPopoverRef, traceInfoToggleRef,
  // Platform
  isMacPlatform, isWindowsPlatform, isElectron,
  // Tilt
  isTiltActive,
  // Derived
  areControlsHidden, balloonMode,
}) {
  // Canvas rendering infrastructure
  const canvasState = {
    refs: {
      minimap: minimapCanvasRef,
      container: containerRef,
      renderer: rendererRef,
      glCanvas: glCanvasRef,
      glRenderer: glRendererRef,
      glyphCanvas: glyphCanvasRef,
      glyph2DCanvas: glyph2DCanvasRef,
      glyphRenderer: glyphRendererRef,
      wrapperCanvas: wrapperCanvasRef,
      glCssUnlockToken: glCssUnlockTokenRef,
      glCssUnlockRaf: glCssUnlockRafRef,
      glCssUnlockTimeout: glCssUnlockTimeoutRef,
      glCssLockState: glCssLockStateRef,
      pendingRenderRaf: pendingRenderRafRef,
    },
    is3DEnabled: mode3D,
    camera: {
      ref: camera3DRef,
      transform: camera3DTransform,
      containerStyle: camera3DContainerStyle,
      key: cameraKey,
    },
  };

  // UI frame lifecycle (intro animation, loading overlay, chrome visibility)
  const uiFrameState = {
    introPhase,
    isUiChromeVisible,
    loadingOverlayPhase,
    isTopbarPlaybackReady,
    overlayBarPct,
    refs: {
      introTiltStarted: introTiltStartedRef,
      overlayStartTime: overlayStartTimeRef,
      pendingIntroAfterOverlay: pendingIntroAfterOverlayRef,
      loadComplete: loadCompleteRef,
      loadProgress: loadProgressRef,
    },
  };

  // Animation runtime configuration (timing, intervals, progression)
  const animationState = {
    config: {
      mode: animMode,
      style: animStyle,
      delayBetweenEvents,
      eventTimeTargets,
      eventDurationMode,
      bitAnimInterval,
      maskAnimInterval,
      stepSpeedValue,
      maskSpeedValue,
    },
    runtime: {
      bitAnimationMode,
      isAutoAnimateOnSelect,
      isAnimationReplayPaused,
      isStepAnimRunning,
      stepScrubProgress,
      delayPhaseMs,
    },
    refs: {
      eventTimeTargets: eventTimeTargetsRef,
      eventDurationMode: eventDurationModeRef,
      bitsAtTimeRatio: bitsAtTimeRatioRef,
      timeRatioAtBitIndex: timeRatioAtBitIndexRef,
      computeEventDuration: computeEventDurationRef,
      globalPaused: globalPausedRef,
      seekGen: seekGenRef,
      animBusyUntil: animBusyUntilRef,
      isScrubbingTop: isScrubbingTopRef,
      stepScrubProgress: stepScrubProgressRef,
      stepScrubProgressValue: stepScrubProgressValueRef,
      setIsStepAnimRunning: setIsStepAnimRunningRef,
      isStepAnimRunningForScheduler: isStepAnimRunningRefForScheduler,
      stepResumeStartIndex: stepResumeStartIndexRef,
      stepResumeMaskProgress: stepResumeMaskProgressRef,
      currentAnimInterval: currentAnimIntervalRef,
      currentMaskAnimInterval: currentMaskAnimIntervalRef,
      pausedStepAnimLoop: pausedStepAnimLoopRef,
      selectedAnimLoop: selectedAnimLoopRef,
    },
  };

  // Playback control state (play/pause, speed, current step)
  const playbackState = {
    isPlaying: playing,
    currentStep,
    speed: playSpeedPercent,
    refs: {
      speed: playSpeedPercentRef,
      timer: playTimerRef,
      timeout: playTimeoutRef,
      currentStep: currentStepRef,
      steps: stepsRef,
    },
  };

  // Visual theme and canvas rendering appearance
  const themeState = {
    colorPreset,
    customColors,
    canvasColors,
    gridOpacity,
    zoom,
    refs: {
      debugGlOffsetX: debugGlOffsetXRef,
      debugGlOffsetY: debugGlOffsetYRef,
      debugGlAutoOffsetY: debugGlAutoOffsetYRef,
      glDebugLastUpdate: glDebugLastUpdateRef,
    },
  };

  // Panel layout and UI panel states (Events, Settings, Detail, Minimap)
  const panelState = {
    events: {
      isCollapsed: isEventsPanelCollapsed,
      width: panelWidth,
    },
    settings: {
      isCollapsed: isSettingsCollapsed,
      activeTab: settingsActiveTab,
      tabRequest: settingsTabRequest,
    },
    detail: {
      isOpen: isDetailOpen,
      height: detailHeight,
      width: detailWidth,
      refs: {
        isOpen: isDetailOpenRef,
        height: detailHeightRef,
      },
      // item 155: header hidden when dragged all the way down
      isHeaderHidden: isDetailHeaderHidden,
      // item 157: floating detail panel
      isFloating: isDetailPanelFloating,
    },
    minimap: {
      isVisible: isMinimapVisible,
      isAvailable: isMinimapAvailable,
    },
    widgets: {
      allEventsHidden: isAllEventsWidgetHidden,
      allEventsInDetail: isAllEventsInDetailPanel,
      joinBannerRect,
      pendingBannerDragStart,
      revealStepRequest,
    },
    refs: {
      layoutRefreshTimeout: layoutRefreshTimeoutRef,
      layoutRefreshRaf1: layoutRefreshRaf1Ref,
      layoutRefreshRaf2: layoutRefreshRaf2Ref,
      canvasAnchor: canvasAnchorPx,
      pendingResizeAnchor: pendingResizeAnchorRef,
      deferred: deferredPanelStateRef,
      viewportAnim: viewportAnimRef,
    },
  };

  // Overlay feature states (heat map, prime, range, multiples, balloons)
  const overlayState = {
    heatMap: {
      isEnabled: isHeatMapEnabled,
    },
    prime: {
      isEnabled: isPrimeOverlayEnabled,
    },
    range: {
      isEnabled: isRangeOverlayEnabled,
      start: rangeOverlayStart,
      end: rangeOverlayEnd,
    },
    multiples: {
      isEnabled: isMultiplesOverlayEnabled,
      prime: multiplesOverlayPrime,
    },
    balloons: {
      areEnabled: areBalloonsEnabled,
      isClickEnabled: isBalloonClickEnabled,
      isHoverEnabled: isBalloonHoverEnabled,
      pinnedIndices: pinnedBitIndices,
      hoveredBitInfo,
      liveLayout: balloonLiveLayout,
      refs: {
        layoutRaf: balloonLayoutRafRef,
        layoutTimer: balloonLiveLayoutTimerRef,
        lastHoveredIdx: lastHoveredIdxRef,
      },
    },
    cache: {
      cachelineSize,
      cachelineAnnotation,
      cachePreset,
    },
  };

  // Bit state (current data + selection)
  const bitState = {
    refs: {
      state: bitStateRef,
      checkpoints: bitStateCheckpointsRef,
      dirty: bitStateDirtyRef,
    },
    selected: {
      steps: selectedSteps,
      refs: selectedStepsRef,
    },
  };

  // 3D Camera controls
  const cameraState = {
    is3D: mode3D,
    ref: camera3DRef,
    transform: camera3DTransform,
    containerStyle: camera3DContainerStyle,
    isTiltActive,
  };

  // Debug tools state
  const debugState = {
    isToolsOpen: isDebugToolsOpen,
    isGlUnavailable,
    glDebugInfo,
    debugLayerMode,
    debugGlOffsetX,
    debugGlOffsetY,
    debugGlAutoOffsetY,
    isDebugCalibrationMode,
    debugRenderTuning,
  };

  // UI chrome visibility & settings
  const uiState = {
    isTraceInfoVisible,
    isShortcutsHelpVisible,
    layoutSettings,
    eventTitleSettings,
    storageModel,
    autoFitColumnCount,
  };

  // Timing Panel state
  const timingPanelState = {
    isOpen: isTimingPanelOpen,
    focusOp: timingFocusOp,
  };

  // Detail Inspector state
  const detailInspectorState = {
    isOpen: isDetailInspectorOpen,
    mode: detailInspectorMode,
    query: detailInspectorQuery,
  };

  // Animation timing refs (internal sequencing)
  const animationTimingRefs = {
    ripple: rippleRef,
    sequenceTimer: seqTimerRef,
    runEffectCancel: runEffectCancelRef,
    triggerAnimation: triggerAnimationRef,
    stopSequence: stopSeqAnimRef,
    initialFitDone: initialFitDoneRef,
    initialHighlightHold: initialHighlightHoldRef,
  };

  // UI element refs (popovers, overlays)
  const uiElementRefs = {
    traceInfoPopover: traceInfoPopoverRef,
    traceInfoToggle: traceInfoToggleRef,
  };

  // Platform detection
  const platformInfo = {
    isMac: isMacPlatform,
    isWindows: isWindowsPlatform,
    isElectron,
  };

  // Derived values for UI logic
  const uiLogic = {
    areControlsHidden,
    balloonMode,
  };

  return {
    canvasState,
    uiFrameState,
    animationState,
    playbackState,
    themeState,
    panelState,
    overlayState,
    bitState,
    cameraState,
    debugState,
    uiState,
    timingPanelState,
    detailInspectorState,
    animationTimingRefs,
    uiElementRefs,
    platformInfo,
    uiLogic,
  };
}
