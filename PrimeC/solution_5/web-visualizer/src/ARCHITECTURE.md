# Visualizer Architecture

## Provider Hierarchy

The top-level Visualizer tree uses focused providers instead of a single global state object:

1. ThemeProvider
2. PlaybackProvider
3. AnimationConfigProvider
4. PanelLayoutProvider

This keeps shared state grouped by domain and reduces prop drilling across toolbar, panels, and canvas overlays.

## Visual Composition

High-level composition is:

- Toolbar
- ExportProgress + StatusBanners
- VisualizerMainContent
- Minimap canvas
- KeyboardShortcutsOverlay

`VisualizerMainContent` composes:

- CanvasLoadingOverlay
- EventsPanel
- CanvasStage
- JoinedEventsWidget (when joined/visible)
- SettingsPanel
- DebugToolsPanel (when enabled)

`CanvasStage` delegates overlay-specific rendering to `CanvasOverlayManager`.

## Hook Domains

Hooks are imported through domain barrels under `src/hooks/`:

- `rendering/`
- `playback/`
- `animation/`
- `interactions/`
- `ui_state/`
- `camera_3d/`
- `overlays/`
- `data/`
- `utils/`

These barrels tighten import boundaries and make intent explicit at call sites.

## Testing and Verification

- Unit tests run with Vitest via `npm test`.
- Unexpected `console.error` and `console.warn` output fails tests through `src/test/setupConsoleGuards.js`.
- Production integrity is validated with `npm run build`.
