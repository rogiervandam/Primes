import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause } from '../Icons';

/**
 * The "step animation sliders" cluster shown both inside the floating
 * `EventTitleBanner` and inside the `DetailPanel` footer.
 *
 * Pure presentation: every value/callback is supplied by the parent.
 * Renders the Mode toggle (Mask / Bits / Both — only when the current
 * step has mask write-order metadata), the Timeline scrubber + play
 * toggle, the Target mode selector (Progressive / Linear) with its
 * computed duration label, and the Speed slider (log-scale, 25..400 %).
 */
function StepAnimSliders({
  currentStepData,
  bitAnimationMode,
  setBitAnimationMode,
  bitAnimationModeRef,
  stopSeqAnim,
  seekStepAnimation,
  stepScrubProgress,
  setStepScrubProgress,
  handleStepAnimToggle,
  stepAnimRunning,
  singleEventLoopActive,
  animationReplayPaused,
  delayPhaseMs,
  playing,
  exporting,
}) {
  // Wipe overlay: 0..100, animates forward over delayPhaseMs when in delay
  // phase, reverses smoothly when the delay is cancelled/scrubbed.
  const wipePositionRef = useRef(0);
  const [wipePosition, setWipePosition] = useState(0);
  const wipeAnimRef = useRef(null);

  useEffect(() => {
    if (wipeAnimRef.current) {
      cancelAnimationFrame(wipeAnimRef.current);
      wipeAnimRef.current = null;
    }

    if (delayPhaseMs && delayPhaseMs > 0) {
      if (animationReplayPaused) {
        // Delay is paused-in-flight: freeze the wipe at its current position.
        return;
      }
      // Animate wipe forward from the current position to 100%.
      const startPos = wipePositionRef.current;
      const remainingFraction = 1 - (startPos / 100);
      const remainingMs = delayPhaseMs * remainingFraction;
      if (remainingMs <= 0) {
        wipePositionRef.current = 100;
        setWipePosition(100);
        return;
      }
      const startTime = performance.now();
      const animate = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / remainingMs);
        const pos = startPos + (100 - startPos) * progress;
        wipePositionRef.current = pos;
        setWipePosition(pos);
        if (progress < 1) {
          wipeAnimRef.current = requestAnimationFrame(animate);
        } else {
          wipePositionRef.current = 100;
          setWipePosition(100);
          wipeAnimRef.current = null;
        }
      };
      wipeAnimRef.current = requestAnimationFrame(animate);
    } else {
      // Not in delay phase: animate wipe back to 0 (fade back in).
      const startPos = wipePositionRef.current;
      if (startPos <= 0.5) {
        if (startPos > 0) { wipePositionRef.current = 0; setWipePosition(0); }
        return;
      }
      const startTime = performance.now();
      const reverseDuration = Math.min(220, startPos * 2.2);
      const animate = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / Math.max(1, reverseDuration));
        const pos = startPos * (1 - progress);
        wipePositionRef.current = pos;
        setWipePosition(pos);
        if (progress < 1) {
          wipeAnimRef.current = requestAnimationFrame(animate);
        } else {
          wipePositionRef.current = 0;
          setWipePosition(0);
          wipeAnimRef.current = null;
        }
      };
      wipeAnimRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (wipeAnimRef.current) {
        cancelAnimationFrame(wipeAnimRef.current);
        wipeAnimRef.current = null;
      }
    };
  }, [delayPhaseMs, animationReplayPaused]);
  const hasMaskOrder = !!(
    currentStepData
    && currentStepData.maskWriteOrderWords
    && currentStepData.maskWriteOrderWords.length > 0
  );

  const timelineDisabled = exporting || !currentStepData || (
    (!currentStepData.changedBits || currentStepData.changedBits.length === 0)
    && (bitAnimationMode !== 'mask' || !hasMaskOrder)
  );

  const setMode = (mode) => (e) => {
    e.stopPropagation();
    stopSeqAnim();
    setBitAnimationMode(mode);
    bitAnimationModeRef.current = mode;
    seekStepAnimation(stepScrubProgress / 100);
  };

  return (
    <>
      {/* Mode toggle: switch between mask-stamp animation and per-bit
          sequential reveal. Defaults to 'mask' on entering an event
          that has mask metadata; toggling to 'bit' walks the bits
          individually. */}
      {hasMaskOrder && (
        <div className="step-focus-slider-row step-focus-mode-row" title="Choose how the timeline scrubs this event">
          <span className="step-focus-slider-label">Mode</span>
          <div className="step-focus-mode-toggle">
            <button
              type="button"
              className={`step-focus-mode-btn${bitAnimationMode === 'mask' ? ' active' : ''}`}
              onClick={setMode('mask')}
              onMouseDown={(e) => e.stopPropagation()}
              title="Animate only the apply-mask group stamps"
            >Mask</button>
            <button
              type="button"
              className={`step-focus-mode-btn${bitAnimationMode === 'bit' ? ' active' : ''}`}
              onClick={setMode('bit')}
              onMouseDown={(e) => e.stopPropagation()}
              title="Animate only the bits being set one by one"
            >Bits</button>
            <button
              type="button"
              className={`step-focus-mode-btn${bitAnimationMode === 'combined' ? ' active' : ''}`}
              onClick={setMode('combined')}
              onMouseDown={(e) => e.stopPropagation()}
              title="Animate both the mask stamps and the bits revealing in lockstep"
            >Both</button>
          </div>
          <span className="step-focus-slider-value step-focus-mode-value">{bitAnimationMode}</span>
        </div>
      )}

      <div className="step-focus-slider-row" title="Scrub through this event's animation">
        <span className="step-focus-slider-label">Timeline</span>
        <div className="step-focus-slider-controls">
          <button
            type="button"
            className="step-focus-play-btn"
            onClick={(e) => { e.stopPropagation(); handleStepAnimToggle(); }}
            onMouseDown={(e) => e.stopPropagation()}
            title={(playing || stepAnimRunning || singleEventLoopActive) && !animationReplayPaused ? 'Pause the timeline animation' : 'Play the timeline animation at the current Speed'}
            disabled={timelineDisabled}
          >
            {(playing || stepAnimRunning || singleEventLoopActive) && !animationReplayPaused ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <div className="step-focus-timeline-wrap">
            <div className="step-focus-timeline-track" aria-hidden="true">
              <div className="step-focus-timeline-fill" style={{ width: `${stepScrubProgress}%` }} />
              <div className="step-focus-timeline-wipe" style={{ width: `${wipePosition}%` }} />
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={stepScrubProgress}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                setStepScrubProgress(v);
                seekStepAnimation(v / 100);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              disabled={timelineDisabled}
            />
          </div>
        </div>
        <span className="step-focus-slider-value">{stepScrubProgress}%</span>
      </div>


    </>
  );
}

export default StepAnimSliders;
