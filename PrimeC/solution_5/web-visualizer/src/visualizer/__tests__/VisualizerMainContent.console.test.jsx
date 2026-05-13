import React from 'react';
import { describe, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';

vi.mock('../EventsPanel', () => ({
  default: () => null,
}));

vi.mock('../SettingsPanel', () => ({
  default: () => null,
}));

vi.mock('../DetailPanel', () => ({
  default: () => null,
}));

vi.mock('../../contexts/PanelLayoutContext', () => ({
  usePanelLayoutContext: () => ({
    eventsOpenFromBottom: false,
    isDetailOpen: false,
    detailHeight: 280,
  }),
}));

vi.mock('../CanvasStage', () => ({
  default: () => null,
}));

vi.mock('../CanvasLoadingOverlay', () => ({
  default: () => null,
}));

vi.mock('../DebugToolsPanel', () => ({
  default: () => null,
}));

import VisualizerMainContent from '../VisualizerMainContent';

const noop = () => {};

function buildProps(overrides = {}) {
  const base = {
    canvas: {
      mode3D: false,
      refs: {
        container: { current: null },
        glCanvas: { current: null },
        glyphCanvas: { current: null },
        wrapperCanvas: { current: null },
        renderer: { current: null },
        glRenderer: { current: null },
        camera3D: { current: null },
      },
      styles: {
        merged3D: {},
        render: {},
        eventTitle: {},
      },
      camera3D: {
        transform: null,
      },
      zoom: 1,
      isMacPlatform: false,
      isWindowsPlatform: false,
    },
    uiFrame: {
      isUiChromeVisible: true,
      introPhase: 'done',
      loadingOverlayPhase: 'hidden',
      overlayBarPct: 0,
      handleIntroTransitionEnd: noop,
    },
    playback: {
      steps: [],
      currentStep: 0,
      selectedSteps: [],
      playing: false,
      handlers: {
        selection: noop,
        multiSelection: noop,
        stop: noop,
        goToStep: noop,
      },
    },
    animation: {
      content: {
        stepAnimSliders: null,
        stepAnimSlidersDocked: null,
        allEventsTransport: null,
      },
      currentStepBanner: null,
      surroundingEvents: [],
      currentStepData: null,
    },
    panels: {
      events: {
        isCollapsed: false,
        width: 320,
        isAllEventsWidgetHidden: false,
        handlers: {
          toggle: noop,
          setCollapsed: noop,
          setPanelWidth: noop,
        },
      },
      detail: {
        isOpen: false,
        isOpenRef: { current: false },
        height: 280,
        width: 420,
        handlers: {
          toggle: noop,
          setOpen: noop,
          updateHeight: noop,
          setWidth: noop,
        },
      },
      settings: {
        isCollapsed: false,
        tabRequest: null,
        handlers: {
          setActiveTab: noop,
          setLayoutSettings: noop,
        },
      },
      timing: {
        isOpen: false,
        focusOp: '',
        handlers: {
          setOpen: noop,
          setFocusOp: noop,
        },
      },
    },
    eventTitle: {
      settings: {
        visible: false,
        dragOffsetX: 0,
        dragOffsetY: 0,
      },
      style: {},
      handlers: {
        setSettings: noop,
        showAboveCurrentDetail: noop,
        showAboveClosedDetail: noop,
      },
    },
    widgets: {
      state: {
        areJoined: false,
        isSingleEventRevealed: false,
        joinBannerRect: null,
        pendingBannerDragStart: null,
        revealStepRequest: 0,
      },
      handlers: {
        expandEventsPanel: noop,
        dockEventsToTopBar: noop,
        dockEventsToDetail: noop,
        pushEventsToPanel: noop,
        pushEventsToDetail: noop,
        hideJoined: noop,
        split: noop,
        join: noop,
        setPendingDragStart: noop,
      },
    },
    overlays: {
      balloons: {
        pinnedIndices: [],
        hoveredBitInfo: null,
        liveLayout: null,
        cachelineSize: 64,
        handlers: {
          setPinnedIndices: noop,
          computeBitInfo: noop,
          getVisibleStyles: () => ({}),
        },
      },
      heatMap: {
        isEnabled: false,
        handlers: {
          setEnabled: noop,
        },
      },
      cache: {
        cachelineAnnotation: 'none',
        cachePreset: 'none',
        handlers: {
          setCachelineSize: noop,
          setCachelineAnnotation: noop,
          setCachePreset: noop,
        },
      },
      prime: {
        isEnabled: false,
        handlers: {
          setEnabled: noop,
        },
      },
      range: {
        isEnabled: false,
        start: 0,
        end: 0,
        handlers: {
          setEnabled: noop,
          setStart: noop,
          setEnd: noop,
          onToggle: noop,
          onReset: noop,
        },
      },
      multiples: {
        isEnabled: false,
        prime: 2,
        handlers: {
          setEnabled: noop,
          setPrime: noop,
          onToggle: noop,
          onReset: noop,
        },
      },
      minimap: {
        isVisible: false,
        handlers: {
          setVisible: noop,
        },
      },
    },
    detailInspector: {
      isOpen: false,
      mode: 'timings',
      query: '',
      rows: [],
      filteredRows: [],
      handlers: {
        open: noop,
        setOpen: noop,
        setQuery: noop,
      },
    },
    data: {
      steps: [],
      currentStep: 0,
      currentStepData: null,
      stepStats: null,
      storageModel: 'half',
      wheelDefinition: null,
      layoutSettings: {
        outlines: {},
      },
      benchmarkTimingData: null,
      benchmarkTimingFileName: '',
      sourceRef: null,
      currentStepSourceLine: null,
    },
    navigation: {
      revealStepRequest: 0,
      revealCurrentStepInPanel: noop,
      onOpenRawLog: noop,
      onImportBenchmarkTiming: noop,
      autoFitColumnCount: 0,
    },
    debug: {
      isToolsOpen: false,
      theme: 'dark',
      isGlUnavailable: false,
      glDebugInfo: null,
      debugLayerMode: 'off',
      debugGlOffsetX: 0,
      debugGlOffsetY: 0,
      debugGlAutoOffsetY: false,
      isDebugCalibrationMode: false,
      handlers: {
        setDebugLayerMode: noop,
        setDebugGlOffsetX: noop,
        setDebugGlOffsetY: noop,
        setIsDebugCalibrationMode: noop,
        applySnapshot: noop,
        forceGlRedraw: noop,
      },
    },
  };

  return {
    ...base,
    ...overrides,
    panels: {
      ...base.panels,
      ...(overrides.panels || {}),
      settings: {
        ...base.panels.settings,
        ...((overrides.panels && overrides.panels.settings) || {}),
      },
    },
    debug: {
      ...base.debug,
      ...(overrides.debug || {}),
    },
  };
}

describe('VisualizerMainContent console integrity', () => {
  it('renders without throwing and without console errors', () => {
    renderToString(React.createElement(VisualizerMainContent, buildProps()));
  });

  it('renders debug panel branch without throwing', () => {
    renderToString(
      React.createElement(
        VisualizerMainContent,
        buildProps({
          panels: {
            settings: { isCollapsed: true },
          },
          debug: {
            isToolsOpen: true,
            theme: 'light',
          },
        }),
      ),
    );
  });
});
