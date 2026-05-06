import React, { createRef } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import Toolbar from '../Toolbar';
import { ThemeProvider } from '../../contexts/ThemeContext';
import { PanelLayoutProvider } from '../../contexts/PanelLayoutContext';

vi.mock('../TraceInfoPopover', () => ({
  default: () => null,
}));

vi.mock('../PlaybackTransport', () => ({
  default: () => <div data-testid="playback-transport" />,
}));

vi.mock('../ToolbarPanelToggles', () => ({
  default: () => <div data-testid="toolbar-panel-toggles" />,
}));

function renderToolbar(overrides = {}) {
  const toolbarProps = {
    isMacPlatform: true,
    isWindowsPlatform: false,
    isElectron: false,
    effectiveTitle: 'trace.sievetrace',
    isTraceInfoVisible: false,
    setIsTraceInfoVisible: vi.fn(),
    traceInfoToggleRef: createRef(),
    traceInfoPopoverRef: createRef(),
    storageModel: 'half',
    setStorageModel: vi.fn(),
    header: {},
    traceInfoSections: [],
    onFetchRawSource: vi.fn(async () => ''),
    lineToStep: {},
    onJumpToStep: vi.fn(),
    rawScrollToLine: null,
    onClearRawScrollToLine: vi.fn(),
    currentStepSourceLine: null,
    onClose: vi.fn(),
    isSearchOpen: false,
    setIsSearchOpen: vi.fn(),
    searchQuery: '',
    setSearchQuery: vi.fn(),
    searchResult: '',
    handleSearch: vi.fn(),
    zoom: 1,
    doZoom: vi.fn(),
    resetZoom: vi.fn(),
    isTiltActive: false,
    isTiltButtonEnabled: true,
    toggleTilt: vi.fn(),
    isHeatMapEnabled: false,
    setIsHeatMapEnabled: vi.fn(),
    isPrimeOverlayEnabled: false,
    setIsPrimeOverlayEnabled: vi.fn(),
    isDebugToolsOpen: false,
    setIsDebugToolsOpen: vi.fn(),
    exporting: false,
    exportPng: vi.fn(),
    exportVideo: vi.fn(),
    cancelExport: vi.fn(),
    exportProgress: 42,
    ...overrides,
  };

  const themeValue = {
    theme: 'dark',
    setTheme: vi.fn(),
  };

  const panelLayoutValue = {
    isSettingsCollapsed: false,
    toggleSettingsPanel: vi.fn(),
    areControlsHidden: false,
    isTimingPanelOpen: false,
    setIsTimingPanelOpen: vi.fn(),
  };

  return renderToString(
    <ThemeProvider value={themeValue}>
      <PanelLayoutProvider value={panelLayoutValue}>
        <Toolbar {...toolbarProps} />
      </PanelLayoutProvider>
    </ThemeProvider>
  );
}

describe('Toolbar', () => {
  it('renders the video export action when export is idle', () => {
    const rendered = renderToolbar();
    expect(rendered).toContain('Export Video (WebM)');
    expect(rendered).not.toContain('Cancel export');
  });

  it('renders the export cancel action when export is active', () => {
    const rendered = renderToolbar({ exporting: true, exportProgress: 67 });
    expect(rendered).toContain('Cancel export');
    expect(rendered).toMatch(/67(?:<!-- -->)?%/);
  });
});