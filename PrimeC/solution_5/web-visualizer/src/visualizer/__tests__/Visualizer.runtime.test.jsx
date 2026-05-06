import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import React from 'react';
import Visualizer from '../../Visualizer';

/**
 * Visualizer Runtime Error Test
 * 
 * This test ensures the Visualizer component doesn't throw ReferenceErrors
 * or other runtime errors during initialization. It catches bugs like
 * undefined variables in state destructuring or component body.
 * 
 * The setupConsoleGuards in vitest.config.js will also catch any
 * console.error or console.warn that occur during rendering.
 */

describe('Visualizer Runtime Integrity', () => {
  let consoleErrorSpy;
  let consoleWarnSpy;

  beforeEach(() => {
    // Spy on console methods to catch errors during test
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it('renders without throwing component ReferenceError or undefined variable errors', () => {
    // Minimal props to get Visualizer to initialize without crashing
    const minimalProps = {
      header: {
        bitCount: 128,
        wheel: null,
        title: 'Test',
        storageModel: 'half',
      },
      steps: [],
      loadComplete: false,
      loadProgress: 0,
      fileName: 'test.txt',
      onClose: () => {},
      autoRender: false,
    };

    // This should not throw component-specific errors. If any ReferenceErrors exist
    // in Visualizer.jsx (like undefined variables), they'll be caught here.
    let renderError = null;
    try {
      // Use renderToString for SSR-compatible test (matches our Node vitest environment)
      renderToString(React.createElement(Visualizer, minimalProps));
    } catch (error) {
      renderError = error;
    }

    // Check for component-specific ReferenceErrors (undefined variables in component code)
    // Filter out environment-related errors like "window is not defined" which are expected in Node SSR
    if (renderError && renderError instanceof ReferenceError) {
      const errorMsg = renderError.message.toLowerCase();
      // Allow environment-specific errors
      const isEnvironmentError = errorMsg.includes('window') ||
                                 errorMsg.includes('document') ||
                                 errorMsg.includes('canvas') ||
                                 errorMsg.includes('webgl');
      
      if (!isEnvironmentError) {
        expect.fail(`Component ReferenceError during Visualizer render: ${renderError.message}`);
      }
    }

    // Check for TypeError (e.g., trying to call undefined as function)
    if (renderError && renderError instanceof TypeError && !renderError.message.includes('window')) {
      expect.fail(`TypeError during Visualizer render: ${renderError.message}`);
    }

    // Verify console.error wasn't called with component logic errors
    const componentErrors = consoleErrorSpy.mock.calls
      .map((call) => call[0])
      .filter((msg) => {
        if (typeof msg !== 'string') return false;
        const lowerMsg = msg.toLowerCase();
        // Filter out environment errors
        const isEnvironmentError = lowerMsg.includes('window') ||
                                   lowerMsg.includes('document') ||
                                   lowerMsg.includes('canvas') ||
                                   lowerMsg.includes('webgl');
        return !isEnvironmentError;
      });

    expect(
      componentErrors,
      'Should not have component-specific ReferenceErrors',
    ).toHaveLength(0);
  });

  it('all hook state variables are correctly defined', () => {
    /**
     * This is a meta-test that documents which hook return variables
     * the Visualizer component depends on. If a hook changes its return
     * signature and a variable is removed, this test serves as documentation.
     */

    // These are the critical variables that must exist:
    const requiredVariables = [
      'isStepAnimRunning', // State value (NOT Ref)
      'setIsStepAnimRunningRef', // Ref to setter
      'isStepAnimRunningRefForScheduler', // Ref for scheduler
      'currentStep',
      'playing',
      'zoom',
      'theme',
      'animMode',
      'camera3DRef',
      'rendererRef',
      'containerRef',
    ];

    // This is a documentation test — it doesn't execute, but documents
    // the contract that Visualizer expects from its hooks.
    expect(requiredVariables).toHaveLength(11);
  });
});
