import React from 'react';
import EventsPanel from '../EventsPanel';
import SettingsPanel from '../SettingsPanel';
import CanvasStage from './CanvasStage';
import CanvasLoadingOverlay from './CanvasLoadingOverlay';
import JoinedEventsWidget from './JoinedEventsWidget';
import DebugToolsPanel from './DebugToolsPanel';

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
  const { mode3D, refs: canvasRefs = {}, styles: canvasStyles = {}, camera3D: camera3DInfo = {}, zoom, isMacPlatform, isWindowsPlatform } = canvas;
  const { container: containerRef, glCanvas: glCanvasRef, glyphCanvas: glyphCanvasRef, wrapperCanvas: wrapperCanvasRef, renderer: rendererRef, glRenderer: glRendererRef, camera3D: camera3DRef } = canvasRefs;
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
  const { isToolsOpen: isDebugToolsOpen, theme = 'dark', isGlUnavailable, glDebugInfo, debugLayerMode, debugGlOffsetX, debugGlOffsetY, debugGlAutoOffsetY, isDebugCalibrationMode, handlers: debugHandlers = {} } = debug;
  const { setDebugLayerMode, setDebugGlOffsetX, setDebugGlOffsetY, setIsDebugCalibrationMode, applySnapshot: applyDebugSnapshot, forceGlRedraw } = debugHandlers;

  return (
    <div
      className={`main-content${mode3D ? ' mode-3d' : ''}${isUiChromeVisible ? ' ui-chrome-visible' : ' ui-chrome-hidden'}`}
      style={{ '--events-panel-width': `${isEventsPanelCollapsed ? 0 : panelWidth}px` }}
    >
      <CanvasLoadingOverlay
        loadingOverlayPhase={loadingOverlayPhase}
        steps={steps}
        overlayBarPct={overlayBarPct}
      />
      <EventsPanel
        steps={steps}
        currentStep={currentStep}
        selectedSteps={selectedSteps}
        onStepClick={handleStepSelection}
        onMultiStepSelect={handleMultiStepSelect}
        onUserScroll={stopPlayback}
        width={panelWidth}
        onWidthChange={setPanelWidth}
        panelCollapsed={isEventsPanelCollapsed}
        onToggleCollapse={toggleEventsPanel}
        isAllEventsWidgetHidden={isAllEventsWidgetHidden || areWidgetsJoined}
        onExpandPanelFromWidget={expandEventsPanelFromWidget}
        onDockWidgetToTopBar={dockEventsWidgetToTopBar}
        onDockWidgetToDetailPanel={dockEventsWidgetToDetailPanel}
        onJoinWidgets={joinWidgets}
        externalOpFilter={timingFocusOp}
        onExternalOpFilterConsumed={() => setTimingFocusOp('')}
        revealStepRequest={revealStepRequest}
        eventTitleVisible={eventTitleSettings.visible && !areWidgetsJoined}
        onShowEventTitle={showEventTitleAboveCurrentDetail}
      />
      <CanvasStage
        mode3D={mode3D}
        containerRef={containerRef}
        glCanvasRef={glCanvasRef}
        glyphCanvasRef={glyphCanvasRef}
        wrapperCanvasRef={wrapperCanvasRef}
        glActive={true}
        hideGlCanvas={false}
        camera3DContainerStyle={mergedCamera3DContainerStyle}
        renderCanvasStyle={renderCanvasStyle}
        eventTitleSettings={eventTitleSettings}
        setEventTitleSettings={setEventTitleSettings}
        eventTitleStyle={eventTitleStyle}
        currentStepBanner={currentStepBanner}
        surroundingEvents={surroundingEvents}
        currentStepData={currentStepData}
        currentStep={currentStep}
        goToStep={goToStep}
        revealCurrentStepInPanel={revealCurrentStepInPanel}
        isEventsPanelCollapsed={isEventsPanelCollapsed}
        setIsEventsPanelCollapsed={setIsEventsPanelCollapsed}
        stepAnimSlidersContent={stepAnimSlidersContent}
        stepAnimSlidersDockedContent={stepAnimSlidersDockedContent}
        areWidgetsJoined={areWidgetsJoined}
        onJoinWidgets={joinWidgets}
        onSplitWidgets={splitWidgets}
        pinnedBitIndices={pinnedBitIndices}
        hoveredBitInfo={hoveredBitInfo}
        computeBitInfo={computeBitInfo}
        getVisibleBalloonStyles={getVisibleBalloonStyles}
        balloonLiveLayout={balloonLiveLayout}
        cachelineSize={cachelineSize}
        setPinnedBitIndices={setPinnedBitIndices}
        handleStepSelection={handleStepSelection}
        isDetailOpen={isDetailOpen}
        toggleDetailPanel={toggleDetailPanel}
        detailHeight={detailHeight}
        pendingBannerDragStart={pendingBannerDragStart}
        onConsumePendingBannerDragStart={() => setPendingBannerDragStart(null)}
        updateDetailHeight={updateDetailHeight}
        detailWidth={detailWidth}
        setDetailWidth={setDetailWidth}
        playing={playing}
        selectedSteps={selectedSteps}
        stepStats={stepStats}
        storageModel={storageModel}
        wheelDefinition={wheelDefinition}
        layoutSettings={layoutSettings}
        benchmarkTimingData={benchmarkTimingData}
        openDetailInspector={openDetailInspector}
        isDetailInspectorOpen={isDetailInspectorOpen}
        detailInspectorMode={detailInspectorMode}
        detailInspectorQuery={detailInspectorQuery}
        setDetailInspectorQuery={setDetailInspectorQuery}
        setIsDetailInspectorOpen={setIsDetailInspectorOpen}
        detailInspectorRows={detailInspectorRows}
        filteredDetailInspectorRows={filteredDetailInspectorRows}
        isTimingPanelOpen={isTimingPanelOpen}
        setIsTimingPanelOpen={setIsTimingPanelOpen}
        benchmarkTimingFileName={benchmarkTimingFileName}
        setTimingFocusOp={setTimingFocusOp}
        onImportBenchmarkTiming={onImportBenchmarkTiming}
        steps={steps}
        onShowEventTitle={onShowEventTitle}
        onOpenRawLog={onOpenRawLog}
        currentStepSourceLine={currentStepSourceLine}
        hasRawSource={!!sourceRef}
        allEventsTransport={allEventsTransportContent}
        introPhase={introPhase}
        onIntroTransitionEnd={handleIntroTransitionEnd}
        isSingleEventWidgetRevealed={isSingleEventWidgetRevealed}
      />
      {areWidgetsJoined && isEventsPanelCollapsed && !isAllEventsWidgetHidden && eventTitleSettings.visible && isSingleEventWidgetRevealed && (
        <JoinedEventsWidget
          settings={eventTitleSettings}
          setSettings={setEventTitleSettings}
          banner={currentStepBanner}
          surrounding={surroundingEvents}
          currentStepData={currentStepData}
          revealCurrentStepInPanel={revealCurrentStepInPanel}
          sliders={stepAnimSlidersContent}
          onSplitWidgets={splitWidgets}
          onPushToEventsPanel={pushJoinedWidgetToEventsPanel}
          onPushToDetailPanel={pushJoinedWidgetToDetailPanel}
          initialBannerRect={joinBannerRect}
          onHideWidget={hideJoinedWidget}
          onNavigate={() => { if (!isDetailOpenRef.current) setIsDetailOpen(true); }}
        />
      )}
      <SettingsPanel
        settings={layoutSettings}
        onChange={setLayoutSettings}
        autoFitColumns={autoFitColumnCount}
        onActiveTabChange={setSettingsActiveTab}
        cachelineSize={cachelineSize}
        onCachelineSizeChange={setCachelineSize}
        cachePreset={cachePreset}
        onCachePresetChange={setCachePreset}
        isHeatMapEnabled={isHeatMapEnabled}
        onHeatMapToggle={setIsHeatMapEnabled}
        cachelineAnnotation={cachelineAnnotation}
        onCachelineAnnotationChange={setCachelineAnnotation}
        isPrimeOverlayEnabled={isPrimeOverlayEnabled}
        onPrimeOverlayToggle={setIsPrimeOverlayEnabled}
        isRangeOverlayEnabled={isRangeOverlayEnabled}
        rangeOverlayStart={rangeOverlayStart}
        rangeOverlayEnd={rangeOverlayEnd}
        onRangeOverlayToggle={onRangeOverlayToggle}
        onRangeOverlayStartChange={setRangeOverlayStart}
        onRangeOverlayEndChange={setRangeOverlayEnd}
        isMultiplesOverlayEnabled={isMultiplesOverlayEnabled}
        multiplesOverlayPrime={multiplesOverlayPrime}
        onMultiplesOverlayToggle={onMultiplesOverlayToggle}
        onMultiplesOverlayPrimeChange={setMultiplesOverlayPrime}
        onRangeOverlayReset={onRangeOverlayReset}
        onMultiplesOverlayReset={onMultiplesOverlayReset}
        isMinimapVisible={isMinimapVisible}
        onShowMinimapChange={setIsMinimapVisible}
        minimapControlVisible={true}
        eventTitleSettings={eventTitleSettings}
        onEventTitleSettingsChange={setEventTitleSettings}
        outlineSettings={layoutSettings.outlines}
        onOutlineChange={(outlines) => setLayoutSettings((prev) => ({ ...prev, outlines }))}
        isWindowsPlatform={isWindowsPlatform}
        showAnimationControls={true}
        activeTabRequest={settingsTabRequest}
      />
      {isDebugToolsOpen && (
        <DebugToolsPanel
          rendererRef={rendererRef}
          glCanvasRef={glCanvasRef}
          glRendererRef={glRendererRef}
          camera3DRef={camera3DRef}
          camera3DTransform={camera3DTransform}
          zoomLevel={zoom}
          glDebugInfo={glDebugInfo}
          theme={theme}
          debugLayerMode={debugLayerMode}
          setDebugLayerMode={setDebugLayerMode}
          debugGlOffsetX={debugGlOffsetX}
          setDebugGlOffsetX={setDebugGlOffsetX}
          debugGlOffsetY={debugGlOffsetY}
          setDebugGlOffsetY={setDebugGlOffsetY}
          debugGlAutoOffsetY={debugGlAutoOffsetY}
          isDebugCalibrationMode={isDebugCalibrationMode}
          setIsDebugCalibrationMode={setIsDebugCalibrationMode}
          onApplyDebugSnapshot={applyDebugSnapshot}
          onForceGlRedraw={forceGlRedraw}
          rightOffset={isSettingsCollapsed ? 8 : (isMacPlatform ? 388 : 328)}
        />
      )}
    </div>
  );
}
