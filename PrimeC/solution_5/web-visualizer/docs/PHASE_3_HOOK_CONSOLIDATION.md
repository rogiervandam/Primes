# Phase 3: Hook Parameter Consolidation

## Overview

Phase 3 consolidates hook signatures by grouping related parameters into semantic objects, reducing parameter count and improving dependency clarity.

**Status:** Phase 3-4 Completed, Phase 5 In Progress
**Completed:** usePanelChoreography (Phase 3.0), useAnimationPipeline (Phase 3.1), useRendererPipeline (Phase 3.2), usePlaybackLoop (Phase 3.3), Internal sub-hook contracts (Phase 4.0), Temporal cleanup (Phase 4.1)
**In Progress:** Component tree propagation - EventsPanel (5.0), DetailPanel (5.1), CanvasStage (5.2), Secondary components (5.3+)

## Completed Refactoring

### usePanelChoreography (Proof of Concept)

**Before:** 16 scattered parameters
```javascript
usePanelChoreography({
  captureResizeAnchor,
  detailHeight,
  isDetailOpen,
  settingsActiveTab,
  isSettingsCollapsed,
  setIsAllEventsInDetailPanel,
  setIsAllEventsWidgetHidden,
  setEventTitleSettings,
  setIsEventsPanelCollapsed,
  setJoinBannerRect,
  setRevealStepRequest,
  setIsSettingsCollapsed,
  setSettingsTabRequest,
  setAreWidgetsJoined,
  updateDetailOpen,
})
```

**After:** 3 organized objects
```javascript
usePanelChoreography({
  panelHandlers: {
    // 11 callback/setter functions
    captureResizeAnchor,
    setIsAllEventsInDetailPanel,
    setIsAllEventsWidgetHidden,
    setEventTitleSettings,
    setIsEventsPanelCollapsed,
    setJoinBannerRect,
    setRevealStepRequest,
    setIsSettingsCollapsed,
    setSettingsTabRequest,
    setAreWidgetsJoined,
    updateDetailOpen,
  },
  detailState: {
    height: detailHeight,
    isOpen: isDetailOpen,
  },
  settingsState: {
    activeTab: settingsActiveTab,
    isCollapsed: isSettingsCollapsed,
  },
})
```

**Benefits:**
- Parameter count: 16 → 3 (81% reduction)
- Call site reduced to 3 semantic object groups
- Dependencies explicit: handlers, detailState, settingsState
- Backward compatible: old signature still supported during transition

**Pattern Applied:** Semantic grouping by domain
- `panelHandlers`: All callbacks and state setters
- `detailState`: Detail panel properties (height, isOpen)
- `settingsState`: Settings panel properties (activeTab, isCollapsed)

## Hook Consolidation Strategy

### Priority Queue

| Hook | Params | Domain | Complexity | Priority |
|------|--------|--------|------------|----------|
| useAnimationPipeline | ~80+ | Animation engine | High | 1 |
| useRendererPipeline | ~60+ | Renderer lifecycle | High | 2 |
| usePlaybackLoop | ~30+ | Playback state | Medium | 3 |
| usePanelChoreography | 16 | Panel transitions | Low | ✅ DONE |
| usePanelChoreography | ~20 | Other choreography | Low | 4 |

### Parameter Grouping Template

For each high-parameter hook, organize parameters into:
1. **`*Config`** – Static configuration and settings
2. **`*State`** – Current runtime values
3. **`*Refs`** – Mutable references (useRef objects)
4. **`*Handlers`** – Callbacks and state setters

### useAnimationPipeline (Completed in Phase 3.1)

**Previous Parameters (~80+):**
- Animation mode/style settings
- Timing/interval refs
- State references
- Callback handlers
- Derived values

**Proposed Organization:**
```javascript
useAnimationPipeline({
  animConfig: {
    mode,
    style,
    bitAnimMode,
    effectiveGroupBits,
    pinnedBitIndices,
  },
  animState: {
    currentStep,
    animBusyUntil,
    bitStateRef,
    stepsRef,
  },
  animRefs: {
    seqTimerRef,
    rendererRef,
    runEffectCancelRef,
    rippleRef,
    seekGenRef,
    // ... other refs
  },
  animHandlers: {
    bitAnimInterval,
    maskAnimInterval,
    computeEventDuration,
    bitsAtTimeRatio,
    timeRatioAtBitIndex,
    // ... other callbacks
  },
})
```

