# Visualizer Refactoring Plan: Variable Organization

This document is a historical refactor record.
For current architecture and maintenance guidance, use:

- `docs/ARCHITECTURE.md`
- `docs/COMPONENTS.md`
- `docs/AI_MAINTENANCE.md`

## Goal
Reduce cognitive load from 100+ flat variables to organized semantic groups while maintaining all functionality.

## Current Problems
- 50+ `useState` + hook destructurings scattered sequentially
- Refs not organized by category  
- Boolean naming inconsistent (is-, aren't-, mode3D, playing)
- Hundreds of variables passed to subcomponents prop-by-prop
- Handler organization mixed (handle-, do-, toggle-)

## Refactoring Strategy: 3 Phases

### Phase 1: Group All Variable Declarations ✅ COMPLETE
**Objective**: Organize state/refs into semantic objects immediately after hook calls, without changing any existing component code.

**Status**: COMPLETED
- ✅ Added comprehensive organized state structure (~400 lines) after all hook calls
- ✅ Semantic groupings created: `canvasState`, `animationState`, `playbackState`, `themeState`, `panelState`, `overlayState`, etc.
- ✅ All tests passing (337 tests)
- ✅ Production build succeeds
- ✅ No logic changes — all existing references still work
- ✅ Individual variables remain available for backward compatibility

**Benefits Achieved**:
- Developers can now see where state logically belongs
- Visual grouping makes dependencies explicit
- Foundation for Phase 2 refactoring
- No functional risk — purely organizational

**Next Refactoring**: Individual variables in component body still use flat names. Optional: add const aliases:
```javascript
// After organized state section:
const { isPlaying, currentStep, speed } = playbackState;
const { colorPreset, customColors } = themeState;
// ... etc
```

### Phase 2: Migrate Component Props (deferred)
**Objective**: Update `VisualizerMainContent` + other child components to accept grouped objects instead of scattered props.

**Status**: NOT STARTED (deferred)

**Proposed Changes**:
- `<VisualizerMainContent state={state} handlers={handlers} refs={refs} ... />`
- Decompose inside child component as needed

### Phase 3: Migrate Hook Call Sites (future work)
**Objective**: Update `useVisualizerEffects`, `useRawLogNavigation`, etc. to destructure from organized groups inside hooks.

**Status**: DEFERRED (too large for single pass)

**Note**: This would require updating all hook signatures to accept grouped objects.

## Implementation Status

| Phase | Status | Lines Added | Risk |
|-------|--------|------------|------|
| Phase 1 | ✅ Complete | ~400 | Low (organizational only) |
| Phase 2 | 📋 Planned | ~200+ | Medium (prop contracts change) |
| Phase 3 | 🔮 Future | Unknown | High (hook refactoring) |

## Files Modified
- `src/Visualizer.jsx` — added organized state section (~400 lines)
- `docs/REFACTORING_PLAN.md` — this file

## Testing Results
- ✅ All 337 tests passing
- ✅ Production build succeeds (460.50 KB gzip)
- ✅ No console errors
- ✅ Zero functional regressions

## Developer Usage
New organized state objects are available immediately after the organized state section. Future code can reference:
- `canvasState.refs.*` — canvas elements
- `playbackState.*` — play/pause/speed
- `animationState.*` — animation config/runtime  
- `panelState.*` — UI layout
- `overlayState.*` — overlay features
- etc.

Existing scattered variables are still available and functional for backward compatibility.

## Recommendation
**Phase 1 is complete and safe to merge.**
**Phase 2** can be staged as a follow-up when prop consolidation becomes a priority.
**Phase 3** is a future architectural decision.
