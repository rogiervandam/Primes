# Phase 3: Hook Parameter Consolidation

## Overview

Phase 3 consolidates hook signatures by grouping related parameters into semantic objects, reducing parameter count and improving dependency clarity.

**Status:** In Progress
**Completed:** usePanelChoreography (Proof of Concept), useAnimationPipeline (Phase 3.1)
**Remaining:** useRendererPipeline and secondary hooks

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

### useRendererPipeline (Target for Phase 3.2)

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
- `animRefs`: runtime refs, mutable state refs, bridge refs
- `animConfig`: style/mode/timing config and pin/group options
- `animState`: render-time state (`currentStep`, `steps`, `playing`)
- `animHandlers`: reserved for extracted callbacks (kept for pattern consistency)

**Backward compatibility:**
- Hook supports both grouped and legacy-flat call signatures during migration.

## Testing & Validation

**Current Status:**
- ✅ 341 tests passing
- ✅ Production build: 461.02 KB gzip (Visualizer bundle)
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

### Phase 3.2 (Following)
- [ ] Analyze `useRendererPipeline` parameters (60+ count)
- [ ] Apply same consolidation pattern
- [ ] Update call site
- [ ] Verify tests and build

### Phase 3.3 (Secondary Hooks)
- [ ] Apply to `usePlaybackLoop` (~30 params)
- [ ] Apply to other high-parameter hooks
- [ ] Comprehensive refactoring documentation

### Phase 4 (Hook Internals)
- [ ] Update sub-hook calls to use organized objects
- [ ] Simplify parameter passing chains
- [ ] Optimize temporal dependencies

### Phase 5 (Component Tree)
- [ ] Propagate organized patterns to EventsPanel
- [ ] Update CanvasStage
- [ ] Update DetailPanel

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

1. Apply the same grouping pattern to `useRendererPipeline` (Phase 3.2)
2. Verify `npm test` and `npm run build` after Phase 3.2
3. Continue with `usePlaybackLoop` and secondary hooks (Phase 3.3)
4. Document lessons learned in `AI_MAINTENANCE.md`
