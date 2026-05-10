import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Repeat, Settings, StepBack, StepForward } from '../Icons';

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
  isStepAnimRunning,
  isSingleEventLoopActive,
  isAnimationReplayPaused,
  delayPhaseMs,
  playing,
  exporting,
  onOpenAnimationSettings,
  isSingleEventRepeatEnabled = true,
  onToggleSingleEventRepeat,
  onTriggerAnimation,
  // In docked mode, parent can treat label-drag as undock gesture.
  onDragOutFromDock,
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
      if (isAnimationReplayPaused) {
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
  }, [delayPhaseMs, isAnimationReplayPaused]);

  // Long-press scrub controls (item 96)
  const longPressRef = useRef(null);
  const [showScrubPanel, setShowScrubPanel] = useState(false);
  const [scrubStepSize, setScrubStepSize] = useState(1); // percent per frame-step

  // Hold-down repeat for < / > buttons (item 108)
  const holdTimerRef = useRef(null);
  const holdIntervalRef = useRef(null);
  const clearHoldTimers = () => {
    if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
    if (holdIntervalRef.current) { clearInterval(holdIntervalRef.current); holdIntervalRef.current = null; }
  };
  useEffect(() => clearHoldTimers, []);

  // Fine-scrub slider: ±10% window around the captured center (item 108).
  // Center is captured on mouse-down so the window stays fixed while dragging.
  const fineCenterRef = useRef(0);

  const handlePlayMouseDown = (e) => {
    e.stopPropagation();
    longPressRef.current = setTimeout(() => {
      longPressRef.current = null;
      setShowScrubPanel((prev) => !prev);
    }, 600);
  };
  const handlePlayMouseUp = (e) => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
      handleStepAnimToggle();
    }
  };
  const handlePlayMouseLeave = () => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  };
  useEffect(() => () => {
    if (longPressRef.current) clearTimeout(longPressRef.current);
  }, []);

  const STEP_SIZES = [0.1, 0.5, 1, 5, 10];
  const stepSizeDown = () => {
    setScrubStepSize((prev) => {
      const idx = STEP_SIZES.indexOf(prev);
      return idx > 0 ? STEP_SIZES[idx - 1] : prev;
    });
  };
  const stepSizeUp = () => {
    setScrubStepSize((prev) => {
      const idx = STEP_SIZES.indexOf(prev);
      return idx < STEP_SIZES.length - 1 ? STEP_SIZES[idx + 1] : prev;
    });
  };

  // stepScrubProgress is a state value; use a ref for the hold-repeat callbacks.
  const stepScrubProgressRef2 = useRef(stepScrubProgress);
  stepScrubProgressRef2.current = stepScrubProgress;

  const stepFrameBack = () => {
    const next = Math.max(0, stepScrubProgressRef2.current - scrubStepSize);
    setStepScrubProgress(next);
    seekStepAnimation(next / 100);
  };
  const stepFrameForward = () => {
    const next = Math.min(100, stepScrubProgressRef2.current + scrubStepSize);
    setStepScrubProgress(next);
    seekStepAnimation(next / 100);
  };

  // Hold-down handlers for < / > buttons (item 108)
  const handleScrubBtnDown = (fn) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    fn();
    holdTimerRef.current = setTimeout(() => {
      holdTimerRef.current = null;
      holdIntervalRef.current = setInterval(fn, 80);
    }, 400);
  };
  const handleScrubBtnUp = (e) => { e.stopPropagation(); clearHoldTimers(); };

  // Fine-slider helpers (item 108): ±10% window centered when pressed
  const getFineSliderValue = () => {
    const center = fineCenterRef.current;
    const fineMin = Math.max(0, center - 10);
    const fineMax = Math.min(100, center + 10);
    const range = fineMax - fineMin;
    if (range <= 0) return 500;
    return Math.round(((stepScrubProgress - fineMin) / range) * 1000);
  };
  const handleFineSliderDown = (e) => {
    e.stopPropagation();
    fineCenterRef.current = stepScrubProgress;
  };
  const handleFineSliderChange = (e) => {
    const v = parseInt(e.target.value, 10);
    const center = fineCenterRef.current;
    const fineMin = Math.max(0, center - 10);
    const fineMax = Math.min(100, center + 10);
    const next = Math.max(0, Math.min(100, fineMin + (v / 1000) * (fineMax - fineMin)));
    setStepScrubProgress(next);
    seekStepAnimation(next / 100);
  };

  const hasMaskOrder = !!(
    currentStepData
    && currentStepData.maskWriteOrderWords
    && currentStepData.maskWriteOrderWords.length > 0
  );

  const timelineDisabled = exporting || !currentStepData || (
    (!currentStepData.changedBits || currentStepData.changedBits.length === 0)
    && !hasMaskOrder
  );

  return (
    <>
      <div className={`step-focus-slider-row${docked ? ' step-focus-slider-row--docked' : ''}`} title="Scrub through this event's animation">
        <span
          className={`step-focus-slider-label${docked && onDragOutFromDock ? ' step-focus-slider-label--draggable' : ''}`}
          onMouseDown={docked && onDragOutFromDock ? (e) => {
            e.stopPropagation();
            onDragOutFromDock({ x: e.clientX, y: e.clientY });
          } : undefined}
          title={docked && onDragOutFromDock ? 'Drag out to undock single-event widget' : undefined}
        >Animation</span>
        <div className="step-focus-slider-controls">
          <button
            type="button"
            className={`step-focus-play-btn${showScrubPanel ? ' scrub-active' : ''}`}
            onMouseDown={handlePlayMouseDown}
            onMouseUp={handlePlayMouseUp}
            onMouseLeave={handlePlayMouseLeave}
            onClick={(e) => e.stopPropagation()}
            title={(playing || isStepAnimRunning || isSingleEventLoopActive) && !isAnimationReplayPaused ? 'Pause the timeline animation (long-press for scrub controls)' : 'Play the timeline animation (long-press for scrub controls)'}
          >
            {(playing || isStepAnimRunning || isSingleEventLoopActive) && !isAnimationReplayPaused ? <Pause size={16} /> : <Play size={16} />}
          </button>
          {onToggleSingleEventRepeat && (
            <button
              type="button"
              className={`step-focus-repeat-btn${isSingleEventRepeatEnabled ? ' active' : ''}`}
              onClick={(e) => { e.stopPropagation(); onToggleSingleEventRepeat(); }}
              onMouseDown={(e) => e.stopPropagation()}
              title={playing
                ? 'Repeat toggle is ignored while all-events playback is active'
                : (isSingleEventRepeatEnabled
                  ? 'Repeat single-event animation until disabled'
                  : 'Play single-event animation once')}
              disabled={playing}
            >
              <Repeat size={15} />
            </button>
          )}
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
              onPointerUp={() => {
                // item 228: replay animation in real time when user releases the scrubber
                if (!timelineDisabled && onTriggerAnimation) onTriggerAnimation();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              disabled={timelineDisabled}
            />
          </div>
          {docked && (
            <>
              <span className="step-focus-slider-value">{parseFloat(Number(stepScrubProgress).toFixed(2))}%</span>
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
            <span className="step-focus-slider-value">{parseFloat(Number(stepScrubProgress).toFixed(2))}%</span>
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
      {showScrubPanel && (
        <div className="step-focus-scrub-panel" onMouseDown={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="step-focus-scrub-btn"
            onMouseDown={handleScrubBtnDown(stepFrameBack)}
            onMouseUp={handleScrubBtnUp}
            onMouseLeave={handleScrubBtnUp}
            disabled={timelineDisabled}
            title={`Step back ${scrubStepSize}% (hold for continuous)`}
          >
            <StepBack size={14} />
          </button>
          <input
            type="range"
            className="step-focus-scrub-slider"
            min={0}
            max={1000}
            step={1}
            value={getFineSliderValue()}
            onMouseDown={handleFineSliderDown}
            onChange={handleFineSliderChange}
            disabled={timelineDisabled}
            title={`${stepScrubProgress.toFixed(1)}% — fine scrub (±10% window)`}
          />
          <button
            type="button"
            className="step-focus-scrub-btn"
            onMouseDown={handleScrubBtnDown(stepFrameForward)}
            onMouseUp={handleScrubBtnUp}
            onMouseLeave={handleScrubBtnUp}
            disabled={timelineDisabled}
            title={`Step forward ${scrubStepSize}% (hold for continuous)`}
          >
            <StepForward size={14} />
          </button>
          <span className="step-focus-scrub-step-label">{scrubStepSize}%</span>
          <button
            type="button"
            className="step-focus-scrub-btn step-focus-scrub-btn--speed"
            onClick={(e) => { e.stopPropagation(); stepSizeDown(); }}
            disabled={STEP_SIZES.indexOf(scrubStepSize) === 0}
            title="Decrease step size"
          >−</button>
          <button
            type="button"
            className="step-focus-scrub-btn step-focus-scrub-btn--speed"
            onClick={(e) => { e.stopPropagation(); stepSizeUp(); }}
            disabled={STEP_SIZES.indexOf(scrubStepSize) === STEP_SIZES.length - 1}
            title="Increase step size"
          >+</button>
        </div>
      )}


    </>
  );
}

export default StepAnimSliders;
