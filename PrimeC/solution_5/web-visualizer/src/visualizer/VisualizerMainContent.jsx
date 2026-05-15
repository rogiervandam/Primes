import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import EventsPanel from './EventsPanel';
import { bumpRender } from '../lib/debugCounters';
import SettingsPanel from './SettingsPanel';
import CanvasStage from './CanvasStage';
import CanvasLoadingOverlay from './CanvasLoadingOverlay';
import DebugToolsPanel from './DebugToolsPanel';
import DetailPanel from './DetailPanel';
import DoubleTimeline from './DoubleTimeline';
import { usePanelLayoutContext } from '../contexts/PanelLayoutContext';

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
  // Perf counter — incremented on every render so DebugToolsPanel can show re-render rate.
  useEffect(() => { bumpRender('VMC'); });

  // item 349: read eventsOpenFromBottom to suppress left-column space when panel is a bottom overlay
  const { eventsOpenFromBottom, isDetailOpen, detailHeight } = usePanelLayoutContext();

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
    const { minimap: minimapCanvasRef } = canvasRefs;
  const { merged3D: mergedCamera3DContainerStyle, render: renderCanvasStyle, eventTitle: eventTitleStyle } = canvasStyles;
  const { transform: camera3DTransform } = camera3DInfo;

  // UI Frame
  const { isUiChromeVisible, introPhase, loadingOverlayPhase, overlayBarPct, handleIntroTransitionEnd } = uiFrame;

  // Playback
  const { steps, currentStep, selectedSteps, playing, handlers: playbackHandlers = {} } = playback;
  const { selection: handleStepSelection, multiSelection: handleMultiStepSelect, stop: stopPlayback, goToStep } = playbackHandlers;

  // Animation
  const { content: animContent = {}, surroundingEvents, currentStepData, aggMaskStepIndex = 0, aggMaskStepSetterRef, doubleTimeline: doubleTimelineProps = {} } = animation;
  const { allEventsTransport: allEventsTransportContent } = animContent;

  // Panels
  const { events: panelsEvents = {}, detail: panelsDetail = {}, settings: panelsSettings = {}, timing: panelsTiming = {} } = panels;
  const { isCollapsed: isEventsPanelCollapsed, width: panelWidth, isAllEventsWidgetHidden, handlers: eventsHandlers = {} } = panelsEvents;
  const { toggle: toggleEventsPanel, setCollapsed: setIsEventsPanelCollapsed, setPanelWidth } = eventsHandlers;
  const { width: detailWidth, isHeaderHidden: isDetailHeaderHidden, isFloating: isDetailPanelFloating, handlers: detailHandlers = {} } = panelsDetail;
  const { toggle: toggleDetailPanel, setOpen: setIsDetailOpen, updateHeight: updateDetailHeight, setWidth: setDetailWidth, dock: dockDetailPanel } = detailHandlers;
  const { tabRequest: settingsTabRequest, isCollapsed: isSettingsCollapsed, handlers: settingsHandlers = {} } = panelsSettings;
  const { setActiveTab: setSettingsActiveTab, setLayoutSettings } = settingsHandlers;
  const { isOpen: isTimingPanelOpen, focusOp: timingFocusOp, handlers: timingHandlers = {} } = panelsTiming;
  const { setOpen: setIsTimingPanelOpen, setFocusOp: setTimingFocusOp = () => {} } = timingHandlers;

  // item 190: measure full detail panel height (header + body) so DoubleTimeline can
  // position itself above it in both open and collapsed states.
  // item 282: CSS variable is updated directly via DOM (no React state update) to avoid
  // re-rendering the canvas when the detail panel height changes.
  const [totalDetailHeight, setTotalDetailHeight] = useState(0);
  const mainContentRef = useRef(null);
  const detailRoRef = useRef(null);
  const detailPanelCallbackRef = useCallback((el) => {
    detailRoRef.current?.disconnect();
    detailRoRef.current = null;
    if (el) {
      const h = el.offsetHeight;
      setTotalDetailHeight(h);
      mainContentRef.current?.style.setProperty('--detail-panel-total-height', `${h}px`);
      detailRoRef.current = new ResizeObserver(() => {
        const nh = el.offsetHeight;
        setTotalDetailHeight(nh);
        mainContentRef.current?.style.setProperty('--detail-panel-total-height', `${nh}px`);
      });
      detailRoRef.current.observe(el);
    } else {
      mainContentRef.current?.style.setProperty('--detail-panel-total-height', '0px');
    }
  }, []);

  // Event Title
  const { settings: eventTitleSettings, style: eventTitleSettingsStyle, handlers: eventTitleHandlers = {} } = eventTitle;
  const { setSettings: setEventTitleSettings, showAboveCurrentDetail: showEventTitleAboveCurrentDetail, showAboveClosedDetail: onShowEventTitle } = eventTitleHandlers;

  // Widgets
  const { state: widgetsState = {}, handlers: widgetHandlers = {} } = widgets;
  const { joinBannerRect, pendingBannerDragStart, revealStepRequest } = widgetsState;
  const { expandEventsPanel: expandEventsPanelFromWidget, dockEventsToTopBar: dockEventsWidgetToTopBar, dockEventsToDetail: dockEventsWidgetToDetailPanel, pushEventsToPanel: pushJoinedWidgetToEventsPanel, pushEventsToDetail: pushJoinedWidgetToDetailPanel, hideJoined: hideJoinedWidget, split: splitWidgets, join: joinWidgets, setPendingDragStart: setPendingBannerDragStart, toggleAllEventsFloater, isAllEventsInDetailPanel } = widgetHandlers;

  // Overlays
  const { balloons: overlayBalloons = {}, heatMap: overlayHeatMap = {}, cache: overlayCache = {}, prime: overlayPrime = {}, range: overlayRange = {}, multiples: overlayMultiples = {}, minimap: overlayMinimap = {}, groupInspector: overlayGroupInspector = {}, bitsGridView: overlayBitsGridView = {} } = overlays;
  const { pinnedIndices: pinnedBitIndices, hoveredBitInfo, liveLayout: balloonLiveLayout, cachelineSize, handlers: balloonHandlers = {} } = overlayBalloons;
  const { setPinnedIndices: setPinnedBitIndices, computeBitInfo, getVisibleStyles: getVisibleBalloonStyles } = balloonHandlers;
  const { isEnabled: isHeatMapEnabled, handlers: heatMapHandlers = {} } = overlayHeatMap;
  const { setEnabled: setIsHeatMapEnabled } = heatMapHandlers;
  const { cachelineAnnotation, cachePreset, handlers: cacheHandlers = {} } = overlayCache;
  const { setCachelineSize, setCachelineAnnotation, setCachePreset } = cacheHandlers;
  const { isEnabled: isPrimeOverlayEnabled, handlers: primeHandlers = {} } = overlayPrime;
  const { setEnabled: setIsPrimeOverlayEnabled } = primeHandlers;
  const { isEnabled: isRangeOverlayEnabled, start: rangeOverlayStart, end: rangeOverlayEnd, unit: rangeOverlayUnit, autoSet: rangeAutoSet, handlers: rangeHandlers = {} } = overlayRange;
  const { setEnabled: setIsRangeOverlayEnabled, setStart: setRangeOverlayStart, setEnd: setRangeOverlayEnd, setUnit: setRangeOverlayUnit, onToggle: onRangeOverlayToggle, onReset: onRangeOverlayReset, onAutoSetChange: onRangeAutoSetChange } = rangeHandlers;
  const { isEnabled: isMultiplesOverlayEnabled, prime: multiplesOverlayPrime, mode: multiplesOverlayMode = 'number', handlers: multiplesHandlers = {} } = overlayMultiples;
  const { setEnabled: setIsMultiplesOverlayEnabled, setPrime: setMultiplesOverlayPrime, setMode: setMultiplesOverlayMode, onToggle: onMultiplesOverlayToggle, onReset: onMultiplesOverlayReset } = multiplesHandlers;
  const { isVisible: isMinimapVisible, handlers: minimapHandlers = {} } = overlayMinimap;
  const { setVisible: setIsMinimapVisible } = minimapHandlers;
  // item 426: bits grid view overlay
  const { mode: bitsGridViewMode = {}, handlers: bitsGridViewHandlers = {} } = overlayBitsGridView;
  const { setMode: onBitsGridViewChange } = bitsGridViewHandlers;
  // item 331: group inspector
  const { unit: groupInspectorUnit, effectiveGroupBits: groupInspectorEffectiveGroupBits, storageModel: groupInspectorStorageModel, wheelDefinition: groupInspectorWheelDefinition, bitLayout: groupInspectorBitLayout, byteLayout: groupInspectorByteLayout, bitCount: groupInspectorBitCount, isEnabled: isGroupInspectorEnabled, handlers: groupInspectorHandlers = {} } = overlayGroupInspector;
  const { open: openGroupInspector, close: closeGroupInspector, setEnabled: setIsGroupInspectorEnabled } = groupInspectorHandlers;

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

  // item 236/#2 perf: memoize the two EventsPanel prop objects so that React.memo
  // on EventsPanel can skip re-renders when currentStep changes during playback.
  // currentStep is intentionally excluded — EventsPanel receives it via
  // ActiveStepContext subscription (zero React re-renders per step).

  // item 431: track which step linked to repeat mode; use refs so the callback is stable
  const repeatLinkedStepRef = useRef(null);
  const isRepeatModeRef2 = useRef(false);
  const onRepeatModeChangeRef2 = useRef(null);
  const playingRef2 = useRef(false);
  isRepeatModeRef2.current = doubleTimelineProps.isRepeatMode;
  onRepeatModeChangeRef2.current = doubleTimelineProps.onRepeatModeChange;
  playingRef2.current = playing;
  const handleRepeatFromEvent = useCallback((stepIdx) => {
    if (!playingRef2.current && isRepeatModeRef2.current && repeatLinkedStepRef.current === stepIdx) {
      // Same event clicked again while NOT playing → deactivate repeat
      onRepeatModeChangeRef2.current?.(false);
      repeatLinkedStepRef.current = null;
    } else {
      // New or different event, or currently playing → activate/update repeat
      // (while playing, never toggle repeat off — clicking navigates but keeps looping)
      onRepeatModeChangeRef2.current?.(true);
      repeatLinkedStepRef.current = stepIdx;
    }
  }, []);

  const stableEventsState = useMemo(() => ({
    steps,
    selectedSteps,
    width: panelWidth,
    externalOpFilter: timingFocusOp,
    revealStepRequest,
    eventTitleVisible: eventTitleSettings.visible,
  }), [steps, selectedSteps, panelWidth, timingFocusOp, revealStepRequest,
       eventTitleSettings.visible]);

  const stableEventsHandlers = useMemo(() => ({
    onStepClick: handleStepSelection,
    onMultiStepSelect: handleMultiStepSelect,
    onWidthChange: setPanelWidth,
    onExpandPanelFromWidget: expandEventsPanelFromWidget,
    onDockWidgetToTopBar: dockEventsWidgetToTopBar,
    onDockWidgetToDetailPanel: dockEventsWidgetToDetailPanel,
    onJoinWidgets: joinWidgets,
    onUserScroll: undefined,
    onExternalOpFilterConsumed: () => setTimingFocusOp(''),
    onShowEventTitle: showEventTitleAboveCurrentDetail,
    onEnableRepeat: handleRepeatFromEvent,
    onInspectAnnotationUnit: openGroupInspector,
  }), [handleStepSelection, handleMultiStepSelect, setPanelWidth,
      expandEventsPanelFromWidget, dockEventsWidgetToTopBar,
      dockEventsWidgetToDetailPanel, joinWidgets,
      setTimingFocusOp, showEventTitleAboveCurrentDetail, openGroupInspector,
      handleRepeatFromEvent]);

  return (
    <div
      ref={mainContentRef}
      className={`main-content${isUiChromeVisible ? ' ui-chrome-visible' : ' ui-chrome-hidden'}`}
      style={{
        '--events-panel-width': `${(isEventsPanelCollapsed || eventsOpenFromBottom) ? 0 : panelWidth}px`,
        '--settings-panel-width': isSettingsCollapsed ? '0px' : (isMacPlatform ? '388px' : '328px'),  /* item 182 */
        '--detail-panel-total-height': '0px',  /* item 282: initial value; updated via DOM in detailPanelCallbackRef */
      }}
    >
      <CanvasLoadingOverlay
        loadingOverlayPhase={loadingOverlayPhase}
        steps={steps}
        overlayBarPct={overlayBarPct}
      />
      <EventsPanel
        eventsState={stableEventsState}
        eventsHandlers={stableEventsHandlers}
      />
      <div className={`canvas-and-detail-column${doubleTimelineProps.isTimelineUndocked ? ' timeline-undocked' : ''}`}>
      {/* item 235: CanvasStage is isolated in its own .canvas-column so the canvas
          rendering cycle is clearly separated from the detail panel and timeline.
          DoubleTimeline and DetailPanel are siblings of .canvas-column (not children),
          so updates to them don't affect the canvas render subtree. */}
      <div className="canvas-column">
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
          currentStepData,
          currentStep,
          goToStep,
          revealCurrentStepInPanel,
          isEventsPanelCollapsed,
          setIsEventsPanelCollapsed,
          stepAnimSlidersContent: undefined,
          onJoinWidgets: joinWidgets,
          pinnedBitIndices,
          hoveredBitInfo,
          computeBitInfo,
          getVisibleBalloonStyles,
          balloonLiveLayout,
          cachelineSize,
          setPinnedBitIndices,
          handleStepSelection,
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
          // item 331: group inspector
          groupInspectorUnit,
          groupInspectorEffectiveGroupBits,
          groupInspectorStorageModel,
          groupInspectorWheelDefinition,
          groupInspectorBitLayout,
          groupInspectorByteLayout,
          groupInspectorBitCount,
          openGroupInspector,
          closeGroupInspector,
        }}
        intro={{
          introPhase,
          onIntroTransitionEnd: handleIntroTransitionEnd,
        }}
      />
      </div>{/* end .canvas-column */}
      </div>
      {/* item 282: DetailPanel is now a direct sibling of .canvas-and-detail-column within
          .main-content (position:absolute at bottom:0), fully decoupled from the canvas
          render subtree. Updates to the detail panel do not affect the canvas layout flow.
          The canvas area accounts for it via --detail-panel-total-height CSS variable updated
          directly via DOM in detailPanelCallbackRef (no React re-render triggered). */}
      {currentStepData && (() => {
        const detailPanelNode = (
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
              eventTitleVisible: eventTitleSettings.visible,
              sourceLineNumber: currentStepSourceLine,
              hasRawSource: !!sourceRef,
              aggMaskStepIndex,
              isHeaderHidden: isDetailHeaderHidden,
              isFloating: isDetailPanelFloating,
              isAllEventsInDetailPanel: false,
            }}
            detailConfig={{
              storageModel,
              wheelDefinition,
              benchmarkTimingData,
              allEventsTransport: allEventsTransportContent,
              surroundingEvents,  // item 318: always pass (was undefined when undocked)
            }}
            detailHandlers={{
              onToggle: toggleDetailPanel,
              onHeightChange: updateDetailHeight,
              onWidthChange: setDetailWidth,
              onInspectChangedBits: () => openDetailInspector('bits'),
              onInspectMarkedNumbers: () => openDetailInspector('numbers'),
              onInspectBitCategory: (mode) => openDetailInspector(mode),  // item 446
              // item 350: let the detail panel open the group inspector even when balloons are off
              onInspectAnnotationUnit: openGroupInspector,
              onShowEventTitle,
              onHideEventTitle: () => setEventTitleSettings((prev) => ({ ...prev, visible: false })),
              onOpenRawLog,
              onAggMaskStepChange: aggMaskStepSetterRef ? (idx) => aggMaskStepSetterRef.current?.(idx) : undefined,
              onToggleAllEventsFloater: undefined,
              onDockDetailPanel: dockDetailPanel,
              // item 426: bits grid view
              bitsGridView: bitsGridViewMode,
              onBitsGridViewChange,
            }}
          />
        );
        return (
          /* item 190/282: wrapper is position:absolute at bottom:0 of .main-content so the
             detail panel renders independently of the canvas flex column. */
          <div ref={detailPanelCallbackRef} className="detail-panel-main-wrapper">
            {detailPanelNode}
          </div>
        );
      })()}
      {/* item 260: DoubleTimeline is a direct child of .main-content (not .canvas-and-detail-column)
          so it can visually span over both the canvas area and the settings panel.
          Position: absolute within .main-content (position:relative); docked uses bottom offset,
          undocked uses position:fixed — so parent change is transparent in both cases.
          item 400: only render after the 2d-3d intro transform completes so the timeline
          doesn't flash into view during the canvas scaling/tilt animation. */}
      {currentStepData && introPhase === 'visible' && (
        <DoubleTimeline
          steps={steps}
          currentStep={currentStep}
          currentStepData={currentStepData}
          playing={playing}
          isDetailOpen={isDetailOpen}
          detailHeight={detailHeight}
          totalDetailHeight={totalDetailHeight}
          onToggleDetail={toggleDetailPanel}
          onDetailHeightChange={updateDetailHeight}
          onInspectAnnotationUnit={openGroupInspector}
          {...doubleTimelineProps}
        />
      )}
      {/* item 178: JoinedEventsWidget removed — nearby events are now shown in the detail panel */}
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
          rangeOverlayUnit,
          rangeAutoSet,
          isMultiplesOverlayEnabled,
          multiplesOverlayPrime,
          multiplesOverlayMode,  // item 425
          bitsGridView: bitsGridViewMode,  // item 426
          isMinimapVisible,
          isGroupInspectorEnabled,  // item 428
          eventTitleSettings,
          outlineSettings: layoutSettings.outlines,
          activeTabRequest: settingsTabRequest,
          storageModel,
          wheelDefinition,
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
          onRangeOverlayUnitChange: setRangeOverlayUnit,
          onMultiplesOverlayToggle: onMultiplesOverlayToggle,
          onMultiplesOverlayPrimeChange: setMultiplesOverlayPrime,
          onMultiplesOverlayModeChange: setMultiplesOverlayMode,  // item 425
          onBitsGridViewChange,  // item 426
          onRangeOverlayReset,
          onRangeAutoSetChange,
          onMultiplesOverlayReset,
          onShowMinimapChange: setIsMinimapVisible,
          onGroupInspectorEnabledChange: setIsGroupInspectorEnabled,  // item 428
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
        {/* item 248: minimap canvas lives here (inside .main-content but outside any
            transform-style:preserve-3d container) so position:fixed still anchors
            to the viewport while z-index:1200 keeps it above all panels. */}
        <canvas ref={minimapCanvasRef} className="minimap-overlay-canvas" aria-hidden="true" />
    </div>
  );
}
