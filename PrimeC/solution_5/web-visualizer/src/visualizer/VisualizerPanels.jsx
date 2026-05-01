import React from 'react';
import EventsPanel from '../EventsPanel';
import SettingsPanel from '../SettingsPanel';
import DebugToolsPanel from './DebugToolsPanel';

/**
 * VisualizerPanels — Phase 2 composition extraction from Visualizer.jsx.
 *
 * Renders the three side-panel children of .main-content:
 *   - EventsPanel  (left, position:absolute)
 *   - SettingsPanel (right, position:absolute)
 *   - DebugToolsPanel (floating, conditional)
 *
 * Props are passed as two grouped objects to keep the call site in
 * Visualizer.jsx compact:
 *   eventsProps   — all props forwarded directly to EventsPanel
 *   settingsProps — all props for SettingsPanel, plus internal-only values
 *                   (steps, currentStep, header, raw setters) used to build
 *                   the overlay-reset handlers that previously lived inline
 *                   in Visualizer.jsx's JSX.
 *
 * State and renderer authority remain in Visualizer.jsx.
 */
export default function VisualizerPanels({ eventsProps, settingsProps, debugToolsOpen, rendererRef, isMacPlatform }) {
  // Destructure internal-only values (consumed here, not forwarded to SettingsPanel).
  const {
    steps,
    currentStep,
    header,
    setRangeOverlayEnabled,
    setRangeOverlayStart,
    setRangeOverlayEnd,
    setMultiplesOverlayEnabled,
    setMultiplesOverlayPrime,
    // Everything else is a direct SettingsPanel prop.
    ...panelSettingsProps
  } = settingsProps;

  // These handlers were previously inline lambdas in Visualizer.jsx's JSX.
  // They seed range/multiples overlay defaults from the current step when the
  // overlay is first enabled or reset, then delegate to the Visualizer setters.

  function handleRangeOverlayToggle(enabled) {
    if (enabled && !panelSettingsProps.rangeOverlayEnabled) {
      const step = steps[currentStep];
      if (step) {
        const start = step.focusStart != null
          ? step.focusStart
          : (step.changedBits.length > 0 ? Math.min(...step.changedBits) : 0);
        const end = step.focusStop != null
          ? step.focusStop
          : (step.changedBits.length > 0 ? Math.max(...step.changedBits) : Math.max(0, header.bitCount - 1));
        setRangeOverlayStart(start);
        setRangeOverlayEnd(end);
      }
    }
    setRangeOverlayEnabled(enabled);
  }

  function handleRangeOverlayReset() {
    const step = steps[currentStep];
    if (step) {
      const start = step.focusStart != null
        ? step.focusStart
        : (step.changedBits.length > 0 ? Math.min(...step.changedBits) : 0);
      const end = step.focusStop != null
        ? step.focusStop
        : (step.changedBits.length > 0 ? Math.max(...step.changedBits) : Math.max(0, header.bitCount - 1));
      setRangeOverlayStart(start);
      setRangeOverlayEnd(end);
    }
  }

  function handleMultiplesOverlayToggle(enabled) {
    if (enabled && !panelSettingsProps.multiplesOverlayEnabled) {
      const step = steps[currentStep];
      if (step && step.prime != null && step.prime >= 2) {
        setMultiplesOverlayPrime(step.prime);
      }
    }
    setMultiplesOverlayEnabled(enabled);
  }

  function handleMultiplesOverlayReset() {
    const step = steps[currentStep];
    if (step && step.prime != null && step.prime >= 2) {
      setMultiplesOverlayPrime(step.prime);
    }
  }

  // onOutlineChange is a simple merge into the layout settings object.
  // panelSettingsProps.onChange is setLayoutSettings from Visualizer.jsx.
  function handleOutlineChange(outlines) {
    panelSettingsProps.onChange((prev) => ({ ...prev, outlines }));
  }

  return (
    <>
      <EventsPanel {...eventsProps} />
      <SettingsPanel
        {...panelSettingsProps}
        showAnimationControls={true}
        minimapControlVisible={true}
        onOutlineChange={handleOutlineChange}
        onRangeOverlayToggle={handleRangeOverlayToggle}
        onRangeOverlayReset={handleRangeOverlayReset}
        onMultiplesOverlayToggle={handleMultiplesOverlayToggle}
        onMultiplesOverlayReset={handleMultiplesOverlayReset}
      />
      {debugToolsOpen && (
        <DebugToolsPanel
          rendererRef={rendererRef}
          rightOffset={panelSettingsProps.collapsed ? 8 : (isMacPlatform ? 388 : 328)}
        />
      )}
    </>
  );
}
