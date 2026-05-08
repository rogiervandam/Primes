import React from 'react';
import {
  SkipBack, StepBack, Play, Pause, StepForward, SkipForward, Minus, Plus,
} from '../Icons';
import { usePlaybackContext } from '../contexts/PlaybackContext';

function defaultPlayTitle(playing, currentStep, stepCount, variant) {
  if (variant === 'compact') {
    return playing ? 'Pause playback' : 'Play all events';
  }
  return playing
    ? 'Pause playback'
    : (currentStep >= Math.max(0, stepCount - 1) ? 'Restart trace and play' : 'Play trace from current event');
}

/**
 * Shared playback transport used by the toolbar and joined events widget.
 */
export default function PlaybackTransport({
  variant = 'toolbar',
  onNavigate,
}) {
  const {
    steps,
    currentStep,
    goToStep,
    playing,
    handlePlayPause,
    exporting,
    setPlaySpeedPercent,
    isScrubbingTopRef,
    playSpeedPercent,
  } = usePlaybackContext();

  const isCompact = variant === 'compact';
  const buttonClassName = isCompact ? 'spt-btn' : 'btn-icon';
  const speedButtonClassName = isCompact ? 'spt-btn spt-speed' : 'btn-icon anim-speed-btn';
  const sliderClassName = isCompact ? 'spt-slider' : 'step-slider';
  const stepCount = steps.length;
  const currentLabel = `${currentStep} / ${Math.max(0, stepCount - 1)}`;
  const compactIconSize = 12;
  const speedIconSize = isCompact ? 11 : 14;

  const navigateTo = (index) => {
    goToStep(index);
    onNavigate?.();
  };

  const handleSliderChange = (event) => {
    navigateTo(parseInt(event.target.value, 10));
  };

  const sliderProps = {
    type: 'range',
    className: sliderClassName,
    min: 0,
    max: Math.max(0, stepCount - 1),
    value: currentStep,
    onChange: handleSliderChange,
    onPointerDown: () => { if (isScrubbingTopRef) isScrubbingTopRef.current = true; },
    onPointerUp: () => { if (isScrubbingTopRef) isScrubbingTopRef.current = false; },
    onPointerCancel: () => { if (isScrubbingTopRef) isScrubbingTopRef.current = false; },
    onMouseLeave: (event) => { if (event.buttons === 0 && isScrubbingTopRef) isScrubbingTopRef.current = false; },
    disabled: exporting,
  };

  if (isCompact) {
    return (
      <div className="events-panel-transport joined-transport" onMouseDown={(event) => event.stopPropagation()}>
        <div className="spt-row spt-row-nav">
          <button className={buttonClassName} onClick={() => navigateTo(0)} title="First event" disabled={exporting}><SkipBack size={compactIconSize} /></button>
          <button className={buttonClassName} onClick={() => navigateTo(currentStep - 1)} title="Previous event" disabled={exporting}><StepBack size={compactIconSize} /></button>
          <button className={speedButtonClassName} onClick={() => setPlaySpeedPercent((value) => Math.max(25, Math.round(value / 1.25)))} title="Slower" disabled={exporting}><Minus size={speedIconSize} /></button>
          <button
            className="spt-btn spt-play"
            onClick={handlePlayPause}
            title={defaultPlayTitle(playing, currentStep, stepCount, variant)}
            disabled={exporting || !stepCount}
          >
            {playing ? <Pause size={compactIconSize} /> : <Play size={compactIconSize} />}
          </button>
          <button className={speedButtonClassName} onClick={() => setPlaySpeedPercent((value) => Math.min(1600, Math.round(value * 1.25)))} title="Faster" disabled={exporting}><Plus size={speedIconSize} /></button>
          <button className={buttonClassName} onClick={() => navigateTo(currentStep + 1)} title="Next event" disabled={exporting}><StepForward size={compactIconSize} /></button>
          <button className={buttonClassName} onClick={() => navigateTo(stepCount - 1)} title="Last event" disabled={exporting}><SkipForward size={compactIconSize} /></button>
          <span className="spt-speed-label" title={`Playback speed: ${playSpeedPercent}% of normal`}>{playSpeedPercent}%</span>
        </div>
        <div className="spt-row spt-row-timeline">
          <input
            {...sliderProps}
            title={`Event ${currentStep} of ${Math.max(0, stepCount - 1)}`}
          />
          <span className="spt-counter">
            {currentStep}<span className="spt-total">/{Math.max(0, stepCount - 1)}</span>
          </span>
        </div>
      </div>
    );
  }

  return (
    <>
      <button className={buttonClassName} onClick={() => navigateTo(0)} title="First (Home)" disabled={exporting}><SkipBack /></button>
      <button className={buttonClassName} onClick={() => navigateTo(currentStep - 1)} title="Previous (←)" disabled={exporting}><StepBack /></button>
      <button className={speedButtonClassName} onClick={() => setPlaySpeedPercent((value) => Math.max(25, Math.round(value / 1.25)))} title="Slower animation" disabled={exporting}><Minus size={speedIconSize} /></button>
      <button
        className={buttonClassName}
        onClick={handlePlayPause}
        title={defaultPlayTitle(playing, currentStep, stepCount, variant)}
        disabled={exporting || stepCount === 0}
      >
        {playing ? <Pause /> : <Play />}
      </button>
      <button className={speedButtonClassName} onClick={() => setPlaySpeedPercent((value) => Math.min(1600, Math.round(value * 1.25)))} title="Faster animation" disabled={exporting}><Plus size={speedIconSize} /></button>
      <button className={buttonClassName} onClick={() => navigateTo(currentStep + 1)} title="Next (→)" disabled={exporting}><StepForward /></button>
      <button className={buttonClassName} onClick={() => navigateTo(stepCount - 1)} title="Last (End)" disabled={exporting}><SkipForward /></button>
      <input {...sliderProps} />
      <span className="step-counter">{currentLabel}</span>
    </>
  );
}