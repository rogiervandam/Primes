import { useCallback } from 'react';
import { COLOR_PRESETS } from '../../renderer/constants';

/**
 * useVisualizerPropBundles
 *
 * Assembles the `visualizerMainContentProps` and `toolbarProps` objects that are
 * spread onto <VisualizerMainContent> and <Toolbar> respectively.  This is pure
 * data reorganisation — all values come in through the parameter object and are
 * reorganised into the nested prop shapes expected by the child components.
 *
 * `openSpotlight` is the only inline useCallback; it is hoisted to the top of
 * this hook rather than living inside the toolbarProps object literal.
 */
export function useVisualizerPropBundles({
  // ── Canvas & rendering ────────────────────────────────────────────────────
  mode3D,
  minimapCanvasRef,
  containerRef, glCanvasRef, glyphCanvasRef, glyph2DCanvasRef, wrapperCanvasRef,
  rendererRef, glRendererRef, camera3DRef,
  mergedCamera3DContainerStyle, renderCanvasStyle,
  camera3DTransform,
  zoom,
  isMacPlatform, isWindowsPlatform,

  // ── UI frame ──────────────────────────────────────────────────────────────
  isUiChromeVisible, introPhase, loadingOverlayPhase, overlayBarPct,
  handleIntroTransitionEnd,

  // ── Playback ──────────────────────────────────────────────────────────────
  steps, currentStep, selectedSteps, playing,
  handleStepSelection, handleMultiStepSelect, stopPlayback, goToStep,

  // ── Animation & content ───────────────────────────────────────────────────
  allEventsTransportContent, surroundingEvents, currentStepData,
  aggMaskStepIndex, aggMaskStepSetterRef,
  stepScrubProgress, seekStepAnimation, setStepScrubProgress, handleStepAnimToggle,
  isStepAnimRunning, isAnimationReplayPaused, openAnimationSettings, exporting,
  isEventsPanelCollapsed, toggleEventsPanel, collapseEventsPanelFromTimeline,
  revealCurrentStepInPanel, isSettingsCollapsed, toggleSettingsPanel, delayPhaseMs,
  isDetailHeaderHidden, setIsDetailHeaderHidden,
  isDetailPanelFloating, setIsDetailPanelFloating, setIsDetailOpen,
  isTimelineUndocked, setIsTimelineUndocked,
  timelineColors, floaterBg, draggerColor, colorPreset, zoneBgOpacity,
  delayBetweenEvents,  // item 458: ticker animation speed

  // ── Panels: events ────────────────────────────────────────────────────────
  panelWidth, isAllEventsWidgetHidden,
  setIsEventsPanelCollapsed, setPanelWidth,
  annotationMarginLeft, setAnnotationMarginLeft,  // item 479

  // ── Panels: detail ────────────────────────────────────────────────────────
  detailWidth,
  toggleDetailPanel, updateDetailHeight, setDetailWidth,

  // ── Panels: settings ─────────────────────────────────────────────────────
  settingsTabRequest, setSettingsActiveTab, setLayoutSettings,

  // ── Panels: timing ────────────────────────────────────────────────────────
  isTimingPanelOpen, timingFocusOp, setIsTimingPanelOpen, setTimingFocusOp,

  // ── Event title ───────────────────────────────────────────────────────────
  eventTitleSettings, setEventTitleSettings,
  showEventTitleAboveCurrentDetail, showEventTitleAboveClosedDetail,

  // ── Widgets ───────────────────────────────────────────────────────────────
  joinBannerRect, pendingBannerDragStart, revealStepRequest,
  expandEventsPanelFromWidget, dockEventsWidgetToTopBar, dockEventsWidgetToDetailPanel,
  pushJoinedWidgetToEventsPanel, pushJoinedWidgetToDetailPanel, hideJoinedWidget,
  splitWidgets, joinWidgets, setPendingBannerDragStart,
  setIsAllEventsInDetailPanel, isAllEventsInDetailPanel,

  // ── Overlays: balloons ────────────────────────────────────────────────────
  pinnedBitIndices, hoveredBitInfo, balloonLiveLayout, cachelineSize,
  setPinnedBitIndices, computeBitInfo, getVisibleBalloonStyles,

  // ── Overlays: group inspector ─────────────────────────────────────────────
  groupInspectorUnit, effectiveGroupBits, storageModel, wheelDefinition,
  layoutSettings, header, openGroupInspector, closeGroupInspector,
  isGroupInspectorEnabled, setIsGroupInspectorEnabled,  // item 428

  // ── Overlays: heat map / cache / prime ────────────────────────────────────
  isHeatMapEnabled, setIsHeatMapEnabled,
  cachelineAnnotation, cachePreset, setCachelineSize, setCachelineAnnotation, setCachePreset,
  isPrimeOverlayEnabled, setIsPrimeOverlayEnabled,

  // ── Overlays: range ───────────────────────────────────────────────────────
  isRangeOverlayEnabled, rangeOverlayStart, rangeOverlayEnd, rangeOverlayUnit,
  setIsRangeOverlayEnabled, setRangeOverlayStart, setRangeOverlayEnd, setRangeOverlayUnit,
  rangeAutoSet, setRangeAutoSet,

  // ── Overlays: multiples ───────────────────────────────────────────────────
  isMultiplesOverlayEnabled, multiplesOverlayPrime,
  setIsMultiplesOverlayEnabled, setMultiplesOverlayPrime,
  multiplesOverlayMode, setMultiplesOverlayMode,  // item 425
  bitsGridView, setBitsGridView,  // item 426

  // ── Repeat mode (item 424) ────────────────────────────────────────────────
  isRepeatMode, setIsRepeatMode, repeatStartPct, setRepeatStartPct,
  // item 433: split repeat handle
  isRepeatSplit, setIsRepeatSplit, repeatEndPct, setRepeatEndPct,
  // item 476/485: skip events with no changes
  isSkipNoChangeEvents,

  // ── Overlays: minimap ─────────────────────────────────────────────────────
  isMinimapVisible, setIsMinimapVisible,

  // ── Detail inspector ──────────────────────────────────────────────────────
  isDetailInspectorOpen, detailInspectorMode, detailInspectorQuery,
  detailInspectorRows, filteredDetailInspectorRows,
  openDetailInspector, setIsDetailInspectorOpen, setDetailInspectorQuery,

  // ── Data / context ────────────────────────────────────────────────────────
  stepStats, benchmarkTimingData, benchmarkTimingFileName,
  sourceRef, stepToLine, autoFitColumnCount,

  // ── Navigation ────────────────────────────────────────────────────────────
  onOpenRawLog, onImportBenchmarkTiming,

  // ── Debug tools ───────────────────────────────────────────────────────────
  isDebugToolsOpen, theme,
  isGlUnavailable, glDebugInfo, debugLayerMode,
  renderMode, renderModeRestartNonce, debugGlModeOverride, debugWorkerGlyphMode,
  debugGlOffsetX, debugGlOffsetY, debugGlAutoOffsetY,
  isDebugCalibrationMode, debugRenderTuning,
  setDebugLayerMode, setRenderMode, restartRenderMode,
  setDebugGlModeOverride, setDebugWorkerGlyphMode,
  setDebugGlOffsetX, setDebugGlOffsetY, setDebugGlAutoOffsetY,
  setIsDebugCalibrationMode, setDebugRenderTuning,
  applyDebugSnapshot, forceGlRedraw,

  // ── Toolbar: trace info ───────────────────────────────────────────────────
  effectiveTitle, isTraceInfoVisible, setIsTraceInfoVisible,
  traceInfoToggleRef, traceInfoPopoverRef,
  setStorageModel, traceInfoSections, fetchRawSource, lineToStep,
  onJumpToStep, rawScrollToLine, onClearRawScrollToLine, onClose,

  // ── Toolbar: search ───────────────────────────────────────────────────────
  isSearchOpen, setIsSearchOpen, searchQuery, setSearchQuery,
  searchResult, handleSearch, isSpotlightOpen, setIsSpotlightOpen,

  // ── Toolbar: view ─────────────────────────────────────────────────────────
  isElectron, doZoom, resetZoom, isTiltActive, isTiltButtonEnabled, toggleTilt,

  // ── Toolbar: export ───────────────────────────────────────────────────────
  setIsDebugToolsOpen, exportPng, exportVideo, cancelExport, exportProgress,
}) {
  // Hoist the single useCallback that was previously inline in toolbarProps.
  const openSpotlight = useCallback(() => {
    setIsSpotlightOpen(true);
    setIsSearchOpen(true);
  }, [setIsSearchOpen, setIsSpotlightOpen]);

  // ============================================================================
  // CONSOLIDATED PROPS FOR CHILD COMPONENTS
  // ============================================================================

  const visualizerMainContentProps = {
    // Canvas & rendering infrastructure
    canvas: {
      mode3D,
      refs: {
        container: containerRef,
        minimap: minimapCanvasRef,
        glCanvas: glCanvasRef,
        glyphCanvas: glyphCanvasRef,
        glyph2DCanvas: glyph2DCanvasRef,
        wrapperCanvas: wrapperCanvasRef,
        renderer: rendererRef,
        glRenderer: glRendererRef,
        camera3D: camera3DRef,
      },
      styles: {
        merged3D: mergedCamera3DContainerStyle,
        render: renderCanvasStyle,
      },
      camera3D: {
        transform: camera3DTransform,
      },
      zoom,
      isMacPlatform,
      isWindowsPlatform,
    },

    // UI frame & chrome
    uiFrame: {
      isUiChromeVisible,
      introPhase,
      loadingOverlayPhase,
      overlayBarPct,
      handleIntroTransitionEnd,
    },

    // Playback state & control
    playback: {
      steps,
      currentStep,
      selectedSteps,
      playing,
      handlers: {
        selection: handleStepSelection,
        multiSelection: handleMultiStepSelect,
        stop: stopPlayback,
        goToStep,
      },
    },

    // Animation & content rendering
    animation: {
      content: {
        allEventsTransport: allEventsTransportContent,
      },
      surroundingEvents,
      currentStepData,
      aggMaskStepIndex,
      aggMaskStepSetterRef,
      // DoubleTimeline raw props (backlog #120)
      doubleTimeline: {
        stepScrubProgress,
        seekStepAnimation,
        setStepScrubProgress,
        handleStepAnimToggle,
        isStepAnimRunning,
        isAnimationReplayPaused,
        onOpenAnimationSettings: openAnimationSettings,
        exporting,
        // item 159: left/right panel toggles in the timeline
        isEventsPanelCollapsed,
        onToggleEventsPanel: toggleEventsPanel,
        onCollapseEventsPanelFromTimeline: collapseEventsPanelFromTimeline,
        // item 348: reveal (open + scroll-to-center) current step in events panel
        onRevealCurrentStepInPanel: revealCurrentStepInPanel,
        isSettingsCollapsed,
        onToggleSettingsPanel: toggleSettingsPanel,
        // item 154: delay phase for fill+fade animation
        delayPhaseMs,
        // item 155: hide/reveal detail panel header
        isDetailHeaderHidden,
        onHideDetailHeader: () => setIsDetailHeaderHidden(true),
        onRevealDetailHeader: () => setIsDetailHeaderHidden(false),
        // item 157: float/dock detail panel
        isDetailPanelFloating,
        onFloatDetailPanel: () => setIsDetailPanelFloating(true),
        onDockDetailPanel: () => { setIsDetailPanelFloating(false); setIsDetailOpen(true); },
        // item 163: undock/dock the timeline itself
        isTimelineUndocked,
        onUndockTimeline: () => setIsTimelineUndocked(true),
        onDockTimeline: () => setIsTimelineUndocked(false),
        // item 321: timeline strip colors
        timelineColors,
        // item 322/323: floater zone bg and dragger color
        floaterBg,
        draggerColor,
        // item 342: per-preset zone tint background (derived from active color preset)
        timelineBg: colorPreset ? (COLOR_PRESETS[colorPreset]?.timelineBg ?? null) : null,
        // item 342: user-adjustable zone background opacity
        zoneBgOpacity,
        // item 458: ticker animation speed (duration scales with delay between events)
        delayBetweenEvents,
        // item 424: repeat mode — dragger on animation timeline
        isRepeatMode,
        onRepeatModeChange: setIsRepeatMode,
        repeatStartPct,
        onRepeatStartPctChange: setRepeatStartPct,
        // item 433: split repeat handle into start+end range
        isRepeatSplit,
        onRepeatSplitChange: setIsRepeatSplit,
        repeatEndPct,
        onRepeatEndPctChange: setRepeatEndPct,
        // item 485: skip empty events when navigating with < > buttons
        isSkipNoChangeEvents,
      },
    },

    // Panels & layout
    panels: {
      events: {
        isCollapsed: isEventsPanelCollapsed,
        width: panelWidth,
        isAllEventsWidgetHidden,
        annotationMarginLeft,      // item 479
        setAnnotationMarginLeft,   // item 479
        handlers: {
          toggle: toggleEventsPanel,
          setCollapsed: setIsEventsPanelCollapsed,
          setPanelWidth,

        },
      },
      detail: {
        width: detailWidth,
        // item 155: header hidden state
        isHeaderHidden: isDetailHeaderHidden,
        // item 157: floating panel state
        isFloating: isDetailPanelFloating,
        handlers: {
          toggle: toggleDetailPanel,
          setOpen: setIsDetailOpen,
          updateHeight: updateDetailHeight,
          setWidth: setDetailWidth,
          // item 157: dock the floating panel back to the bottom
          dock: () => { setIsDetailPanelFloating(false); setIsDetailOpen(true); },
        },
      },
      settings: {
        isCollapsed: isSettingsCollapsed,
        tabRequest: settingsTabRequest,
        handlers: {
          setActiveTab: setSettingsActiveTab,
          setLayoutSettings,
        },
      },
      timing: {
        isOpen: isTimingPanelOpen,
        focusOp: timingFocusOp,
        handlers: {
          setOpen: setIsTimingPanelOpen,
          setFocusOp: setTimingFocusOp,
        },
      },
    },

    // Event title & widget management
    eventTitle: {
      settings: eventTitleSettings,
      handlers: {
        setSettings: setEventTitleSettings,
        showAboveCurrentDetail: showEventTitleAboveCurrentDetail,
        showAboveClosedDetail: showEventTitleAboveClosedDetail,
      },
    },

    // Widget management (events + detail integration)
    widgets: {
      state: {
        joinBannerRect,
        pendingBannerDragStart,
        revealStepRequest,
      },
      handlers: {
        expandEventsPanel: expandEventsPanelFromWidget,
        dockEventsToTopBar: dockEventsWidgetToTopBar,
        dockEventsToDetail: dockEventsWidgetToDetailPanel,
        pushEventsToPanel: pushJoinedWidgetToEventsPanel,
        pushEventsToDetail: pushJoinedWidgetToDetailPanel,
        hideJoined: hideJoinedWidget,
        split: splitWidgets,
        join: joinWidgets,
        setPendingDragStart: setPendingBannerDragStart,
        // item 162: separate toggle for all-events floater in detail panel
        toggleAllEventsFloater: () => setIsAllEventsInDetailPanel((v) => !v),
        isAllEventsInDetailPanel,
      },
    },

    // Overlays (balloons, heat map, overlays)
    overlays: {
      balloons: {
        pinnedIndices: pinnedBitIndices,
        hoveredBitInfo,
        liveLayout: balloonLiveLayout,
        cachelineSize,
        handlers: {
          setPinnedIndices: setPinnedBitIndices,
          computeBitInfo,
          getVisibleStyles: getVisibleBalloonStyles,
        },
      },
      // item 331: group inspector state & config
      groupInspector: {
        unit: groupInspectorUnit,
        effectiveGroupBits,
        storageModel,
        wheelDefinition,
        bitLayout: layoutSettings.bitLayout || '4x2',
        byteLayout: layoutSettings.byteLayout || '4x2',
        bitCount: header?.bitCount,
        isEnabled: isGroupInspectorEnabled,          // item 428
        handlers: {
          open: openGroupInspector,
          close: closeGroupInspector,
          setEnabled: setIsGroupInspectorEnabled,    // item 428
        },
      },
      heatMap: {
        isEnabled: isHeatMapEnabled,
        handlers: {
          setEnabled: setIsHeatMapEnabled,
        },
      },
      cache: {
        cachelineSize,
        cachelineAnnotation,
        cachePreset,
        handlers: {
          setCachelineSize,
          setCachelineAnnotation,
          setCachePreset,
        },
      },
      prime: {
        isEnabled: isPrimeOverlayEnabled,
        handlers: {
          setEnabled: setIsPrimeOverlayEnabled,
        },
      },
      range: {
        isEnabled: isRangeOverlayEnabled,
        start: rangeOverlayStart,
        end: rangeOverlayEnd,
        unit: rangeOverlayUnit,
        autoSet: rangeAutoSet,
        handlers: {
          setEnabled: setIsRangeOverlayEnabled,
          setStart: (v) => { setRangeAutoSet(false); setRangeOverlayStart(v); },
          setEnd:   (v) => { setRangeAutoSet(false); setRangeOverlayEnd(v); },
          setUnit: setRangeOverlayUnit,
          onToggle: (enabled) => {
            if (enabled && !isRangeOverlayEnabled) {
              const step = steps[currentStep];
              if (step) {
                const start = step.focusStart != null ? step.focusStart : (step.changedBits.length > 0 ? Math.min(...step.changedBits) : 0);
                const end = step.focusStop != null ? step.focusStop : (step.changedBits.length > 0 ? Math.max(...step.changedBits) : Math.max(0, header.bitCount - 1));
                setRangeOverlayStart(start);
                setRangeOverlayEnd(end);
              }
              // item 416: switching on always starts in auto mode
              setRangeAutoSet(true);
            }
            setIsRangeOverlayEnabled(enabled);
          },
          onReset: () => {
            const step = steps[currentStep];
            if (step) {
              const start = step.focusStart != null ? step.focusStart : (step.changedBits.length > 0 ? Math.min(...step.changedBits) : 0);
              const end = step.focusStop != null ? step.focusStop : (step.changedBits.length > 0 ? Math.max(...step.changedBits) : Math.max(0, header.bitCount - 1));
              setRangeOverlayStart(start);
              setRangeOverlayEnd(end);
            }
          },
          // item 416: toggle between auto-set (follows current step) and user-input
          onAutoSetChange: (auto) => {
            setRangeAutoSet(auto);
            if (auto) {
              const step = steps[currentStep];
              if (step) {
                const start = step.focusStart != null ? step.focusStart : (step.changedBits.length > 0 ? Math.min(...step.changedBits) : 0);
                const end = step.focusStop != null ? step.focusStop : (step.changedBits.length > 0 ? Math.max(...step.changedBits) : Math.max(0, header.bitCount - 1));
                setRangeOverlayStart(start);
                setRangeOverlayEnd(end);
              }
            }
          },
        },
      },
      multiples: {
        isEnabled: isMultiplesOverlayEnabled,
        prime: multiplesOverlayPrime,
        mode: multiplesOverlayMode,   // item 425
        handlers: {
          setEnabled: setIsMultiplesOverlayEnabled,
          setPrime: setMultiplesOverlayPrime,
          setMode: setMultiplesOverlayMode,  // item 425
          onToggle: (enabled) => {
            if (enabled && !isMultiplesOverlayEnabled) {
              const step = steps[currentStep];
              if (step && step.prime != null && step.prime >= 2) {
                setMultiplesOverlayPrime(step.prime);
              }
            }
            setIsMultiplesOverlayEnabled(enabled);
          },
          onReset: () => {
            const step = steps[currentStep];
            if (step && step.prime != null && step.prime >= 2) {
              setMultiplesOverlayPrime(step.prime);
            }
          },
        },
      },
      minimap: {
        isVisible: isMinimapVisible,
        handlers: {
          setVisible: setIsMinimapVisible,
        },
      },
      // item 426: bits grid view — which bit-set to highlight in the grid
      bitsGridView: {
        mode: bitsGridView,
        handlers: {
          setMode: setBitsGridView,
        },
      },
    },

    // Detail Inspector
    detailInspector: {
      isOpen: isDetailInspectorOpen,
      mode: detailInspectorMode,
      query: detailInspectorQuery,
      rows: detailInspectorRows,
      filteredRows: filteredDetailInspectorRows,
      handlers: {
        open: openDetailInspector,
        setOpen: setIsDetailInspectorOpen,
        setQuery: setDetailInspectorQuery,
      },
    },

    // Data & context
    data: {
      steps,
      currentStep,
      currentStepData,
      stepStats,
      storageModel,
      wheelDefinition,
      layoutSettings,
      benchmarkTimingData,
      benchmarkTimingFileName,
      sourceRef,
      currentStepSourceLine: stepToLine[currentStep],
    },

    // Navigation & references
    navigation: {
      revealStepRequest,
      revealCurrentStepInPanel,
      onOpenRawLog,
      onImportBenchmarkTiming,
      autoFitColumnCount,
    },

    // Debug tools
    debug: {
      isToolsOpen: isDebugToolsOpen,
      theme,
      isGlUnavailable,
      glDebugInfo,
      debugLayerMode,
      renderMode,
      renderModeRestartNonce,
      debugGlModeOverride,
      debugWorkerGlyphMode,
      debugGlOffsetX,
      debugGlOffsetY,
      debugGlAutoOffsetY,
      isDebugCalibrationMode,
      debugRenderTuning,
      handlers: {
        setDebugLayerMode,
        setRenderMode,
        restartRenderMode,
        setDebugGlModeOverride,
        setDebugWorkerGlyphMode,
        setDebugGlOffsetX,
        setDebugGlOffsetY,
        setDebugGlAutoOffsetY,
        setIsDebugCalibrationMode,
        setDebugRenderTuning,
        applySnapshot: applyDebugSnapshot,
        forceGlRedraw,
      },
    },
  };

  const toolbarProps = {
    platform: {
      isMacPlatform,
      isWindowsPlatform,
      isElectron,
    },
    traceInfo: {
      effectiveTitle,
      isTraceInfoVisible,
      setIsTraceInfoVisible,
      traceInfoToggleRef,
      traceInfoPopoverRef,
      storageModel,
      setStorageModel,
      header,
      traceInfoSections,
      onFetchRawSource: fetchRawSource,
      lineToStep,
      onJumpToStep,
      rawScrollToLine,
      onClearRawScrollToLine,
      currentStepSourceLine: stepToLine[currentStep],
      onClose,
      onOpenRawLog,  // item 221: quick open log button in top bar
    },
    search: {
      isSearchOpen,
      setIsSearchOpen,
      searchQuery,
      setSearchQuery,
      searchResult,
      handleSearch,
      isSpotlightOpen,
      openSpotlight,
    },
    view: {
      zoom,
      doZoom,
      resetZoom,
      isTiltActive,
      isTiltButtonEnabled,
      toggleTilt,
    },
    debug: {
      isDebugToolsOpen,
      setIsDebugToolsOpen,
    },
    exportState: {
      exporting,
      exportPng,
      exportVideo,
      cancelExport,
      exportProgress,
    },
  };

  return { visualizerMainContentProps, toolbarProps };
}
