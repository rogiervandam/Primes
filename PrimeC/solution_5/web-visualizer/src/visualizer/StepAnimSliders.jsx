import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Settings } from '../Icons';

/**
 * The "step animation sliders" cluster shown both inside the floating
 * `EventTitleBanner` and inside the `DetailPanel` footer.
 *
 * Pure presentation: every value/callback is supplied by the parent.
 * Renders the Timeline scrubber + play toggle with a gear icon to open
 * animation settings. The Mode toggle (Mask/Bits/Both) has been moved
 * to the Animation tab in the settings panel.
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
  onOpenAnimationSettings,
  // When true, renders progress% and gear inline next to the slider (docked to detail panel)
  docked = false,
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

  return (
    <>
      <div className={`step-focus-slider-row${docked ? ' step-focus-slider-row--docked' : ''}`} title="Scrub through this event's animation">
        <span className="step-focus-slider-label">Timeline</span>
        <div className="step-focus-slider-controls">
          <button
            type="button"
            className="step-focus-play-btn"
            onClick={(e) => { e.stopPropagation(); handleStepAnimToggle(); }}
            onMouseDown={(e) => e.stopPropagation()}
            title={(playing || stepAnimRunning || singleEventLoopActive) && !animationReplayPaused ? 'Pause the timeline animation' : 'Play the timeline animation at the current Speed'}
          >
            {(playing || stepAnimRunning || singleEventLoopActive) && !animationReplayPaused ? <Pause size={16} /> : <Play size={16} />}
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
          {docked && (
            <>
              <span className="step-focus-slider-value">{stepScrubProgress}%</span>
              {onOpenAnimationSettings && (
                <button
                  type="button"
                  className="step-focus-gear-btn"
                  onClick={(e) => { e.stopPropagation(); onOpenAnimationSettings(); }}
                  onMouseDown={(e) => e.stopPropagation()}
                  title="Open animation settings"
                >
                  <Settings size={16} />
                </button>
              )}
            </>
          )}
        </div>
        {!docked && (
          <div className="step-focus-slider-actions">
            <span className="step-focus-slider-value">{stepScrubProgress}%</span>
            {onOpenAnimationSettings && (
              <button
                type="button"
                className="step-focus-gear-btn"
                onClick={(e) => { e.stopPropagation(); onOpenAnimationSettings(); }}
                onMouseDown={(e) => e.stopPropagation()}
                title="Open animation settings"
              >
                <Settings size={16} />
              </button>
            )}
          </div>
        )}
      </div>


    </>
  );
}

export default StepAnimSliders;
