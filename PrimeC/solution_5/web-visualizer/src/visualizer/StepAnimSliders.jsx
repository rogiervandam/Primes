import React from 'react';
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
  exporting,
  eventDurationMode,
  setEventDurationMode,
  computeEventDuration,
  playSpeedPercent,
  setPlaySpeedPercent,
}) {
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
            title={(stepAnimRunning || singleEventLoopActive) ? 'Pause the timeline animation' : 'Play the timeline animation at the current Speed'}
            disabled={timelineDisabled}
          >
            {(stepAnimRunning || singleEventLoopActive) ? <Pause size={14} /> : <Play size={14} />}
          </button>
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
        <span className="step-focus-slider-value">{stepScrubProgress}%</span>
      </div>

      <div className="step-focus-slider-row step-focus-mode-row" title="How long the timeline takes 0..100% for an event. Progressive: 2s per populated tier (first 10 bits, next 100 bits, the rest) — caps at 6s. Linear: total time scales with the bit count.">
        <span className="step-focus-slider-label">Target</span>
        <div className="step-focus-mode-toggle">
          <button
            type="button"
            className={`step-focus-mode-btn${eventDurationMode === 'progressive' ? ' active' : ''}`}
            onClick={(e) => { e.stopPropagation(); setEventDurationMode('progressive'); }}
            onMouseDown={(e) => e.stopPropagation()}
            title="Tiered: 2s for the first 10 bits, 2s for the next 100, 2s for the rest (max ~6s)"
          >Progressive</button>
          <button
            type="button"
            className={`step-focus-mode-btn${eventDurationMode === 'linear' ? ' active' : ''}`}
            onClick={(e) => { e.stopPropagation(); setEventDurationMode('linear'); }}
            onMouseDown={(e) => e.stopPropagation()}
            title="Linear: total duration scales with the bit count (matches the speed slider exactly)"
          >Linear</button>
        </div>
        <span className="step-focus-slider-value step-focus-mode-value" title="Target time the timeline takes from 0% to 100% for the current event with the active mode and speed">
          {(() => {
            const c = currentStepData?.changedBits?.length || 0;
            const d = computeEventDuration(c);
            const formatted = d >= 1000 ? `${(d / 1000).toFixed(1)}s` : `${Math.round(d)}ms`;
            return `${formatted} · ${c} bit${c === 1 ? '' : 's'}`;
          })()}
        </span>
      </div>

      <label className="step-focus-slider-row" title="Playback speed as a percentage of the per-event normal time target. 50% takes twice as long, 200% takes half as long. Affects bit reveal AND mask stamps in lockstep.">
        <span className="step-focus-slider-label">Speed</span>
        {/* Slider is a percentage of the per-event "normal" time target.
            Range 25%..400%, log-mapped so each tick is the same multiplicative
            jump and 100% sits comfortably inside the slider. The same value
            scales the per-bit reveal AND the mask stamp animation. */}
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={(() => {
            const pct = Math.max(25, Math.min(400, Number(playSpeedPercent) || 100));
            const ratio = Math.log(pct / 25) / Math.log(400 / 25);
            return Math.round(Math.max(0, Math.min(1, ratio)) * 100);
          })()}
          onChange={(e) => {
            const v = Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0));
            const pct = 25 * Math.pow(400 / 25, v / 100);
            setPlaySpeedPercent(Math.max(25, Math.min(400, Math.round(pct))));
          }}
          onMouseDown={(e) => e.stopPropagation()}
          disabled={exporting}
        />
        <span className="step-focus-slider-value" title={`${playSpeedPercent}% of normal speed`}>{playSpeedPercent}%</span>
      </label>
    </>
  );
}

export default StepAnimSliders;
