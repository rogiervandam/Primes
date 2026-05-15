# Naming Conventions

Rules for all variables, hooks, components, and functions in this codebase.

---

## Booleans

Use an `is`, `are`, `has`, or `can` prefix — always, without exception.

| Pattern | Example |
|---|---|
| `is{Feature}` | `isDetailOpen`, `isTraceInfoVisible`, `isGlUnavailable` |
| `are{Things}` | `areControlsHidden`, `areWidgetsJoined`, `areBalloonsEnabled` |
| `has{Property}` | `hasRawSource`, `hasBenchmarkData` |
| `can{Action}` | `canExport`, `canSeek` |

**Never use** bare adjectives or past-participle forms without a prefix:
```js
// ❌ Bad
glUnavailable, debugToolsOpen, timingPanelOpen
eventsPanelCollapsed, detailOpen, minimapAvailable, uiChromeVisible

// ✅ Good
isGlUnavailable, isDebugToolsOpen, isTimingPanelOpen
isEventsPanelCollapsed, isDetailOpen, isMinimapAvailable, isUiChromeVisible
```

**Exceptions** — React verb-tense state is conventional without prefix when it describes
an ongoing process (not a static flag):
- `playing`, `exporting`, `loading` — ongoing process state (keep as-is)

---

## Refs

Use a `Ref` suffix exactly once. Group tightly-related refs into a plain object where
they are defined, so consumers destructure from the group rather than import N individual
refs.

```js
// ❌ Bad — flat list with repeated context
minimapCanvasRef, containerRef, glCanvasRef, glyphCanvasRef, wrapperCanvasRef

// ✅ Good — grouped by concern
const { canvasRefs, glCssUnlockRefs } = useCanvasRefs();
// canvasRefs.minimap, canvasRefs.container, canvasRefs.gl, canvasRefs.glyph, canvasRefs.wrapper
// glCssUnlockRefs.token, glCssUnlockRefs.raf, glCssUnlockRefs.timeout, glCssUnlockRefs.lockState
```

Group naming:
- `canvasRefs` — DOM canvas elements + renderer instances
- `animationRefs` — timers, RAF ids, animation cancellers
- `playbackRefs` — play timer, seek gen, anim busy refs

Individual ref names follow the value they point to: `{feature}Ref` (e.g.,
`triggerAnimationRef`, `viewportAnimRef`). Never add a second `Ref` suffix.

---

## Event Handlers and Callbacks

| Type | Pattern | Example |
|---|---|---|
| DOM event handler | `handle{Event}` | `handlePlayPause`, `handleStepSelection` |
| Imperative action | `do{Verb}` | `doZoom`, `doSeek` |
| Toggle action | `toggle{Feature}` | `toggleDetailPanel`, `toggleTilt` |
| Open/close | `open{Thing}` / `close{Thing}` | `openDetailInspector` |
| Show/hide | `show{Thing}` / `hide{Thing}` | `showAllEventsWidget`, `hideJoinedWidget` |
| Dock/push | `dock{What}To{Where}` | `dockEventsWidgetToTopBar` |
| Schedule/defer | `schedule{What}` | `schedulePostLayoutRefresh`, `scheduleBalloonRelayout` |
| Capture/stash | `capture{What}` | `captureViewportAnchor`, `captureResizeAnchor` |

---

## Derived / Computed Values

Use a descriptive noun or adjective. If the value is derived from other state,
prefer `effective{Property}` or `computed{Property}` to signal it is not raw state:

```js
const effectiveGroupBits = ...;   // ✅ derived
const effectiveTitle = ...;        // ✅ alias / derivation
const balloonMode = ...;           // ✅ simple derived string
```

---

## Custom Hooks

Pattern: `use{Domain}{Feature}` (PascalCase after `use`).

| Domain | Example |
|---|---|
| Rendering | `useCanvasRefs`, `useCanvasLayout`, `useRendererPipeline` |
| Playback | `usePlaybackClock`, `usePlaybackLoop`, `useGoToStep` |
| Animation | `useAnimationConfig`, `useAnimationPipeline`, `useSeekStepAnimation` |
| Interactions | `usePointerGestures`, `useKeyboardShortcuts`, `useBalloonLayout` |
| UI state | `usePanelState`, `useWidgetState`, `useBitState` |
| Camera/3D | `use3DCamera`, `useTiltControls`, `useViewportNavigation` |
| Overlays | `useOverlays`, `useBalloonGeometry`, `useDetailInspectorRows` |
| Data | `useRawSource`, `useSearchState`, `useTraceExport` |
| Utils | `useDebugTools`, `useViewPrefsSync`, `useLayoutRefreshScheduler` |

---

## State Setters

Always `set{Variable}` matching the state variable name:
```js
const [isDetailOpen, setIsDetailOpen] = useState(false);
//                    ↑ "set" + full variable name including prefix
```

---

## Components

PascalCase, noun or noun phrase describing what the component renders:
- `Toolbar`, `CanvasStage`, `EventsPanel`, `DetailPanel`
- `BitHistoryBalloon`, `EventTitleBanner`, `JoinedEventsWidget`

---

## TypeScript

- Interface names: `{Domain}State`, `{Domain}Props`, `{Domain}Refs`
  - `ThemeState`, `PlaybackState`, `AnimationConfigState`
  - `VisualizerProps`, `ToolbarProps`
  - `CanvasRefs`, `AnimationRefs`
- Type file per domain: `src/types/rendering.ts`, `src/types/playback.ts`, etc.

---

## Documentation files

- Keep one canonical source per topic. For architecture, this is
  `docs/ARCHITECTURE.md`.
- If a second location needs discoverability (for example under `src/`), use a
  short redirect doc that points to the canonical file.
- Prefer short, imperative headings and avoid repeating implementation detail
  that already exists in `COMPONENTS.md` or `AI_MAINTENANCE.md`.