### useRendererPipeline (Completed in Phase 3.2)

**Current Parameters (~60+):**
- Canvas/renderer settings
- State values
- Refs
- Callbacks

**Proposed Organization:**
```javascript
useRendererPipeline({
  rendererConfig: { /* settings */ },
  rendererState: { /* current values */ },
  rendererRefs: { /* mutable refs */ },
  rendererHandlers: { /* callbacks */ },
})
```

**Implemented Grouping:**
- `rendererRefs`: lifecycle refs, render refs, panel-anchor refs
- `rendererConfig`: visual/layout/theme/storage/overlay config
- `rendererState`: runtime state (`loadingOverlayPhase`, panel/detail dimensions)
- `rendererHandlers`: callbacks and state setters used by sub-hooks

**Backward compatibility:**
- Hook supports grouped shape and legacy flat shape during migration.

### usePlaybackLoop (Completed in Phase 3.3)

**Previous Parameters (~30+):**
- Scheduler refs
- Loop control refs
- Playback state mirrors
- State setters

**Implemented Grouping:**
- `loopRefs`: timers, refs, animation/seek bridges
- `loopState`: playback state mirrors used in dependencies
- `loopHandlers`: state setters (`setPlaying`, `setCurrentStep`)
- `loopConfig`: feature toggles (`isAutoAnimateOnSelect`)

**Backward compatibility:**
- Hook supports grouped shape and legacy flat shape during migration.

**Implemented Grouping:**
- `animRefs`: runtime refs, mutable state refs, bridge refs
- `animConfig`: style/mode/timing config and pin/group options
- `animState`: render-time state (`currentStep`, `steps`, `playing`)
- `animHandlers`: reserved for extracted callbacks (kept for pattern consistency)

**Backward compatibility:**
- Hook supports both grouped and legacy-flat call signatures during migration.

## Component Tree Propagation (Phase 5)

Phase 5 propagates organized-object patterns from Visualizer.jsx down through the component tree, reducing prop-drilling complexity at each component boundary.

### Phase 5.0: EventsPanel (Completed)

**Before:** 15 scattered props
```javascript
<EventsPanel
  steps={steps}
  currentStep={currentStep}
  selectedSteps={selectedSteps}
  onStepClick={handleStepSelection}
  onMultiStepSelect={handleMultiStepSelect}
  width={panelWidth}
  onWidthChange={setPanelWidth}
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
```

**After:** 2 organized objects
```javascript
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
```

**Benefits:**
- Props reduced from 15 to 2 objects (87% reduction at call site)
- State and handlers clearly separated
- Backward compatible via fallback

### Phase 5.1: DetailPanel (Completed)

**Before:** 25 scattered props
**After:** 3 organized objects (detailState, detailConfig, detailHandlers)
**Benefits:** Props reduced from 25 to 3 objects (88% reduction)

### Phase 5.2: CanvasStage (Completed)

**Before:** 80+ scattered props
```javascript
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
  // ... 70+ more individual props
/>
```

**After:** 6 organized objects
```javascript
<CanvasStage
  canvasRefs={{
    containerRef,
    glCanvasRef,
    glyphCanvasRef,
    wrapperCanvasRef,
  }}
  canvasConfig={{
    mode3D,
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
    // ... all CanvasOverlayManager props (30+)
  }}
  detail={{
    step: isSingleEventWidgetRevealed ? currentStepData : null,
    // ... all DetailPanel props (25+)
  }}
  intro={{
    introPhase,
    onIntroTransitionEnd: handleIntroTransitionEnd,
    isSingleEventWidgetRevealed,
  }}
/>
```

**Benefits:**
- Props reduced from 80+ to 6 semantic objects (93% reduction)
- Canvas infrastructure isolated from overlay/detail concerns
- Backward compatible via fallback

### Testing Results (Phase 5.0-5.2)

- ✅ 341 tests passing (no regressions)
- ✅ Production build: 130.97 KB gzip (main Visualizer bundle)
- ✅ No console errors/warnings
- ✅ All organized objects with flat fallback compatibility

