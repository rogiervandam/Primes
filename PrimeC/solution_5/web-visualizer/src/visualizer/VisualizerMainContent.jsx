import React from 'react';
import EventsPanel from '../EventsPanel';
import SettingsPanel from '../SettingsPanel';
import CanvasStage from './CanvasStage';
import CanvasLoadingOverlay from './CanvasLoadingOverlay';
import JoinedEventsWidget from './JoinedEventsWidget';
import DebugToolsPanel from './DebugToolsPanel';
import EventTitleBanner from './EventTitleBanner';
import DetailPanel from '../DetailPanel';

/**
 * VisualizerMainContent — Phase 2 Refactoring
 *
 * Accepts organized prop objects instead of 120+ scattered props.
 * This reduces prop-drilling chaos and makes component dependencies explicit.
 *
 * Prop structure (all organized by domain):
 * - canvas: Canvas refs, styles, camera
 * - uiFrame: UI chrome visibility, intro phases
 * - playback: Steps, current step, playback handlers
 * - animation: Animation content, step data
 * - panels: All panel state (events, detail, settings, timing)
 * - eventTitle: Title settings & handlers
 * - widgets: Event/detail widget integration
 * - overlays: All overlay features (balloons, heat map, prime, range, multiples, cache, minimap)
 * - detailInspector: Detail inspector state & handlers
 * - data: Raw data (steps, stats, settings, benchmark data)
 * - navigation: Navigation references & handlers
 * - debug: Debug tools state & handlers
 */
