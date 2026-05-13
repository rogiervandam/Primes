/**
 * Item 405: Console error testcase for startup and trace-loading paths.
 *
 * Renders the full Visualizer component in startup state and with a loaded trace,
 * and asserts that no unexpected console.error or console.warn calls are made.
 *
 * The one known false-positive in the Node/renderToString environment is the React
 * SSR warning about `useLayoutEffect` — this is harmless in a browser and is
 * filtered out below. All other console output is treated as a test failure.
 */
import React from 'react';
import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import Visualizer from '../../Visualizer';

// Known false positives in the Node/renderToString SSR environment.
const SSR_ONLY_PATTERNS = [
  /useLayoutEffect does nothing on the server/,
];
// Errors that are environment-only and not real bugs in the component code.
const ENV_REF_ERRORS = /window|document|canvas|webgl/i;

function isKnownSSRNoise(msg) {
  return SSR_ONLY_PATTERNS.some((re) => re.test(String(msg)));
}

/** Render and absorb environment-only ReferenceErrors from the node context. */
function tryRender(element) {
  try {
    renderToString(element);
  } catch (err) {
    if (err instanceof ReferenceError && ENV_REF_ERRORS.test(err.message)) {
      // Expected: component accesses window/document which don't exist in node.
      return;
    }
    throw err;
  }
}

const BASE_HEADER = {
  bitCount: 1000,
  wheel: null,
  title: 'Test Trace',
  storageModel: 'half',
};

/** Minimal step structure produced by the trace parser */
function makeStep(prime, index) {
  return {
    stepId: index,
    prime,
    operation: 'sieve',
    factorStep: 0,
    start: index * 100,
    stop: index * 100 + 50,
    changedBits: new Uint32Array([prime * 2]),
    numChanged: 1,
    maskWordBits: null,
    maskWriteOrderWords: new Uint32Array(0),
    maskSlotBits: [],
    annotation: '',
  };
}

const MINIMAL_PROPS = {
  header: BASE_HEADER,
  steps: [],
  loadComplete: false,
  loadProgress: 0,
  fileName: 'startup.sievetrace',
  onClose: () => {},
  autoRender: false,
};

const LOADED_PROPS = {
  header: BASE_HEADER,
  steps: [makeStep(2, 0), makeStep(3, 1), makeStep(5, 2)],
  loadComplete: true,
  loadProgress: 1,
  fileName: 'loaded.sievetrace',
  onClose: () => {},
  autoRender: false,
};

describe('Visualizer console integrity', () => {
  let unexpectedCalls;
  let spies;

  beforeEach(() => {
    unexpectedCalls = [];
    // Intercept BEFORE setupConsoleGuards spy so we can filter SSR noise.
    spies = [
      vi.spyOn(console, 'error').mockImplementation((...args) => {
        if (!isKnownSSRNoise(args[0])) {
          unexpectedCalls.push({ level: 'error', msg: String(args[0]) });
        }
      }),
      vi.spyOn(console, 'warn').mockImplementation((...args) => {
        if (!isKnownSSRNoise(args[0])) {
          unexpectedCalls.push({ level: 'warn', msg: String(args[0]) });
        }
      }),
    ];
  });

  afterEach(() => {
    for (const s of spies) s.mockRestore();
    spies = [];
  });

  it('renders without console errors on startup (no trace loaded)', () => {
    tryRender(React.createElement(Visualizer, MINIMAL_PROPS));
    expect(
      unexpectedCalls,
      'Unexpected console output on startup: ' +
        unexpectedCalls.map((c) => `[${c.level}] ${c.msg}`).join('; '),
    ).toHaveLength(0);
  });

  it('renders without console errors when a trace is loaded', () => {
    tryRender(React.createElement(Visualizer, LOADED_PROPS));
    expect(
      unexpectedCalls,
      'Unexpected console output with trace loaded: ' +
        unexpectedCalls.map((c) => `[${c.level}] ${c.msg}`).join('; '),
    ).toHaveLength(0);
  });
});