## Testing & Validation

**Current Status:**
- ✅ 341 tests passing
- ✅ Production build: 461.36 KB gzip (Visualizer bundle)
- ✅ No console errors/warnings
- ✅ Runtime error detection active

**Validation After Each Hook Refactoring:**
1. Run: `npm test` → Verify all 339 tests still pass
2. Run: `npm run build` → Verify no transform errors
3. Check: `Visualizer.runtime.test.jsx` catches ReferenceErrors automatically

## Backward Compatibility Strategy

All hooks maintain backward compatibility during Phase 3:
- New hooks accept organized objects (e.g., `panelConfig`)
- Old scattered parameters still supported via fallback logic
- Call sites can be updated incrementally
- No breaking changes to component tree

## Implementation Checklist

### Phase 3.0 (Completed)
- [x] Refactor `usePanelChoreography` to accept organized objects
- [x] Update Visualizer.jsx call site to pass organized panelConfig
- [x] Verify all tests pass
- [x] Verify build succeeds

### Phase 3.1 (Completed)
- [x] Analyze `useAnimationPipeline` parameters (80+ count)
- [x] Create organized input objects (`animRefs`, `animConfig`, `animState`, `animHandlers`)
- [x] Refactor hook signature
- [x] Update `Visualizer.jsx` call site
- [x] Verify tests and build

### Phase 3.2 (Completed)
- [x] Analyze `useRendererPipeline` parameters (60+ count)
- [x] Apply same consolidation pattern (`rendererRefs`, `rendererConfig`, `rendererState`, `rendererHandlers`)
- [x] Update call site
- [x] Verify tests and build

### Phase 3.3 (Completed)
- [x] Apply to `usePlaybackLoop` (~30 params)
- [x] Finalize high-parameter hook migration for Phase 3 scope
- [x] Update consolidation documentation

### Phase 4 (Hook Internals)
- [x] Update sub-hook calls to use organized objects (`useRendererLayoutSync`, `useTriggerAnimation`)
- [x] Simplify parameter passing chains in pipeline internals
- [x] Optimize temporal dependencies (effect dependency cleanup in renderer/animation pipelines)

### Phase 5 (Component Tree) - IN PROGRESS
- [x] Phase 5.0: Propagate to EventsPanel (15 props → 2 objects)
- [x] Phase 5.1: Propagate to DetailPanel (25 props → 3 objects)
- [x] Phase 5.2: Propagate to CanvasStage (80+ props → 6 objects)
- [ ] Phase 5.3: Secondary components (CanvasOverlayManager, etc.)
- [ ] Phase 5.4: Optional - Remove flat fallback compatibility once refactoring stabilizes

## Documentation Updates

- [ ] Add Phase 3 section to ARCHITECTURE.md
- [ ] Update COMPONENTS.md hook signatures
- [ ] Add PHASE_3_HOOK_CONSOLIDATION.md (this file)
- [ ] Update AI_MAINTENANCE.md with consolidation patterns
- [ ] Create hook refactoring template for future work

## Key Insights

1. **Semantic Grouping Works:** Organizing parameters by domain (handlers, state, refs, config) makes dependencies explicit and reduces cognitive load.

2. **Backward Compatibility Essential:** Fallback logic allows incremental updates without breaking existing components.

3. **Pattern Repeatable:** The strategy applied to `usePanelChoreography` (16 params → 3 objects) scales to larger hooks like `useAnimationPipeline` (80+ params).

4. **Automation Improves Safety:** Runtime error detection via `Visualizer.runtime.test.jsx` catches ReferenceErrors automatically, reducing manual debugging.

5. **Spread Operator Effective:** Combined with Phase 2 prop consolidation, spread operator reduces prop drilling visibility at call site.

## Next Actions

1. ✅ Complete Phase 5.0-5.2 (EventsPanel, DetailPanel, CanvasStage - DONE)
2. Phase 5.3: Refactor secondary components (CanvasOverlayManager, JoinedEventsWidget, etc.)
3. Optional Phase 5.4: Remove flat fallback compatibility once refactoring stabilizes
4. Document Phase 5 patterns in `ARCHITECTURE.md` and `AI_MAINTENANCE.md`
5. Create summary document showing cumulative refactoring impact across all phases