export default function VisualizerMainContent(props) {
  // Destructure organized prop objects
  const {
    canvas = {},
    uiFrame = {},
    playback = {},
    animation = {},
    panels = {},
    eventTitle = {},
    widgets = {},
    overlays = {},
    detailInspector = {},
    data = {},
    navigation = {},
    debug = {},
  } = props;

  // Extract individual values from organized objects for component use
  // Canvas
  const { refs: canvasRefs = {}, styles: canvasStyles = {}, camera3D: camera3DInfo = {}, zoom, isMacPlatform, isWindowsPlatform } = canvas;
  const { container: containerRef, glCanvas: glCanvasRef, glyphCanvas: glyphCanvasRef, glyph2DCanvas: glyph2DCanvasRef, wrapperCanvas: wrapperCanvasRef, renderer: rendererRef, glRenderer: glRendererRef, camera3D: camera3DRef } = canvasRefs;
  const { merged3D: mergedCamera3DContainerStyle, render: renderCanvasStyle, eventTitle: eventTitleStyle } = canvasStyles;
  const { transform: camera3DTransform } = camera3DInfo;

  // UI Frame
  const { isUiChromeVisible, introPhase, loadingOverlayPhase, overlayBarPct, handleIntroTransitionEnd } = uiFrame;

  // Playback
  const { steps, currentStep, selectedSteps, playing, handlers: playbackHandlers = {} } = playback;
  const { selection: handleStepSelection, multiSelection: handleMultiStepSelect, stop: stopPlayback, goToStep } = playbackHandlers;

  // Animation
  const { content: animContent = {}, currentStepBanner, surroundingEvents, currentStepData } = animation;
  const { stepAnimSliders: stepAnimSlidersContent, stepAnimSlidersDocked: stepAnimSlidersDockedContent, allEventsTransport: allEventsTransportContent } = animContent;

  // Panels
  const { events: panelsEvents = {}, detail: panelsDetail = {}, settings: panelsSettings = {}, timing: panelsTiming = {} } = panels;
  const { isCollapsed: isEventsPanelCollapsed, width: panelWidth, isAllEventsWidgetHidden, handlers: eventsHandlers = {} } = panelsEvents;
  const { toggle: toggleEventsPanel, setCollapsed: setIsEventsPanelCollapsed, setPanelWidth } = eventsHandlers;
  const { isOpen: isDetailOpen, isOpenRef: isDetailOpenRef, height: detailHeight, width: detailWidth, handlers: detailHandlers = {} } = panelsDetail;
  const { toggle: toggleDetailPanel, setOpen: setIsDetailOpen, updateHeight: updateDetailHeight, setWidth: setDetailWidth } = detailHandlers;
  const { tabRequest: settingsTabRequest, isCollapsed: isSettingsCollapsed, handlers: settingsHandlers = {} } = panelsSettings;
  const { setActiveTab: setSettingsActiveTab, setLayoutSettings } = settingsHandlers;
  const { isOpen: isTimingPanelOpen, focusOp: timingFocusOp, handlers: timingHandlers = {} } = panelsTiming;
  const { setOpen: setIsTimingPanelOpen, setFocusOp: setTimingFocusOp = () => {} } = timingHandlers;

  // Event Title
  const { settings: eventTitleSettings, style: eventTitleSettingsStyle, handlers: eventTitleHandlers = {} } = eventTitle;
  const { setSettings: setEventTitleSettings, showAboveCurrentDetail: showEventTitleAboveCurrentDetail, showAboveClosedDetail: onShowEventTitle } = eventTitleHandlers;

  // Widgets
  const { state: widgetsState = {}, handlers: widgetHandlers = {} } = widgets;
  const { areJoined: areWidgetsJoined, isSingleEventRevealed: isSingleEventWidgetRevealed, joinBannerRect, pendingBannerDragStart, revealStepRequest } = widgetsState;
  const { expandEventsPanel: expandEventsPanelFromWidget, dockEventsToTopBar: dockEventsWidgetToTopBar, dockEventsToDetail: dockEventsWidgetToDetailPanel, pushEventsToPanel: pushJoinedWidgetToEventsPanel, pushEventsToDetail: pushJoinedWidgetToDetailPanel, hideJoined: hideJoinedWidget, split: splitWidgets, join: joinWidgets, setPendingDragStart: setPendingBannerDragStart } = widgetHandlers;

  // Overlays
  const { balloons: overlayBalloons = {}, heatMap: overlayHeatMap = {}, cache: overlayCache = {}, prime: overlayPrime = {}, range: overlayRange = {}, multiples: overlayMultiples = {}, minimap: overlayMinimap = {} } = overlays;
  const { pinnedIndices: pinnedBitIndices, hoveredBitInfo, liveLayout: balloonLiveLayout, cachelineSize, handlers: balloonHandlers = {} } = overlayBalloons;
  const { setPinnedIndices: setPinnedBitIndices, computeBitInfo, getVisibleStyles: getVisibleBalloonStyles } = balloonHandlers;
  const { isEnabled: isHeatMapEnabled, handlers: heatMapHandlers = {} } = overlayHeatMap;
  const { setEnabled: setIsHeatMapEnabled } = heatMapHandlers;
  const { cachelineAnnotation, cachePreset, handlers: cacheHandlers = {} } = overlayCache;
  const { setCachelineSize, setCachelineAnnotation, setCachePreset } = cacheHandlers;
  const { isEnabled: isPrimeOverlayEnabled, handlers: primeHandlers = {} } = overlayPrime;
  const { setEnabled: setIsPrimeOverlayEnabled } = primeHandlers;
  const { isEnabled: isRangeOverlayEnabled, start: rangeOverlayStart, end: rangeOverlayEnd, handlers: rangeHandlers = {} } = overlayRange;
  const { setEnabled: setIsRangeOverlayEnabled, setStart: setRangeOverlayStart, setEnd: setRangeOverlayEnd, onToggle: onRangeOverlayToggle, onReset: onRangeOverlayReset } = rangeHandlers;
  const { isEnabled: isMultiplesOverlayEnabled, prime: multiplesOverlayPrime, handlers: multiplesHandlers = {} } = overlayMultiples;
  const { setEnabled: setIsMultiplesOverlayEnabled, setPrime: setMultiplesOverlayPrime, onToggle: onMultiplesOverlayToggle, onReset: onMultiplesOverlayReset } = multiplesHandlers;
  const { isVisible: isMinimapVisible, handlers: minimapHandlers = {} } = overlayMinimap;
  const { setVisible: setIsMinimapVisible } = minimapHandlers;

  // Detail Inspector
  const { isOpen: isDetailInspectorOpen, mode: detailInspectorMode, query: detailInspectorQuery, rows: detailInspectorRows, filteredRows: filteredDetailInspectorRows, handlers: detailInspectorHandlers = {} } = detailInspector;
  const { open: openDetailInspector, setOpen: setIsDetailInspectorOpen, setQuery: setDetailInspectorQuery } = detailInspectorHandlers;

  // Data
  const { steps: dataSteps, currentStep: dataCurrentStep, currentStepData: dataCurrentStepData, stepStats, storageModel, wheelDefinition, layoutSettings, benchmarkTimingData, benchmarkTimingFileName, sourceRef, currentStepSourceLine } = data;

  // Navigation
  const { revealStepRequest: navRevealStepRequest, revealCurrentStepInPanel, onOpenRawLog, onImportBenchmarkTiming, autoFitColumnCount } = navigation;

  // Debug
  const { isToolsOpen: isDebugToolsOpen, theme = 'dark', isGlUnavailable, glDebugInfo, debugLayerMode, renderMode = 'mode3-direct', renderModeRestartNonce = 0, debugGlModeOverride = 'auto', debugWorkerGlyphMode = 'gl', debugGlOffsetX, debugGlOffsetY, debugGlAutoOffsetY, isDebugCalibrationMode, debugRenderTuning, handlers: debugHandlers = {} } = debug;
  const { setDebugLayerMode, setRenderMode, restartRenderMode, setDebugGlModeOverride, setDebugWorkerGlyphMode, setDebugGlOffsetX, setDebugGlOffsetY, setIsDebugCalibrationMode, setDebugRenderTuning, applySnapshot: applyDebugSnapshot, forceGlRedraw } = debugHandlers;

  return (
    <div
      className={`main-content${isUiChromeVisible ? ' ui-chrome-visible' : ' ui-chrome-hidden'}`}
      style={{ '--events-panel-width': `${isEventsPanelCollapsed ? 0 : panelWidth}px` }}
    >
      <CanvasLoadingOverlay
        loadingOverlayPhase={loadingOverlayPhase}
        steps={steps}
        overlayBarPct={overlayBarPct}
      />
      <EventsPanel
        eventsState={{
          steps,
          currentStep,
          selectedSteps,
          width: panelWidth,
          externalOpFilter: timingFocusOp,
          revealStepRequest,
          eventTitleVisible: eventTitleSettings.visible && !areWidgetsJoined,
        }}
        eventsHandlers={{
          onStepClick: handleStepSelection,
          onMultiStepSelect: handleMultiStepSelect,
          onWidthChange: setPanelWidth,
          onExpandPanelFromWidget: expandEventsPanelFromWidget,
          onDockWidgetToTopBar: dockEventsWidgetToTopBar,
          onDockWidgetToDetailPanel: dockEventsWidgetToDetailPanel,
          onJoinWidgets: joinWidgets,
          onUserScroll: stopPlayback,
          onExternalOpFilterConsumed: () => setTimingFocusOp(''),
          onShowEventTitle: showEventTitleAboveCurrentDetail,
        }}
      />
      <div className="canvas-and-detail-column">
      <CanvasStage
        canvasRefs={{
          containerRef,
          glCanvasRef,
          glyphCanvasRef,
          glyph2DCanvasRef,
          wrapperCanvasRef,
        }}
        canvasConfig={{
          glCanvasKey: `gl-${debugGlModeOverride}-${renderModeRestartNonce}`,
          glActive: true,
          hideGlCanvas: false,
        }}
        canvasStyles={{
          camera3DContainerStyle: mergedCamera3DContainerStyle,
          renderCanvasStyle,
        }}
        overlay={{
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
          areWidgetsJoined,
          onJoinWidgets: joinWidgets,
          pinnedBitIndices,
          hoveredBitInfo,
          computeBitInfo,
          getVisibleBalloonStyles,
          balloonLiveLayout,
          cachelineSize,
          setPinnedBitIndices,
          handleStepSelection,
          isDetailOpen,
          detailHeight,
          toggleDetailPanel,
          pendingBannerDragStart,
          onConsumePendingBannerDragStart: () => setPendingBannerDragStart(null),
          isDetailInspectorOpen,
          detailInspectorMode,
          detailInspectorQuery,
          setDetailInspectorQuery,
          setIsDetailInspectorOpen,
          detailInspectorRows,
          filteredDetailInspectorRows,
          isTimingPanelOpen,
          setIsTimingPanelOpen,
          steps,
          benchmarkTimingData,
          benchmarkTimingFileName,
          setTimingFocusOp,
          onImportBenchmarkTiming,
        }}
        intro={{
          introPhase,
          onIntroTransitionEnd: handleIntroTransitionEnd,
          isSingleEventWidgetRevealed,
        }}
      />
      {/* EventTitleBanner lives in main-content (not inside canvas-area) so it
          is not clipped by canvas-area's overflow:hidden and is positioned
          relative to the full main-content viewport (item 58). */}
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
          onConsumeExternalDragStart={() => setPendingBannerDragStart(null)}
          sliders={stepAnimSlidersContent}
          onJoinWidgets={joinWidgets}
        />
      )}
      {/* DetailPanel lives in main-content (not inside canvas-area) so it is
          positioned relative to the full main-content area (item 58). */}
      <DetailPanel
        detailState={{
          step: currentStepData,
          stepIndex: currentStep,
          open: isDetailOpen,
          height: detailHeight,
          width: detailWidth,
          playing,
          stepStats: selectedSteps.size > 1 ? null : stepStats,
          bitLayout: layoutSettings.bitLayout,
          byteLayout: layoutSettings.byteLayout,
          eventTitleVisible: eventTitleSettings.visible && !areWidgetsJoined,
          sourceLineNumber: currentStepSourceLine,
          hasRawSource: !!sourceRef,
        }}
        detailConfig={{
          storageModel,
          wheelDefinition,
          benchmarkTimingData,
          eventAnimSliders: stepAnimSlidersDockedContent || stepAnimSlidersContent,
          allEventsTransport: isEventsPanelCollapsed ? allEventsTransportContent : null,
        }}
        detailHandlers={{
          onToggle: toggleDetailPanel,
          onHeightChange: updateDetailHeight,
          onWidthChange: setDetailWidth,
          onInspectChangedBits: () => openDetailInspector('bits'),
          onInspectMarkedNumbers: () => openDetailInspector('numbers'),
          onShowEventTitle,
          onOpenRawLog,
        }}
      />
      </div>
      {areWidgetsJoined && isEventsPanelCollapsed && !isAllEventsWidgetHidden && eventTitleSettings.visible && isSingleEventWidgetRevealed && (
        <JoinedEventsWidget
          bannerState={{
            settings: eventTitleSettings,
            setSettings: setEventTitleSettings,
            banner: currentStepBanner,
            surrounding: surroundingEvents,
            currentStepData,
            revealCurrentStepInPanel,
            sliders: stepAnimSlidersContent,
            initialBannerRect: joinBannerRect,
          }}
          widgetHandlers={{
            onSplitWidgets: splitWidgets,
            onPushToEventsPanel: pushJoinedWidgetToEventsPanel,
            onPushToDetailPanel: pushJoinedWidgetToDetailPanel,
            onHideWidget: hideJoinedWidget,
            onNavigate: () => { if (!isDetailOpenRef.current) setIsDetailOpen(true); },
          }}
        />
      )}
      <SettingsPanel
        settingsState={{
          settings: layoutSettings,
          autoFitColumns: autoFitColumnCount,
          cachelineSize,
          cachePreset,
          isHeatMapEnabled,
          cachelineAnnotation,
          isPrimeOverlayEnabled,
          isRangeOverlayEnabled,
          rangeOverlayStart,
          rangeOverlayEnd,
          isMultiplesOverlayEnabled,
          multiplesOverlayPrime,
          isMinimapVisible,
          eventTitleSettings,
          outlineSettings: layoutSettings.outlines,
          activeTabRequest: settingsTabRequest,
        }}
        settingsHandlers={{
          onChange: setLayoutSettings,
          onActiveTabChange: setSettingsActiveTab,
          onCachelineSizeChange: setCachelineSize,
          onCachePresetChange: setCachePreset,
          onHeatMapToggle: setIsHeatMapEnabled,
          onCachelineAnnotationChange: setCachelineAnnotation,
          onPrimeOverlayToggle: setIsPrimeOverlayEnabled,
          onRangeOverlayToggle,
          onRangeOverlayStartChange: setRangeOverlayStart,
          onRangeOverlayEndChange: setRangeOverlayEnd,
          onMultiplesOverlayToggle: onMultiplesOverlayToggle,
          onMultiplesOverlayPrimeChange: setMultiplesOverlayPrime,
          onRangeOverlayReset,
          onMultiplesOverlayReset,
          onShowMinimapChange: setIsMinimapVisible,
          onEventTitleSettingsChange: setEventTitleSettings,
          onOutlineChange: (outlines) => setLayoutSettings((prev) => ({ ...prev, outlines })),
        }}
        settingsConfig={{
          minimapControlVisible: true,
          isWindowsPlatform,
          showAnimationControls: true,
        }}
      />
      {isDebugToolsOpen && (
        <DebugToolsPanel
          debugRefs={{
            rendererRef,
            glCanvasRef,
            glyphCanvasRef,
            glRendererRef,
            camera3DRef,
          }}
          debugState={{
            camera3DTransform,
            zoomLevel: zoom,
            glDebugInfo,
            theme,
            debugLayerMode,
            renderMode,
            debugGlModeOverride,
            debugWorkerGlyphMode,
            debugGlOffsetX,
            debugGlOffsetY,
            debugGlAutoOffsetY,
            isDebugCalibrationMode,
            debugRenderTuning,
          }}
          debugHandlers={{
            setDebugLayerMode,
            setRenderMode,
            restartRenderMode,
            setDebugGlModeOverride,
            setDebugWorkerGlyphMode,
            setDebugGlOffsetX,
            setDebugGlOffsetY,
            setIsDebugCalibrationMode,
            setDebugRenderTuning,
            onApplyDebugSnapshot: applyDebugSnapshot,
            onForceGlRedraw: forceGlRedraw,
          }}
          debugConfig={{
            rightOffset: isSettingsCollapsed ? 8 : (isMacPlatform ? 388 : 328),
          }}
        />
      )}
    </div>
  );
}
