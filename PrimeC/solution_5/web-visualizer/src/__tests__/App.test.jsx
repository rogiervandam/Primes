import React from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

let mockTraceParserState;

vi.mock('../workers/useTraceParser', () => ({
  useTraceParser: () => mockTraceParserState,
}));

import App from '../App';

function buildParserState(overrides = {}) {
  return {
    header: null,
    steps: [],
    progress: 0,
    isComplete: false,
    parseError: '',
    startParse: vi.fn(),
    abort: vi.fn(),
    reset: vi.fn(),
    ...overrides,
  };
}

function renderAppWithSearch(search) {
  const originalWindow = global.window;
  global.window = {
    location: {
      search,
    },
  };

  try {
    return renderToString(<App />);
  } finally {
    global.window = originalWindow;
  }
}

afterEach(() => {
  mockTraceParserState = buildParserState();
});

describe('App startup bootstrap', () => {
  it('skips the welcome loader while bootstrapping a trace from the URL', () => {
    mockTraceParserState = buildParserState();

    const rendered = renderAppWithSearch('?file=startup.sievetrace');

    expect(rendered).not.toContain('Loading trace file');
    expect(rendered).not.toContain('Sieve Visualizer');
  });

  it('still shows the normal welcome screen without a URL trace', () => {
    mockTraceParserState = buildParserState();

    const rendered = renderAppWithSearch('');

    expect(rendered).toContain('Sieve Visualizer');
    expect(rendered).toContain('Quick visualize');
  });
});